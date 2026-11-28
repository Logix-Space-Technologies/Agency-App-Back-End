-- FIX: takes back only the part of a waive-off that was never owed, so the credit becomes ZERO.
-- (Money really paid extra stays as a minus figure.) Newest waive-off records are corrected first.
-- Changed rows are copied first to app_waive_offs_before_fix and final_sale_before_fix.
-- Take a database backup, run negative_waive_track.sql, then:
--   mysql -u USER -p DATABASE < scripts/negative_waive_fix.sql
-- It corrects only the salesperson named below. Set it to NULL to correct everyone the track script lists.
SET @only_name = '%GOKUL%KRISHNAN%';
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

DELETE FROM tmp_neg WHERE @only_name IS NOT NULL
  AND staff_id NOT IN (SELECT user_id FROM users WHERE name LIKE @only_name);

CREATE TEMPORARY TABLE tmp_waive2 AS SELECT waive_id, staff_id, amount FROM tmp_waive;
CREATE TEMPORARY TABLE tmp_cut AS
SELECT * FROM (
  SELECT t.waive_id, t.staff_id, t.kind, t.amount, t.tracking,
         LEAST(t.amount, GREATEST(0, n.wrongly_waived
           - COALESCE((SELECT SUM(x.amount) FROM tmp_waive2 x WHERE x.staff_id = t.staff_id AND x.waive_id > t.waive_id), 0))) AS cut
  FROM tmp_waive t JOIN tmp_neg n ON n.staff_id = t.staff_id
) c WHERE c.cut > 0.004;

CREATE TABLE IF NOT EXISTS app_waive_offs_before_fix LIKE app_waive_offs;
INSERT IGNORE INTO app_waive_offs_before_fix
SELECT w.* FROM app_waive_offs w JOIN tmp_cut c ON c.waive_id = w.waive_id;
CREATE TABLE IF NOT EXISTS final_sale_before_fix LIKE final_sale;
INSERT IGNORE INTO final_sale_before_fix
SELECT f.* FROM final_sale f JOIN tmp_cut c ON f.sale_tracking_Id = c.tracking COLLATE utf8mb4_general_ci;

START TRANSACTION;

-- A bill that showed the waived part as paid owes it again.
UPDATE final_sale f
JOIN (SELECT tracking, SUM(cut) AS cut FROM tmp_cut WHERE kind <> 'cash_short' GROUP BY tracking) c
  ON f.sale_tracking_Id = c.tracking COLLATE utf8mb4_general_ci
SET f.isSettled = IF(f.AmountPaid - c.cut >= f.TotalAmount - 0.005, f.isSettled, 0),
    f.AmountPaid = GREATEST(0, f.AmountPaid - c.cut)
WHERE f.isActive = 1;

-- The part that was rightly waived off stays, as a record of its own.
INSERT INTO app_waive_offs (batch_id, kind, staff_id, shop_id, invoice_id, settlement_id, tracking, amount, reason, created_by, created_at)
SELECT CONCAT(w.batch_id, 'F'), w.kind, w.staff_id, w.shop_id, w.invoice_id, w.settlement_id, w.tracking, w.amount - c.cut, w.reason, w.created_by, w.created_at
FROM app_waive_offs w JOIN tmp_cut c ON c.waive_id = w.waive_id
WHERE w.amount - c.cut > 0.004;

UPDATE app_waive_offs w JOIN tmp_cut c ON c.waive_id = w.waive_id
SET w.batch_id = CONCAT(w.batch_id, 'X'), w.reversed = 1,
    w.reversed_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 330 MINUTE),
    w.reverse_reason = 'Correction: more was waived off than was owed';

COMMIT;

SELECT u.name, n.balance AS credit_before, n.after_fix AS credit_after
FROM tmp_neg n LEFT JOIN users u ON u.user_id = n.staff_id ORDER BY n.balance;
