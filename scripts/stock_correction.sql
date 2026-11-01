-- One-time stock correction for the Stock Management page (/view-stock).
-- Run it by hand on the cloud database, step by step. Nothing here runs by itself.
--
-- What it does, only for the products you list in stock_count_tmp:
--   1. closes open allocations dated before @cutoff (old allocations that were never settled), and
--   2. sets the store quantity so that "Total Stock" on the page equals the real count you give.
-- Total Stock on the page = quantity - open allocations - Damage_Qty, so the new quantity is
--   real count + Damage_Qty + the allocations that stay open (today's).
-- Products you do not list are not touched. Every change is written to stock_History as 'correction'.

USE AgencyDb;

-- STEP 0: backup. Skip nothing here. (If a backup table of this name exists, the CREATE fails: stop and look.)
CREATE TABLE stock_backup_20261101 AS SELECT * FROM stock;
CREATE TABLE daily_stock_allocation_backup_20261101 AS SELECT * FROM daily_stock_allocation;
CREATE TABLE stock_History_backup_20261101 AS SELECT * FROM stock_History;

-- STEP 1: the cut-off. Open allocations dated BEFORE this day are closed. Today's stay open.
SET @cutoff = CURDATE();
SELECT @cutoff AS allocations_before_this_day_will_be_closed;

-- STEP 2: the real counts. One row per product, product_id from the list below.
DROP TABLE IF EXISTS stock_count_tmp;
CREATE TABLE stock_count_tmp (product_id INT PRIMARY KEY, real_count INT NOT NULL);

-- List of products with what the page shows now (use it to fill the counts):
SELECT p.product_id, p.product_name, s.quantity, s.Damage_Qty,
       COALESCE((SELECT SUM(d.allocated_quantity) FROM daily_stock_allocation d
                 WHERE d.product_id = s.product_id AND d.converted_to_sales = 0 AND d.isActive = 1), 0) AS open_allocation,
       s.quantity - s.Damage_Qty - COALESCE((SELECT SUM(d.allocated_quantity) FROM daily_stock_allocation d
                 WHERE d.product_id = s.product_id AND d.converted_to_sales = 0 AND d.isActive = 1), 0) AS shown_now
FROM stock s JOIN products p ON p.product_id = s.product_id
WHERE s.isActive = 1 ORDER BY p.product_name;

-- Then fill the counts (replace the examples, one tuple per product, last one without a comma):
-- INSERT INTO stock_count_tmp (product_id, real_count) VALUES (12, 0), (34, 5625);

-- STEP 3: preview. Nothing changes yet. Check every line before going on.
SELECT p.product_name, c.real_count AS real_count,
       s.quantity AS quantity_now,
       (SELECT COALESCE(SUM(d.allocated_quantity),0) FROM daily_stock_allocation d
         WHERE d.product_id = s.product_id AND d.converted_to_sales = 0 AND d.isActive = 1 AND d.date < @cutoff) AS old_allocation_to_close,
       (SELECT COALESCE(SUM(d.allocated_quantity),0) FROM daily_stock_allocation d
         WHERE d.product_id = s.product_id AND d.converted_to_sales = 0 AND d.isActive = 1 AND d.date >= @cutoff) AS allocation_staying_open,
       s.Damage_Qty,
       c.real_count + s.Damage_Qty
         + (SELECT COALESCE(SUM(d.allocated_quantity),0) FROM daily_stock_allocation d
             WHERE d.product_id = s.product_id AND d.converted_to_sales = 0 AND d.isActive = 1 AND d.date >= @cutoff) AS quantity_after
FROM stock_count_tmp c
JOIN stock s ON s.product_id = c.product_id AND s.isActive = 1
JOIN products p ON p.product_id = c.product_id
ORDER BY p.product_name;

-- STEP 4: apply. Run these lines together. They stay open until you type COMMIT (or ROLLBACK to cancel).
START TRANSACTION;

-- Remember each product's quantity before the change, for the history line.
DROP TEMPORARY TABLE IF EXISTS stock_before_tmp;
CREATE TEMPORARY TABLE stock_before_tmp AS
  SELECT s.stock_id, s.product_id, s.quantity AS old_quantity
  FROM stock s JOIN stock_count_tmp c ON c.product_id = s.product_id WHERE s.isActive = 1;

UPDATE daily_stock_allocation d
JOIN stock_count_tmp c ON c.product_id = d.product_id
SET d.converted_to_sales = 1
WHERE d.converted_to_sales = 0 AND d.isActive = 1 AND d.date < @cutoff;

UPDATE stock s
JOIN stock_count_tmp c ON c.product_id = s.product_id
SET s.quantity = c.real_count + COALESCE(s.Damage_Qty, 0)
  + (SELECT COALESCE(SUM(d.allocated_quantity), 0) FROM daily_stock_allocation d
      WHERE d.product_id = s.product_id AND d.converted_to_sales = 0 AND d.isActive = 1)
WHERE s.isActive = 1;

INSERT INTO stock_History (stock_Id, Qty, stock_type, AddedDate, AddedBy, CreditOrDebit, ReferenceInvoiceOrSale)
SELECT b.stock_id, s.quantity - b.old_quantity, 'correction', CURDATE(), 0,
       IF(s.quantity - b.old_quantity < 0, 'debit', 'Credit'), 'stock correction 2026-11-01'
FROM stock_before_tmp b JOIN stock s ON s.stock_id = b.stock_id
WHERE s.quantity <> b.old_quantity;

-- Check: "shown_now" must equal real_count for every line.
SELECT p.product_name, c.real_count,
       s.quantity - COALESCE(s.Damage_Qty, 0)
         - (SELECT COALESCE(SUM(d.allocated_quantity), 0) FROM daily_stock_allocation d
             WHERE d.product_id = s.product_id AND d.converted_to_sales = 0 AND d.isActive = 1) AS shown_now
FROM stock_count_tmp c JOIN stock s ON s.product_id = c.product_id AND s.isActive = 1
JOIN products p ON p.product_id = c.product_id ORDER BY p.product_name;

-- If every line matches:   COMMIT;
-- If anything looks wrong: ROLLBACK;

-- To undo after COMMIT: copy stock.quantity and the allocation rows back from the three *_backup_20261101 tables.
