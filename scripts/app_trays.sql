-- Trays: how many the salesperson takes in the morning (with Take stock) and brings back at settlement.
-- A new table only: no existing table, bill or settlement is changed. Days before this feature have no row,
-- so they show no tray figures. Safe to run again.
CREATE TABLE IF NOT EXISTS `app_day_trays` (
  `tray_id` int(11) NOT NULL AUTO_INCREMENT,
  `staff_id` int(11) NOT NULL,
  `tray_date` date NOT NULL,
  `taken` int(11) DEFAULT NULL,
  `returned` int(11) DEFAULT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`tray_id`),
  UNIQUE KEY `uq_day_trays` (`staff_id`,`tray_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
