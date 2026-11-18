-- Salespeople can report a wrong bill from the phone; the office handles it in the web console.
-- The server also creates this table by itself the first time it is needed, so running this is optional.
CREATE TABLE IF NOT EXISTS `app_invoice_corrections` (
  `correction_id` INT NOT NULL AUTO_INCREMENT,
  `invoice_id` INT NOT NULL,
  `staff_id` INT NOT NULL,
  `reason` VARCHAR(40) NOT NULL,
  `note` VARCHAR(500) DEFAULT NULL,
  `status` VARCHAR(12) NOT NULL DEFAULT 'open',      -- open | done | dismissed
  `admin_note` VARCHAR(500) DEFAULT NULL,
  `handled_by` INT DEFAULT NULL,
  `handled_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL,
  PRIMARY KEY (`correction_id`),
  KEY `idx_corr_invoice` (`invoice_id`),
  KEY `idx_corr_status` (`status`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
