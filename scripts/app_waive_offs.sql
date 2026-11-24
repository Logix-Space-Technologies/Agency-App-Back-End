-- Waive-offs of credit (shop credit, cash short, stock charged). The server also creates this table by itself when it starts.
CREATE TABLE IF NOT EXISTS app_waive_offs (
  waive_id INT NOT NULL AUTO_INCREMENT,
  batch_id VARCHAR(40) NOT NULL,
  kind VARCHAR(20) NOT NULL,
  staff_id INT NOT NULL,
  shop_id INT DEFAULT NULL,
  invoice_id INT DEFAULT NULL,
  settlement_id INT DEFAULT NULL,
  tracking VARCHAR(40) DEFAULT NULL,
  amount DECIMAL(12,2) NOT NULL,
  reason VARCHAR(300) NOT NULL,
  created_by INT DEFAULT NULL,
  created_at DATETIME NOT NULL,
  reversed TINYINT NOT NULL DEFAULT 0,
  reversed_by INT DEFAULT NULL,
  reversed_at DATETIME DEFAULT NULL,
  reverse_reason VARCHAR(300) DEFAULT NULL,
  PRIMARY KEY (waive_id),
  KEY idx_waive_invoice (invoice_id, kind, reversed),
  KEY idx_waive_staff (staff_id, kind),
  KEY idx_waive_settlement (settlement_id, kind, reversed),
  KEY idx_waive_batch (batch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- If the table was created before the tracking column existed (the server adds it by itself on start):
-- ALTER TABLE app_waive_offs ADD COLUMN tracking VARCHAR(40) DEFAULT NULL;

-- Sidebar link: Credits & Waive-off, in the Reports group with the same roles as View Credit.
-- The server also does this by itself on start. Safe to run again.
INSERT INTO menu_items (name, href, menu_id, parent_id, access_roles, isActive, sort_order)
SELECT 'Credits & Waive-off', '/app-credits', p.menu_id, p.id, v.access_roles, 1, 99
FROM menu_items p JOIN menu_items v ON v.href = '/view-credit'
WHERE p.parent_id IS NULL AND LOWER(TRIM(p.name)) = 'reports'
  AND NOT EXISTS (SELECT 1 FROM menu_items x WHERE x.href = '/app-credits')
LIMIT 1;
