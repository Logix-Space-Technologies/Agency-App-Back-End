-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Apr 18, 2025 at 11:00 PM IST
-- Server version: 10.4.27-MariaDB
-- PHP Version: 7.4.33

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `AgencyDb`
--

-- --------------------------------------------------------

--
-- Table structure for table `brands`
--

CREATE TABLE `brands` (
  `brand_id` int(11) NOT NULL,
  `brand_name` varchar(255) NOT NULL,
  `isActive` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `category_id` int(11) NOT NULL,
  `category_name` varchar(255) NOT NULL,
  `isActive` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `credits`
--

CREATE TABLE `credits` (
  `credit_id` int(11) NOT NULL,
  `marketing_staff_id` int(11) DEFAULT NULL,
  `shop_name` varchar(255) DEFAULT NULL,
  `product_id` int(11) DEFAULT NULL,
  `credit_amount` decimal(10,2) NOT NULL,
  `credit_date` date NOT NULL,
  `settled` tinyint(1) DEFAULT 0,
  `settled_date` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `daily_stock_allocation`
--

CREATE TABLE `daily_stock_allocation` (
  `daily_stock_id` int(11) NOT NULL,
  `marketing_staff_id` int(11) DEFAULT NULL,
  `product_id` int(11) DEFAULT NULL,
  `allocated_quantity` int(11) NOT NULL,
  `date` date NOT NULL,
  `isActive` int(11) NOT NULL DEFAULT 1,
  `converted_to_sales` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `final_sale`
--

CREATE TABLE `final_sale` (
  `id` int(11) NOT NULL,
  `sale_tracking_Id` varchar(555) NOT NULL,
  `TotalAmount` double NOT NULL,
  `UserId` int(11) NOT NULL,
  `DateofTransaction` timestamp NOT NULL DEFAULT current_timestamp(),
  `isSettled` int(11) NOT NULL,
  `AmountPaid` double NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `product_id` int(11) NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `category_id` int(11) DEFAULT NULL,
  `brand_id` int(11) DEFAULT NULL,
  `mrp` decimal(10,2) NOT NULL,
  `description` text DEFAULT NULL,
  `expiry_date` int(11) DEFAULT NULL,
  `product_image` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `isActive` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product_prices`
--

CREATE TABLE `product_prices` (
  `price_id` int(11) NOT NULL,
  `product_id` int(11) DEFAULT NULL,
  `purchase_price` decimal(10,2) NOT NULL,
  `commision_rate` double NOT NULL DEFAULT 0,
  `marketing_selling_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `direct_selling_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `whole_sale_price` double NOT NULL DEFAULT 0,
  `effective_date` date NOT NULL,
  `isActive` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `purchase`
--

CREATE TABLE `purchase` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `purchase_date` date NOT NULL,
  `purchase_price` decimal(10,2) NOT NULL,
  `total_amount` double DEFAULT NULL,
  `quantity` int(11) NOT NULL,
  `Invoice_Number` varchar(1100) NOT NULL,
  `supplier_id` int(11) NOT NULL,
  `isActive` int(11) NOT NULL DEFAULT 1,
  `AddedDate` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_damaged` tinyint(1) DEFAULT 0,
  `damage_description` text DEFAULT NULL,
  `replacement_provided` tinyint(1) DEFAULT 0,
  `replacement_date` date DEFAULT NULL,
  `is_free_replacement` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `returns`
--

CREATE TABLE `returns` (
  `return_id` int(11) NOT NULL,
  `marketing_staff_id` int(11) DEFAULT NULL,
  `product_id` int(11) DEFAULT NULL,
  `damaged_quantity` int(11) NOT NULL,
  `return_date` date NOT NULL,
  `isActive` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Salary`
--

CREATE TABLE `Salary` (
  `id` int(11) NOT NULL,
  `UserId` int(11) NOT NULL,
  `Date` timestamp NOT NULL DEFAULT current_timestamp(),
  `Amount` double NOT NULL,
  `Sale_Id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sales`
--

CREATE TABLE `sales` (
  `sale_id` int(11) NOT NULL,
  `sale_type` enum('marketing','direct') NOT NULL,
  `marketing_staff_id` int(11) DEFAULT NULL,
  `product_id` int(11) DEFAULT NULL,
  `price_id` int(11) DEFAULT NULL,
  `quantity_sold` int(11) NOT NULL,
  `amount_received` double NOT NULL DEFAULT 0,
  `is_credit` int(11) DEFAULT 0,
  `sale_tracking_Id` varchar(500) NOT NULL,
  `sale_date` date NOT NULL,
  `damaged_count` int(11) NOT NULL,
  `is_settled` int(11) NOT NULL,
  `loss_count` int(11) NOT NULL,
  `isActive` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sales_credit_history`
--

CREATE TABLE `sales_credit_history` (
  `sales_credit_history_id` int(11) NOT NULL,
  `sale_tracking_Id` varchar(555) NOT NULL,
  `amount` int(11) NOT NULL,
  `creditedDate` datetime NOT NULL DEFAULT current_timestamp(),
  `isActive` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `stock`
--

CREATE TABLE `stock` (
  `stock_id` int(11) NOT NULL,
  `product_id` int(11) DEFAULT NULL,
  `price_id` int(11) DEFAULT NULL,
  `quantity` int(11) NOT NULL DEFAULT 0,
  `Damage_Qty` int(11) NOT NULL DEFAULT 0,
  `Loss_Qty` int(11) NOT NULL DEFAULT 0,
  `added_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `isActive` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `stock_History`
--

CREATE TABLE `stock_History` (
  `stock_History_Id` int(11) NOT NULL,
  `stock_Id` int(11) NOT NULL,
  `Qty` int(11) NOT NULL,
  `stock_type` varchar(555) DEFAULT NULL,
  `AddedDate` timestamp NOT NULL DEFAULT current_timestamp(),
  `AddedBy` int(11) NOT NULL DEFAULT 0,
  `CreditOrDebit` varchar(1500) NOT NULL DEFAULT 'NULL',
  `ReferenceInvoiceOrSale` varchar(1500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `suppliers`
--

CREATE TABLE `suppliers` (
  `supplier_id` int(11) NOT NULL,
  `supplier_name` varchar(1200) NOT NULL,
  `added_Date` datetime NOT NULL DEFAULT current_timestamp(),
  `contact_number` varchar(2000) NOT NULL,
  `email_Id` varchar(2000) NOT NULL,
  `Address` varchar(2000) NOT NULL,
  `isActive` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `profile_avathar` varchar(1100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `role` enum('admin','staff','marketing_staff') NOT NULL,
  `phone` varchar(15) NOT NULL DEFAULT '0',
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `Place_Of_Allocation` varchar(5000) DEFAULT NULL,
  `isActive` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `brands`
--
ALTER TABLE `brands`
  ADD PRIMARY KEY (`brand_id`),
  ADD UNIQUE KEY `brand_name` (`brand_name`);

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`category_id`),
  ADD UNIQUE KEY `category_name` (`category_name`);

--
-- Indexes for table `credits`
--
ALTER TABLE `credits`
  ADD PRIMARY KEY (`credit_id`),
  ADD KEY `marketing_staff_id` (`marketing_staff_id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `daily_stock_allocation`
--
ALTER TABLE `daily_stock_allocation`
  ADD PRIMARY KEY (`daily_stock_id`),
  ADD KEY `marketing_staff_id` (`marketing_staff_id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `final_sale`
--
ALTER TABLE `final_sale`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`product_id`),
  ADD KEY `category_id` (`category_id`),
  ADD KEY `brand_id` (`brand_id`);

--
-- Indexes for table `product_prices`
--
ALTER TABLE `product_prices`
  ADD PRIMARY KEY (`price_id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `purchase`
--
ALTER TABLE `purchase`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `fk_purchase_supplier` (`supplier_id`);

--
-- Indexes for table `returns`
--
ALTER TABLE `returns`
  ADD PRIMARY KEY (`return_id`),
  ADD KEY `marketing_staff_id` (`marketing_staff_id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `Salary`
--
ALTER TABLE `Salary`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `sales`
--
ALTER TABLE `sales`
  ADD PRIMARY KEY (`sale_id`),
  ADD KEY `marketing_staff_id` (`marketing_staff_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `price_id` (`price_id`);

--
-- Indexes for table `sales_credit_history`
--
ALTER TABLE `sales_credit_history`
  ADD PRIMARY KEY (`sales_credit_history_id`);

--
-- Indexes for table `stock`
--
ALTER TABLE `stock`
  ADD PRIMARY KEY (`stock_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `price_id` (`price_id`);

--
-- Indexes for table `stock_History`
--
ALTER TABLE `stock_History`
  ADD PRIMARY KEY (`stock_History_Id`);

--
-- Indexes for table `suppliers`
--
ALTER TABLE `suppliers`
  ADD PRIMARY KEY (`supplier_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `phone` (`phone`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `brands`
--
ALTER TABLE `brands`
  MODIFY `brand_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `category_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `credits`
--
ALTER TABLE `credits`
  MODIFY `credit_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `daily_stock_allocation`
--
ALTER TABLE `daily_stock_allocation`
  MODIFY `daily_stock_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=95;

--
-- AUTO_INCREMENT for table `final_sale`
--
ALTER TABLE `final_sale`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=45;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `product_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `product_prices`
--
ALTER TABLE `product_prices`
  MODIFY `price_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `purchase`
--
ALTER TABLE `purchase`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=