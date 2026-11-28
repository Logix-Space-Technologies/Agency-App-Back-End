-- TRACK (read only): salespeople whose credit went below zero although credit was waived off.
-- Only temporary tables are made; nothing is changed.
--   mysql -u USER -p DATABASE < scripts/negative_waive_track.sql
-- (Works on MySQL 5.7+, 8 and MariaDB. The UNION lists are the numbers 0-499, to add up the lists saved in a settlement.)
DROP TEMPORARY TABLE IF EXISTS tmp_day, tmp_balance, tmp_waive, tmp_waive2, tmp_neg, tmp_cut;

-- Each settled mobile-app day: what was due to the office, received, paid later, left with shops, and waived off.
CREATE TEMPORARY TABLE tmp_day AS
SELECT d.settlement_id, d.staff_id,
       CAST(JSON_UNQUOTE(JSON_EXTRACT(d.details, '$.handover.net_payable')) AS DECIMAL(12,2)) - CAST(JSON_UNQUOTE(JSON_EXTRACT(d.details, '$.handover.received.total')) AS DECIMAL(12,2)) AS short_amt,
       COALESCE((SELECT SUM(CAST(JSON_UNQUOTE(JSON_EXTRACT(d.details, CONCAT('$.credit_payments[', n.i, '].total'))) AS DECIMAL(12,2)))
       FROM (SELECT a.d + 10 * b.d + 100 * c.d AS i FROM (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a,
             (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) b,
             (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4) c) n
       WHERE JSON_EXTRACT(d.details, CONCAT('$.credit_payments[', n.i, ']')) IS NOT NULL), 0) AS later_amt,
       COALESCE((SELECT SUM(CAST(JSON_UNQUOTE(JSON_EXTRACT(d.details, CONCAT('$.invoices[', n.i, '].credit'))) AS DECIMAL(12,2)))
       FROM (SELECT a.d + 10 * b.d + 100 * c.d AS i FROM (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a,
             (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) b,
             (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4) c) n
       WHERE JSON_EXTRACT(d.details, CONCAT('$.invoices[', n.i, ']')) IS NOT NULL), 0) AS shop_amt,
       COALESCE((SELECT SUM(w.amount) FROM app_waive_offs w WHERE w.settlement_id = d.settlement_id AND w.kind = 'cash_short' AND w.reversed = 0), 0) AS waived_amt
FROM app_day_settlements d
WHERE d.invoice_count > 0 AND d.details IS NOT NULL AND JSON_VALID(d.details)
  AND COALESCE(JSON_UNQUOTE(JSON_EXTRACT(d.details, '$.undone')), 'false') IN ('false', '0', 'null')
  AND JSON_EXTRACT(d.details, '$.handover.net_payable') IS NOT NULL
  AND JSON_EXTRACT(d.details, '$.handover.received.total') IS NOT NULL;

-- Each salesperson's total, the same as View Credit: app days plus marketing bills.
CREATE TEMPORARY TABLE tmp_balance (staff_id INT, amount DECIMAL(14,2));
INSERT INTO tmp_balance
SELECT staff_id,
       SUM(IF(short_amt > 0, GREATEST(0, short_amt - later_amt - waived_amt), short_amt)
           - GREATEST(0, GREATEST(0, later_amt + waived_amt - GREATEST(0, short_amt)) - shop_amt))
FROM tmp_day GROUP BY staff_id;
INSERT INTO tmp_balance
SELECT fs.UserId,
       SUM(fs.TotalAmount - (COALESCE(fs.FuelExpenses, 0) + COALESCE(fs.VehcileServiceExpenses, 0) + COALESCE(fs.OtherExpenses, 0)) - fs.AmountPaid)
FROM final_sale fs
JOIN (SELECT DISTINCT sale_tracking_Id FROM sales WHERE sale_type = 'marketing') s ON fs.sale_tracking_Id = s.sale_tracking_Id
WHERE fs.isActive = 1 GROUP BY fs.UserId;

-- Waive-offs of office credit that still count (shop credit is separate; undone days and deleted bills do not count).
CREATE TEMPORARY TABLE tmp_waive AS
SELECT w.waive_id, w.staff_id, w.kind, w.amount, w.settlement_id,
       IF(w.kind = 'cash_short', NULL,
          COALESCE(w.tracking, (SELECT JSON_UNQUOTE(JSON_EXTRACT(d.details, '$.undo.ds_tracking')) FROM app_day_settlements d WHERE d.settlement_id = w.settlement_id))) AS tracking
FROM app_waive_offs w
WHERE w.reversed = 0 AND w.kind <> 'shop_dues';
DELETE FROM tmp_waive WHERE kind = 'cash_short' AND settlement_id NOT IN (SELECT settlement_id FROM tmp_day);
DELETE FROM tmp_waive WHERE kind <> 'cash_short'
  AND NOT EXISTS (SELECT 1 FROM final_sale f WHERE f.isActive = 1 AND f.sale_tracking_Id = tmp_waive.tracking COLLATE utf8mb4_general_ci);

-- Below zero although something was waived off. The part of the waive-off that was never owed is `wrongly_waived`.
CREATE TEMPORARY TABLE tmp_neg AS
SELECT b.staff_id, b.balance, w.waived,
       LEAST(w.waived, -b.balance) AS wrongly_waived, b.balance + LEAST(w.waived, -b.balance) AS after_fix
FROM (SELECT staff_id, SUM(amount) AS balance FROM tmp_balance GROUP BY staff_id) b
JOIN (SELECT staff_id, SUM(amount) AS waived FROM tmp_waive GROUP BY staff_id) w ON w.staff_id = b.staff_id
WHERE b.balance < -0.004;

SELECT n.staff_id, u.name, n.balance AS credit_now, n.waived, n.wrongly_waived, n.after_fix AS credit_after_fix
FROM tmp_neg n LEFT JOIN users u ON u.user_id = n.staff_id ORDER BY n.balance;

-- Their waive-off records.
SELECT u.name, w.waive_id, w.batch_id, w.kind, w.amount, w.settlement_id, w.tracking, w.reason, w.created_at
FROM tmp_waive t
JOIN tmp_neg n ON n.staff_id = t.staff_id
JOIN app_waive_offs w ON w.waive_id = t.waive_id
LEFT JOIN users u ON u.user_id = w.staff_id
ORDER BY u.name, w.waive_id;

-- ONE salesperson in full (change the name here), also when the lists above are empty.
SET @look = '%GOKUL%KRISHNAN%';

SELECT u.name, u.user_id, (SELECT SUM(amount) FROM tmp_balance b WHERE b.staff_id = u.user_id) AS credit_now
FROM users u WHERE u.name LIKE @look;

-- App days. day_credit: above zero owes, below zero paid extra.
SELECT d.settlement_id, s.settle_date, d.short_amt, d.later_amt AS paid_later, d.waived_amt AS waived, d.shop_amt AS left_with_shops,
       IF(d.short_amt > 0, GREATEST(0, d.short_amt - d.later_amt - d.waived_amt), d.short_amt)
       - GREATEST(0, GREATEST(0, d.later_amt + d.waived_amt - GREATEST(0, d.short_amt)) - d.shop_amt) AS day_credit
FROM tmp_day d
JOIN app_day_settlements s ON s.settlement_id = d.settlement_id
JOIN users u ON u.user_id = d.staff_id
WHERE u.name LIKE @look ORDER BY s.settle_date;

-- Marketing bills that are not at zero.
SELECT f.invoiceNumber, f.DateofTransaction, f.TotalAmount, f.AmountPaid,
       f.TotalAmount - (COALESCE(f.FuelExpenses, 0) + COALESCE(f.VehcileServiceExpenses, 0) + COALESCE(f.OtherExpenses, 0)) - f.AmountPaid AS bill_credit
FROM final_sale f
JOIN (SELECT DISTINCT sale_tracking_Id FROM sales WHERE sale_type = 'marketing') m ON f.sale_tracking_Id = m.sale_tracking_Id
JOIN users u ON u.user_id = f.UserId
WHERE u.name LIKE @look AND f.isActive = 1
  AND ABS(f.TotalAmount - (COALESCE(f.FuelExpenses, 0) + COALESCE(f.VehcileServiceExpenses, 0) + COALESCE(f.OtherExpenses, 0)) - f.AmountPaid) > 0.004
ORDER BY f.DateofTransaction;

-- Every waive-off ever made for this salesperson, also shop credit and reversed ones.
SELECT w.waive_id, w.batch_id, w.kind, w.amount, w.settlement_id, w.tracking, w.reversed, w.reason, w.created_at
FROM app_waive_offs w JOIN users u ON u.user_id = w.staff_id WHERE u.name LIKE @look ORDER BY w.waive_id;
