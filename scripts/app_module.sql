-- Salesperson mobile app + route management.
-- Run once on the production database. Every table is new; no existing table is altered.

CREATE TABLE IF NOT EXISTS `app_routes` (
  `route_id` int(11) NOT NULL AUTO_INCREMENT,
  `route_name` varchar(255) NOT NULL,
  `area` varchar(255) DEFAULT NULL,
  `description` varchar(1000) DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL,
  `created_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`route_id`),
  KEY `idx_app_routes_active` (`isActive`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- One staff member can have many routes, and a route can have many staff.
CREATE TABLE IF NOT EXISTS `app_staff_routes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `staff_id` int(11) NOT NULL,
  `route_id` int(11) NOT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `assigned_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_staff_route` (`staff_id`,`route_id`),
  KEY `idx_staff_routes_route` (`route_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `app_shops` (
  `shop_id` int(11) NOT NULL AUTO_INCREMENT,
  `route_id` int(11) NOT NULL,
  `shop_name` varchar(255) NOT NULL,
  `address` varchar(1000) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `owner_name` varchar(255) DEFAULT NULL,
  `owner_phone` varchar(20) DEFAULT NULL,
  `gst_number` varchar(20) DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `location_source` enum('gps','map') DEFAULT NULL,
  `added_by` int(11) DEFAULT NULL,
  `customer_id` int(11) DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`shop_id`),
  KEY `idx_app_shops_route` (`route_id`,`isActive`),
  KEY `idx_app_shops_added_by` (`added_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Everything the app does is logged here; rows older than 15 days are purged by the server.
CREATE TABLE IF NOT EXISTS `app_activity_log` (
  `log_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `staff_id` int(11) NOT NULL,
  `action` varchar(100) NOT NULL,
  `details` varchar(1000) DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `device` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`log_id`),
  KEY `idx_app_log_created` (`created_at`),
  KEY `idx_app_log_staff` (`staff_id`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `app_invoices` (
  `app_invoice_id` int(11) NOT NULL AUTO_INCREMENT,
  `invoice_no` varchar(50) NOT NULL,
  `client_uuid` varchar(64) DEFAULT NULL,
  `staff_id` int(11) NOT NULL,
  `shop_id` int(11) NOT NULL,
  `route_id` int(11) DEFAULT NULL,
  `invoice_date` date NOT NULL,
  `total_amount` decimal(12,2) NOT NULL,
  `cash_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `upi_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `card_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `credit_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `price_diff_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `max_price_diff_pct` decimal(8,2) NOT NULL DEFAULT 0.00,
  `price_flag` tinyint(1) NOT NULL DEFAULT 0,
  `status` enum('pending','settled','rejected') NOT NULL DEFAULT 'pending',
  `notes` varchar(500) DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `settled_by` int(11) DEFAULT NULL,
  `settled_at` datetime DEFAULT NULL,
  `final_sale_tracking_id` varchar(500) DEFAULT NULL,
  `system_invoice_number` varchar(100) DEFAULT NULL,
  `reject_reason` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`app_invoice_id`),
  UNIQUE KEY `uq_app_invoice_no` (`invoice_no`),
  UNIQUE KEY `uq_app_invoice_uuid` (`client_uuid`),
  KEY `idx_app_invoice_staff_date` (`staff_id`,`invoice_date`),
  KEY `idx_app_invoice_status_date` (`status`,`invoice_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `app_invoice_items` (
  `item_id` int(11) NOT NULL AUTO_INCREMENT,
  `app_invoice_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `price_id` int(11) DEFAULT NULL,
  `quantity` int(11) NOT NULL,
  `system_price` decimal(10,2) NOT NULL,
  `sold_price` decimal(10,2) NOT NULL,
  `line_total` decimal(12,2) NOT NULL,
  PRIMARY KEY (`item_id`),
  KEY `idx_app_items_invoice` (`app_invoice_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Sidebar: a new "Mobile App" group holding the five admin pages. Safe to run again.
-- 1. The "Mobile App" menu group (admin only), placed last.
INSERT INTO menu_items (name, menu_id, short_name, parent_id, access_roles, isActive, sort_order)
SELECT 'Mobile App', 'mobile_app', 'App', NULL, 'admin', 1, COALESCE(MAX(sort_order), 0) + 1
FROM menu_items
WHERE parent_id IS NULL
HAVING NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'Mobile App' AND parent_id IS NULL);

-- 2. Add any of the five links that do not exist yet, directly under it.
INSERT INTO menu_items (name, href, menu_id, parent_id, access_roles, isActive, sort_order)
SELECT n.name, n.href, p.menu_id, p.id, 'admin', 1, n.step
FROM (
  SELECT 'App Routes' AS name, '/app-routes' AS href, 1 AS step
  UNION ALL SELECT 'App Staff and Allocation', '/app-staff', 2
  UNION ALL SELECT 'App Shops and Map', '/app-shops', 3
  UNION ALL SELECT 'App Invoices Settlement', '/app-invoices', 4
  UNION ALL SELECT 'App Activity Log', '/app-activity-log', 5
) n
JOIN menu_items p ON p.name = 'Mobile App' AND p.parent_id IS NULL
WHERE NOT EXISTS (SELECT 1 FROM menu_items x WHERE x.href = n.href);

-- 3. Links added earlier under another group move into Mobile App.
UPDATE menu_items c
JOIN menu_items p ON p.name = 'Mobile App' AND p.parent_id IS NULL
SET c.parent_id = p.id, c.menu_id = p.menu_id, c.access_roles = 'admin'
WHERE c.href IN ('/app-routes', '/app-staff', '/app-shops', '/app-invoices', '/app-activity-log');
