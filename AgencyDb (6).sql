-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Jun 09, 2025 at 12:17 PM
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

--
-- Dumping data for table `brands`
--

INSERT INTO `brands` (`brand_id`, `brand_name`, `isActive`) VALUES
(1, 'Milma', 1),
(2, 'Modern', 1);

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `category_id` int(11) NOT NULL,
  `category_name` varchar(255) NOT NULL,
  `isActive` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`category_id`, `category_name`, `isActive`) VALUES
(1, 'Diary', 1),
(2, 'Snacks', 1);

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
-- Table structure for table `Customers`
--

CREATE TABLE `Customers` (
  `id` int(11) NOT NULL,
  `Name` varchar(555) NOT NULL,
  `Place` varchar(555) NOT NULL,
  `Mobile` varchar(555) NOT NULL,
  `EmailId` varchar(555) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `Customers`
--

INSERT INTO `Customers` (`id`, `Name`, `Place`, `Mobile`, `EmailId`) VALUES
(17, 'ANISH S NAIR', 'Pndalaam', '09496873618', 'anish@gmail.com'),
(18, 'ANISH S NAIR', 'Adoor', '9526674440', 'anish12@gmail.com'),
(19, 'Manu', 'Pndalaam', '84986489', 'manu@g.com'),
(21, 'MANOJ', 'ADOOR', '830100082', 'rakeshmanoj@gmail.com'),
(23, 'Kavya M Nair', 'Pandalaam', '8301000082', 'kavya@gmail.com'),
(24, 'MANU', 'ADOOR', '9496873617', 'rakesh131@gmail.com');

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

--
-- Dumping data for table `daily_stock_allocation`
--

INSERT INTO `daily_stock_allocation` (`daily_stock_id`, `marketing_staff_id`, `product_id`, `allocated_quantity`, `date`, `isActive`, `converted_to_sales`) VALUES
(46, 1, 1, 15, '2025-04-15', 1, 1),
(48, 1, 2, 12, '2025-04-17', 1, 1),
(49, 1, 1, 100, '2025-04-17', 1, 1),
(50, 1, 1, 2, '2025-04-17', 1, 1),
(51, 1, 3, 5, '2025-04-17', 1, 1),
(52, 1, 2, 10, '2025-04-17', 1, 1),
(53, 1, 1, 12, '2025-04-17', 1, 1),
(54, 1, 2, 11, '2025-04-17', 1, 1),
(55, 1, 3, 1, '2025-04-17', 1, 1),
(56, 3, 1, 123, '2025-04-17', 1, 1),
(57, 3, 2, 123, '2025-04-17', 1, 1),
(58, 3, 3, 199, '2025-04-17', 1, 1),
(59, 3, 4, 100, '2025-04-17', 1, 1),
(60, 3, 1, 123, '2025-04-17', 1, 1),
(61, 3, 2, 22, '2025-04-17', 1, 1),
(62, 3, 3, 22, '2025-04-17', 1, 1),
(63, 1, 1, 11, '2025-04-17', 1, 1),
(64, 1, 2, 11, '2025-04-17', 1, 1),
(65, 3, 2, 11, '2025-04-17', 1, 1),
(66, 3, 2, 11, '2025-04-17', 1, 1),
(67, 1, 4, 100, '2025-04-17', 1, 1),
(68, 3, 4, 111, '2025-04-17', 1, 1),
(69, 3, 1, 11, '2025-04-17', 1, 1),
(70, 1, 1, 11, '2025-04-17', 1, 1),
(71, 3, 1, 11, '2025-04-17', 1, 1),
(72, 1, 3, 11, '2025-04-17', 1, 1),
(73, 1, 1, 11, '2025-04-17', 1, 1),
(74, 3, 1, 11, '2025-04-17', 1, 1),
(75, 3, 1, 234, '2025-04-17', 1, 1),
(76, 1, 1, 11, '2025-04-17', 1, 1),
(77, 1, 3, 11, '2025-04-17', 1, 1),
(78, 1, 2, 2, '2025-04-17', 1, 1),
(79, 1, 1, 10, '2025-04-17', 1, 1),
(80, 1, 1, 10, '2025-04-18', 1, 1),
(81, 1, 2, 10, '2025-04-18', 1, 1),
(82, 3, 1, 10, '2025-04-18', 1, 1),
(83, 1, 1, 11, '2025-04-18', 1, 1),
(84, 3, 1, 2, '2025-04-18', 1, 1),
(85, 1, 2, 1, '2025-04-18', 1, 1),
(86, 1, 3, 1, '2025-04-18', 1, 1),
(87, 1, 1, 2, '2025-04-18', 1, 1),
(88, 1, 1, 1, '2025-04-18', 1, 1),
(89, 1, 1, 1, '2025-04-18', 1, 1),
(90, 1, 1, 11, '2025-04-18', 1, 1),
(91, 3, 3, 12, '2025-04-18', 1, 1),
(92, 3, 1, 112, '2025-04-18', 1, 1),
(93, 1, 1, 11, '2025-04-18', 1, 1),
(94, 1, 2, 11, '2025-04-18', 1, 1),
(95, 1, 4, 300, '2025-04-18', 1, 1),
(96, 1, 3, 80, '2025-04-18', 1, 1),
(97, 1, 4, 20, '2025-04-20', 1, 0),
(98, 3, 3, 100, '2025-04-20', 1, 1),
(99, 3, 2, 100, '2025-04-20', 1, 1),
(100, 3, 1, 100, '2025-04-20', 1, 1),
(101, 3, 2, 100, '2025-04-20', 1, 1),
(102, 1, 1, 788, '2025-04-30', 1, 1),
(103, 1, 4, 20, '2025-04-30', 1, 1),
(104, 1, 4, 101, '2025-04-30', 1, 1),
(105, 1, 4, 10, '2025-05-05', 1, 1),
(106, 1, 4, 120, '2025-05-05', 1, 1),
(107, 1, 4, 100, '2025-05-05', 1, 1),
(108, 3, 4, 1000, '2025-05-05', 1, 1),
(109, 3, 4, 120, '2025-05-05', 1, 0),
(110, 3, 4, 12, '2025-05-05', 1, 1),
(111, 4, 4, 100, '2025-05-05', 1, 1),
(112, 4, 1, 100, '2025-05-05', 1, 1),
(113, 4, 4, 100, '2025-05-05', 1, 1),
(114, 4, 4, 23, '2025-05-05', 1, 0),
(115, 4, 4, 123, '2025-05-05', 1, 0),
(116, 1, 1, 12, '2025-05-05', 1, 1),
(117, 1, 1, 10, '2025-05-05', 1, 1),
(118, 1, 2, 123, '2025-05-05', 1, 1),
(119, 1, 1, 700, '2025-05-06', 1, 1),
(120, 1, 4, 1, '2025-05-06', 1, 1),
(121, 3, 2, 60, '2025-05-06', 1, 1),
(122, 1, 3, 1, '2025-05-06', 1, 1),
(123, 3, 3, 10, '2025-05-06', 1, 1),
(124, 4, 1, 10, '2025-05-06', 1, 0),
(125, 1, 1, 100, '2025-05-06', 1, 0),
(126, 1, 1, 600, '2025-05-12', 0, 0),
(127, 1, 2, 212, '2025-05-12', 0, 0),
(128, 1, 4, 21, '2025-05-12', 0, 0),
(129, 1, 1, 978, '2025-05-12', 0, 0),
(130, 1, 2, 1000, '2025-05-12', 0, 0),
(131, 3, 1, 100, '2025-05-12', 0, 0),
(132, 1, 1, 12, '2025-05-12', 0, 0),
(133, 1, 4, 21, '2025-05-12', 0, 0),
(134, 1, 2, 757, '2025-05-12', 1, 0),
(135, 1, 1, 866, '2025-05-12', 0, 0),
(136, 1, 1, 0, '2025-05-15', 1, 1),
(137, 1, 2, 0, '2025-05-15', 1, 1),
(138, 1, 1, 11, '2025-05-17', 1, 0),
(139, 1, 2, 6, '2025-05-17', 1, 0),
(140, 1, 1, 2, '2025-05-20', 1, 1),
(141, 3, 1, 2, '2025-05-20', 1, 1),
(142, 3, 2, 0, '2025-05-20', 1, 1),
(143, 1, 1, 193, '2025-05-20', 1, 1),
(144, 1, 1, 4, '2025-05-20', 1, 1),
(145, 1, 1, 12, '2025-05-21', 1, 0),
(146, 1, 1, 0, '2025-05-23', 1, 1),
(147, 1, 2, 0, '2025-05-23', 1, 1),
(148, 1, 1, 0, '2025-05-25', 1, 1),
(149, 1, 1, 0, '2025-05-25', 1, 1),
(150, 1, 1, 0, '2025-05-25', 1, 1),
(151, 1, 1, 0, '2025-06-01', 1, 1),
(152, 1, 1, 0, '2025-06-01', 1, 1),
(153, 1, 4, 0, '2025-06-01', 1, 1),
(154, 1, 1, 0, '2025-06-01', 1, 1),
(155, 1, 1, 0, '2025-06-01', 1, 1),
(156, 1, 1, 0, '2025-06-01', 1, 1),
(157, 1, 1, 0, '2025-06-01', 1, 1),
(158, 1, 1, 0, '2025-06-01', 1, 1),
(159, 3, 1, 0, '2025-06-01', 1, 1),
(160, 3, 1, 0, '2025-06-01', 1, 1),
(161, 3, 4, 0, '2025-06-01', 1, 1),
(162, 3, 1, 0, '2025-06-01', 1, 1),
(163, 3, 4, 0, '2025-06-01', 1, 1),
(164, 3, 1, 1, '2025-06-01', 1, 0),
(165, 3, 4, 1, '2025-06-01', 1, 1);

-- --------------------------------------------------------

--
-- Table structure for table `final_sale`
--

CREATE TABLE `final_sale` (
  `id` int(11) NOT NULL,
  `sale_tracking_Id` varchar(555) NOT NULL,
  `TotalAmount` double NOT NULL,
  `UserId` int(11) NOT NULL,
  `DateofTransaction` date NOT NULL DEFAULT current_timestamp(),
  `isSettled` int(11) NOT NULL,
  `AmountPaid` double NOT NULL,
  `FuelExpenses` decimal(10,2) DEFAULT 0.00,
  `VehcileServiceExpenses` decimal(10,2) DEFAULT 0.00,
  `OtherExpenses` decimal(10,2) DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `final_sale`
--

INSERT INTO `final_sale` (`id`, `sale_tracking_Id`, `TotalAmount`, `UserId`, `DateofTransaction`, `isSettled`, `AmountPaid`, `FuelExpenses`, `VehcileServiceExpenses`, `OtherExpenses`) VALUES
(131, 'vSBJIRwTra', 260, 1, '2025-05-25', 0, 160, '30.00', '40.00', '30.00'),
(132, '57HJMtAfM7', 260, 1, '2025-05-25', 0, 250, '10.00', '0.00', '0.00'),
(133, '1Iya6NyflS', 260, 1, '2025-05-25', 1, 450, '0.00', '10.00', '0.00'),
(135, 'TsztC3jbfe', 124, 23, '2025-05-31', 0, 124, '0.00', '0.00', '0.00'),
(136, '2FQuupUkDw', 621, 17, '2025-05-31', 1, 621, '0.00', '0.00', '0.00'),
(137, 'grg5QhrGx0', 588, 23, '2025-05-31', 0, 581, '0.00', '0.00', '0.00'),
(138, 'uRV6yG12Gi', 3120, 1, '2025-06-01', 0, 2920, '100.00', '0.00', '0.00'),
(139, '25UZNn86dW', 972, 1, '2025-06-01', 1, 871, '100.00', '0.00', '0.00'),
(140, 'pDqyvDI09s', 27, 24, '2025-06-01', 0, 23, '0.00', '0.00', '0.00'),
(141, 'jBr20sxBge', 832, 1, '2025-06-01', 0, 650, '100.00', '0.00', '0.00'),
(142, 'MqNm5c4Lp3', 312, 1, '2025-06-01', 0, 12, '11.00', '0.00', '0.00'),
(143, '2MXToIFowX', 806, 1, '2025-06-01', 0, 10, '0.00', '0.00', '0.00'),
(144, '5Fs6klF4y2', 26, 1, '2025-06-01', 0, 12, '10.00', '0.00', '0.00'),
(145, 'PqVuuQKRMW', 312, 1, '2025-06-01', 0, 21, '12.00', '0.00', '0.00'),
(146, 'IEFBzNHe0F', 26, 3, '2025-06-01', 0, 10, '10.00', '0.00', '0.00'),
(147, 'hsqjZCGFpF', 1577, 3, '2025-06-01', 1, 1400, '100.00', '30.00', '31.00'),
(148, 'GwMsvrO4Rl', 396, 3, '2025-06-01', 1, 262, '100.00', '21.00', '0.00'),
(149, 'FSImzE3WDi', 55, 3, '2025-06-01', 0, 10, '0.00', '0.00', '0.00');

-- --------------------------------------------------------

--
-- Table structure for table `Invoices_Direct_Billing`
--

CREATE TABLE `Invoices_Direct_Billing` (
  `id` int(11) NOT NULL,
  `InvoiceNo` varchar(555) NOT NULL,
  `CustomerName` varchar(555) NOT NULL,
  `Address` varchar(555) NOT NULL,
  `TotalAmount` double NOT NULL,
  `Sale_Id` int(11) NOT NULL
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

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`product_id`, `product_name`, `category_id`, `brand_id`, `mrp`, `description`, `expiry_date`, `product_image`, `created_at`, `isActive`) VALUES
(1, 'Milk 500ml Cover', 1, 1, '27.50', 'kjshbkjsd', 1, 'https://i.ytimg.com/vi/A9XhWTry3ks/hqdefault.jpg', '2025-04-15 04:52:23', 1),
(2, 'Pakkavada', 2, 2, '55.00', 'frfrf', 1, 'https://i.ytimg.com/vi/A9XhWTry3ks/hqdefault.jpg', '2025-04-15 05:26:02', 1),
(3, 'Muruku Packet', 2, 2, '60.00', 'bjbk', 5, 'https://i.ytimg.com/vi/A9XhWTry3ks/hqdefault.jpg', '2025-04-17 09:33:13', 1),
(4, 'Mixture ', 2, 2, '60.00', ',kbnkj', 1, 'https://i.ytimg.com/vi/A9XhWTry3ks/hqdefault.jpg', '2025-04-17 11:32:56', 1),
(5, 'Banana Chips', 2, 2, '89.00', 'kjbgjhkb', 30, 'https://i.ytimg.com/vi/A9XhWTry3ks/hqdefault.jpg', '2025-04-18 14:46:12', 1);

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

--
-- Dumping data for table `product_prices`
--

INSERT INTO `product_prices` (`price_id`, `product_id`, `purchase_price`, `commision_rate`, `marketing_selling_price`, `direct_selling_price`, `whole_sale_price`, `effective_date`, `isActive`) VALUES
(1, 1, '0.00', 0.5, '28.00', '28.00', 0, '2025-04-15', 0),
(2, 1, '24.00', 0.5, '26.00', '28.00', 0, '2025-04-14', 0),
(3, 2, '0.00', 2, '45.00', '45.00', 0, '2025-04-15', 0),
(4, 2, '34.00', 2, '40.00', '44.00', 0, '2025-04-14', 0),
(5, 3, '0.00', 3, '50.00', '50.00', 0, '2025-04-17', 0),
(6, 3, '45.00', 3, '47.00', '49.00', 0, '2025-04-16', 0),
(7, 4, '0.00', 1, '60.00', '60.00', 0, '2025-04-17', 0),
(8, 4, '55.00', 1, '55.00', '60.00', 55, '2025-04-16', 1),
(9, 3, '45.00', 3, '47.00', '49.00', 43, '2025-04-15', 1),
(10, 2, '34.00', 2, '40.00', '44.00', 43, '2025-04-13', 1),
(11, 1, '24.00', 0.5, '26.00', '28.00', 27, '2025-04-13', 1);

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
  `AddedDate` date NOT NULL DEFAULT current_timestamp(),
  `is_damaged` tinyint(1) DEFAULT 0,
  `damage_description` text DEFAULT NULL,
  `replacement_provided` tinyint(1) DEFAULT 0,
  `replacement_date` date DEFAULT NULL,
  `is_free_replacement` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `purchase`
--

INSERT INTO `purchase` (`id`, `product_id`, `purchase_date`, `purchase_price`, `total_amount`, `quantity`, `Invoice_Number`, `supplier_id`, `isActive`, `AddedDate`, `is_damaged`, `damage_description`, `replacement_provided`, `replacement_date`, `is_free_replacement`) VALUES
(1, 1, '2025-04-18', '1000.00', 1000, 1, '12356', 1, 1, '2025-04-18', 0, NULL, 0, NULL, 0),
(2, 1, '2025-04-18', '37.00', 37000, 1000, '12356', 1, 1, '2025-04-18', 0, NULL, 0, NULL, 0),
(3, 1, '2025-04-18', '25.00', 2500, 100, 'XAB213', 1, 1, '2025-04-18', 0, NULL, 0, NULL, 0),
(4, 2, '2025-04-18', '40.00', 4000, 100, 'XAB213', 1, 1, '2025-04-18', 0, NULL, 0, NULL, 0),
(5, 3, '2025-04-18', '23.00', 23000, 1000, 'XAB213', 1, 1, '2025-04-18', 0, NULL, 0, NULL, 0),
(6, 4, '2025-04-18', '60.00', 6720, 112, 'XAB213', 1, 1, '2025-04-18', 0, NULL, 0, NULL, 0),
(9, 1, '2025-04-18', '12.00', 1332, 111, 'WAR276', 1, 1, '2025-04-18', 0, NULL, 0, NULL, 0),
(10, 2, '2025-04-18', '21.00', 2541, 121, 'WAR276', 1, 1, '2025-04-18', 0, NULL, 0, NULL, 0),
(11, 1, '2025-04-18', '12.00', 12, 1, 'YRYUVJHVJM176457216', 2, 1, '2025-04-18', 0, NULL, 0, NULL, 0),
(12, 2, '2025-04-18', '12.00', 12, 1, 'YRYUVJHVJM176457216', 2, 1, '2025-04-18', 0, NULL, 0, NULL, 0),
(13, 1, '2025-04-30', '1000.00', 1000000, 1000, '12356', 1, 1, '2025-04-30', 0, NULL, 0, NULL, 0),
(14, 3, '2025-04-30', '23.00', 2415, 105, '12356', 1, 1, '2025-04-30', 0, NULL, 0, NULL, 0),
(15, 4, '2025-04-30', '10000.00', 10000, 1, 'WAR276', 1, 1, '2025-04-30', 0, NULL, 0, NULL, 0),
(16, 4, '2025-04-30', '1000.00', 1000, 1, '12356', 1, 1, '2025-04-30', 0, NULL, 0, NULL, 0),
(17, 4, '2025-04-30', '22.00', 220022, 10001, '12356', 2, 1, '2025-04-30', 0, NULL, 0, NULL, 0),
(18, 2, '2025-04-30', '11.00', 11000, 1000, '12356', 2, 1, '2025-04-30', 0, NULL, 0, NULL, 0),
(19, 2, '2025-05-05', '34.00', 34, 1, '12356', 1, 1, '2025-05-05', 0, NULL, 0, NULL, 0),
(20, 3, '2025-05-05', '45.00', 90, 2, '12356', 1, 1, '2025-05-05', 0, NULL, 0, NULL, 0),
(21, 2, '2025-05-05', '34.00', 34, 1, '12356', 2, 1, '2025-05-05', 0, NULL, 0, NULL, 0),
(22, 2, '2025-05-05', '34.00', 340, 10, '12356', 2, 1, '2025-05-05', 0, NULL, 0, NULL, 0),
(26, 1, '2025-05-06', '0.00', 0, 4000, '332', 2, 1, '2025-05-06', 0, NULL, 1, '2025-05-06', 1),
(27, 2, '2025-05-06', '0.00', 0, 1000, '332', 2, 1, '2025-05-06', 0, NULL, 1, '2025-05-06', 1),
(28, 1, '2025-05-06', '24.00', 24, 1, '32', 2, 1, '2025-05-06', 1, 'Damaged item', 0, NULL, 0),
(29, 2, '2025-05-06', '0.00', 0, 1000, '98', 1, 1, '2025-05-06', 0, NULL, 1, '2025-05-06', 1),
(30, 3, '2025-05-06', '0.00', 0, 500, '64646', 2, 1, '2025-05-06', 0, NULL, 1, '2025-05-06', 1),
(31, 1, '2025-05-06', '0.00', 0, 500, '33223', 2, 1, '2025-05-06', 0, NULL, 1, '2025-05-06', 1),
(32, 1, '2025-05-06', '0.00', 0, 400, '2332', 1, 1, '2025-05-06', 0, NULL, 1, '2025-05-06', 1),
(33, 2, '2025-05-06', '0.00', 0, 100, 'FREE-REPL-1746514495338', 1, 1, '2025-05-06', 0, NULL, 1, '2025-05-06', 1),
(34, 2, '2025-05-06', '0.00', 0, 100, 'FREE-REPL-1746514509283', 1, 1, '2025-05-06', 0, NULL, 1, '2025-05-06', 1),
(35, 3, '2025-05-06', '0.00', 0, 100, 'FREE-REPL-1746514538005', 1, 1, '2025-05-06', 0, NULL, 1, '2025-05-06', 1),
(36, 1, '2025-05-06', '0.00', 0, 99, 'FREE-REPL-1746514553784', 1, 1, '2025-05-06', 0, NULL, 1, '2025-05-06', 1),
(37, 4, '2025-05-06', '0.00', 0, 1, 'FREE-REPL-1746514553784', 1, 1, '2025-05-06', 0, NULL, 1, '2025-05-06', 1),
(38, 2, '2025-05-06', '0.00', 0, 10, 'FREE-REPL-1746514563514', 1, 1, '2025-05-06', 0, NULL, 1, '2025-05-06', 1),
(39, 3, '2025-05-06', '0.00', 0, 100, 'FREE-REPL-1746514575022', 1, 1, '2025-05-06', 0, NULL, 1, '2025-05-06', 1),
(40, 2, '2025-05-06', '0.00', 0, 89, 'FREE-REPL-1746514575022', 1, 1, '2025-05-06', 0, NULL, 1, '2025-05-06', 1),
(41, 1, '2025-05-06', '0.00', 0, 1, 'FREE-REPL-1746514575022', 1, 1, '2025-05-06', 0, NULL, 1, '2025-05-06', 1),
(42, 2, '2025-05-06', '0.00', 0, 1, 'FREE-REPL-1746514610855', 1, 1, '2025-05-06', 0, NULL, 1, '2025-05-06', 1),
(43, 1, '2025-05-06', '0.00', 0, 10, 'FREE-REPL-1746515196090', 1, 1, '2025-05-06', 0, NULL, 1, '2025-05-06', 1),
(44, 1, '2025-05-06', '0.00', 0, 2, 'FREE-REPL-1746515248098', 1, 1, '2025-05-06', 0, NULL, 1, '2025-05-06', 1),
(45, 1, '2025-05-06', '0.00', 0, 7, 'FREE-REPL-1746515902141', 1, 1, '2025-05-06', 0, NULL, 1, '2025-05-06', 1),
(46, 1, '2025-05-06', '24.00', 45600, 1900, 'ABC11233156', 2, 1, '2025-05-06', 0, NULL, 0, NULL, 0),
(47, 1, '2025-05-06', '0.00', 0, 1, 'FREE-REPL-1746516167017', 1, 1, '2025-05-06', 0, NULL, 1, '2025-05-06', 1),
(48, 2, '2025-05-06', '0.00', 0, 1, 'FREE-REPL-1746517043028', 1, 1, '2025-05-06', 0, NULL, 1, '2025-05-06', 1),
(49, 1, '2025-05-06', '0.00', 0, 2, 'FREE-REPL-1746517317649', 1, 1, '2025-05-06', 0, NULL, 1, '2025-05-06', 1),
(50, 1, '2025-05-08', '24.00', 2400, 100, 'WAR276', 2, 1, '2025-05-08', 0, NULL, 0, NULL, 0),
(51, 1, '2025-05-12', '24.00', 24000, 1000, '12356', 1, 1, '2025-05-12', 0, NULL, 0, NULL, 0),
(52, 2, '2025-05-12', '34.00', 34000, 1000, '12356', 1, 1, '2025-05-12', 0, NULL, 0, NULL, 0),
(53, 4, '2025-05-12', '55.00', 27500, 500, '12356', 1, 1, '2025-05-12', 0, NULL, 0, NULL, 0),
(54, 1, '2025-06-01', '0.00', 0, 2, 'FREE-REPL-1748741891133', 1, 1, '2025-06-01', 0, NULL, 1, '2025-06-01', 1);

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
  `Date` date NOT NULL DEFAULT current_timestamp(),
  `Amount` double NOT NULL,
  `Remarks` varchar(5000) NOT NULL,
  `AddedDate` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sales`
--

CREATE TABLE `sales` (
  `sale_id` int(11) NOT NULL,
  `sale_type` enum('marketing','direct','wholesale','home_marketing') DEFAULT NULL,
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

--
-- Dumping data for table `sales`
--

INSERT INTO `sales` (`sale_id`, `sale_type`, `marketing_staff_id`, `product_id`, `price_id`, `quantity_sold`, `amount_received`, `is_credit`, `sale_tracking_Id`, `sale_date`, `damaged_count`, `is_settled`, `loss_count`, `isActive`) VALUES
(194, 'marketing', 1, 1, 11, 10, 260, 1, 'vSBJIRwTra', '2025-05-25', 0, 0, 0, 1),
(195, 'marketing', 1, 1, 11, 10, 260, 1, '57HJMtAfM7', '2025-05-25', 0, 0, 0, 1),
(196, 'marketing', 1, 1, 11, 10, 260, 0, '1Iya6NyflS', '2025-05-25', 0, 0, 0, 1),
(198, 'wholesale', 1, 1, 11, 3, 81, 0, 'TsztC3jbfe', '2025-05-31', 0, 0, 0, 1),
(199, 'wholesale', 1, 2, 10, 1, 43, 0, 'TsztC3jbfe', '2025-05-31', 0, 0, 0, 1),
(200, 'wholesale', 1, 1, 11, 23, 621, 0, '2FQuupUkDw', '2025-05-31', 0, 1, 0, 1),
(201, 'direct', 1, 1, 11, 21, 588, 0, 'grg5QhrGx0', '2025-05-31', 0, 0, 0, 1),
(202, 'marketing', 1, 1, 11, 120, 3120, 1, 'uRV6yG12Gi', '2025-06-01', 0, 0, 0, 1),
(203, 'marketing', 1, 1, 11, 12, 312, 0, '25UZNn86dW', '2025-06-01', 0, 0, 0, 1),
(204, 'marketing', 1, 4, 8, 12, 660, 0, '25UZNn86dW', '2025-06-01', 0, 0, 0, 1),
(205, 'wholesale', 1, 1, 11, 1, 27, 0, 'pDqyvDI09s', '2025-06-01', 0, 0, 0, 1),
(206, 'marketing', 1, 1, 11, 32, 832, 1, 'jBr20sxBge', '2025-06-01', 0, 0, 0, 1),
(207, 'marketing', 1, 1, 11, 12, 312, 1, 'MqNm5c4Lp3', '2025-06-01', 0, 0, 0, 1),
(208, 'marketing', 1, 1, 11, 31, 806, 1, '2MXToIFowX', '2025-06-01', 0, 0, 0, 1),
(209, 'marketing', 1, 1, 11, 1, 26, 1, '5Fs6klF4y2', '2025-06-01', 0, 0, 0, 1),
(210, 'marketing', 1, 1, 11, 12, 312, 1, 'PqVuuQKRMW', '2025-06-01', 0, 0, 0, 1),
(211, 'marketing', 3, 1, 11, 1, 26, 1, 'IEFBzNHe0F', '2025-06-01', 0, 0, 0, 1),
(212, 'marketing', 3, 1, 11, 12, 312, 0, 'hsqjZCGFpF', '2025-06-01', 0, 0, 0, 1),
(213, 'marketing', 3, 4, 8, 23, 1265, 0, 'hsqjZCGFpF', '2025-06-01', 0, 0, 0, 1),
(214, 'marketing', 3, 1, 11, 11, 286, 1, 'GwMsvrO4Rl', '2025-06-01', 0, 0, 0, 1),
(215, 'marketing', 3, 4, 8, 2, 110, 0, 'GwMsvrO4Rl', '2025-06-01', 0, 0, 0, 1),
(216, 'marketing', 3, 4, 8, 1, 55, 1, 'FSImzE3WDi', '2025-06-01', 1, 0, 0, 1);

-- --------------------------------------------------------

--
-- Table structure for table `sales_credit_history`
--

CREATE TABLE `sales_credit_history` (
  `sales_credit_history_id` int(11) NOT NULL,
  `sale_tracking_Id` varchar(555) NOT NULL,
  `amount` int(11) NOT NULL,
  `creditedDate` datetime NOT NULL DEFAULT current_timestamp(),
  `isActive` int(11) NOT NULL DEFAULT 1,
  `UPI` decimal(10,2) DEFAULT 0.00,
  `Cash` decimal(10,2) DEFAULT 0.00,
  `Card` decimal(10,2) DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sales_credit_history`
--

INSERT INTO `sales_credit_history` (`sales_credit_history_id`, `sale_tracking_Id`, `amount`, `creditedDate`, `isActive`, `UPI`, `Cash`, `Card`) VALUES
(139, 'vSBJIRwTra', 100, '2025-05-25 09:44:43', 1, '0.00', '100.00', '0.00'),
(140, 'vSBJIRwTra', 30, '2025-05-25 09:53:42', 1, '0.00', '30.00', '0.00'),
(141, 'vSBJIRwTra', 30, '2025-05-25 09:54:23', 1, '0.00', '30.00', '0.00'),
(142, '1Iya6NyflS', 450, '2025-05-25 10:18:49', 1, '0.00', '450.00', '0.00'),
(143, '57HJMtAfM7', 30, '2025-05-25 10:33:36', 1, '0.00', '30.00', '0.00'),
(144, '57HJMtAfM7', 30, '2025-05-25 10:34:01', 1, '0.00', '30.00', '0.00'),
(145, '57HJMtAfM7', 190, '2025-05-25 10:37:22', 1, '0.00', '190.00', '0.00'),
(147, 'TsztC3jbfe', 120, '2025-05-31 22:06:29', 1, '0.00', '0.00', '0.00'),
(148, 'TsztC3jbfe', 4, '2025-05-31 22:09:52', 1, '0.00', '4.00', '0.00'),
(149, '2FQuupUkDw', 621, '2025-05-31 22:33:20', 1, '0.00', '0.00', '0.00'),
(150, 'grg5QhrGx0', 581, '2025-05-31 22:34:09', 1, '0.00', '0.00', '0.00'),
(151, 'uRV6yG12Gi', 920, '2025-06-01 06:57:31', 1, '20.00', '900.00', '0.00'),
(152, '25UZNn86dW', 871, '2025-06-01 07:04:40', 1, '0.00', '871.00', '0.00'),
(153, 'uRV6yG12Gi', 2000, '2025-06-01 07:06:52', 1, '0.00', '2000.00', '0.00'),
(154, 'pDqyvDI09s', 10, '2025-06-01 07:25:11', 1, '0.00', '0.00', '0.00'),
(155, 'pDqyvDI09s', 10, '2025-06-01 07:34:12', 1, '0.00', '10.00', '0.00'),
(156, 'pDqyvDI09s', 3, '2025-06-01 07:34:21', 1, '0.00', '0.00', '3.00'),
(157, 'jBr20sxBge', 650, '2025-06-01 08:32:43', 1, '50.00', '600.00', '0.00'),
(158, 'MqNm5c4Lp3', 12, '2025-06-01 08:36:44', 1, '0.00', '12.00', '0.00'),
(159, '2MXToIFowX', 10, '2025-06-01 08:40:28', 1, '0.00', '10.00', '0.00'),
(160, '5Fs6klF4y2', 12, '2025-06-01 08:42:47', 1, '0.00', '12.00', '0.00'),
(161, 'PqVuuQKRMW', 21, '2025-06-01 08:44:45', 1, '0.00', '21.00', '0.00'),
(162, 'IEFBzNHe0F', 10, '2025-06-01 08:45:20', 1, '0.00', '10.00', '0.00'),
(163, 'hsqjZCGFpF', 1400, '2025-06-01 08:50:33', 1, '400.00', '1000.00', '0.00'),
(164, 'GwMsvrO4Rl', 262, '2025-06-01 08:53:09', 1, '150.00', '100.00', '12.00'),
(165, 'FSImzE3WDi', 10, '2025-06-01 08:54:48', 1, '0.00', '10.00', '0.00');

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

--
-- Dumping data for table `stock`
--

INSERT INTO `stock` (`stock_id`, `product_id`, `price_id`, `quantity`, `Damage_Qty`, `Loss_Qty`, `added_date`, `isActive`) VALUES
(1, 3, 5, 0, 0, 0, '2025-05-05 08:32:45', 1),
(2, 4, 7, 462, 1, 0, '2025-05-11 23:59:16', 1),
(3, 1, 2, 651, 2, 0, '2025-05-11 23:59:16', 1),
(4, 2, 4, 763, 0, 0, '2025-05-11 23:59:16', 1);

-- --------------------------------------------------------

--
-- Table structure for table `stock_History`
--

CREATE TABLE `stock_History` (
  `stock_History_Id` int(11) NOT NULL,
  `stock_Id` int(11) NOT NULL,
  `Qty` int(11) NOT NULL,
  `stock_type` varchar(555) DEFAULT NULL,
  `AddedDate` date NOT NULL DEFAULT current_timestamp(),
  `AddedBy` int(11) NOT NULL DEFAULT 0,
  `CreditOrDebit` varchar(1500) NOT NULL DEFAULT 'NULL',
  `ReferenceInvoiceOrSale` varchar(1500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `stock_History`
--

INSERT INTO `stock_History` (`stock_History_Id`, `stock_Id`, `Qty`, `stock_type`, `AddedDate`, `AddedBy`, `CreditOrDebit`, `ReferenceInvoiceOrSale`) VALUES
(1, 3, -11, 'sale', '2025-04-18', 0, 'debit', '90'),
(2, 3, -112, 'sale', '2025-04-18', 0, 'debit', '91'),
(3, 3, -10, 'sale', '2025-04-18', 0, 'debit', '93'),
(4, 4, -9, 'sale', '2025-04-18', 0, 'debit', '94'),
(5, 1, 111, 'purchase', '2025-04-18', 0, 'Credit', 'WAR276'),
(6, 2, 121, 'purchase', '2025-04-18', 0, 'Credit', 'WAR276'),
(7, 1, 1, 'purchase', '2025-04-18', 0, 'Credit', 'YRYUVJHVJM176457216'),
(8, 2, 1, 'purchase', '2025-04-18', 0, 'Credit', 'YRYUVJHVJM176457216'),
(9, 4, -12, 'sale', '2025-04-30', 0, 'debit', NULL),
(10, 2, -232, 'sale', '2025-04-30', 0, 'debit', NULL),
(11, 1, -567, 'sale', '2025-04-30', 0, 'debit', 'npBzNezclG'),
(12, 4, -87, 'sale', '2025-04-30', 0, 'debit', 'npBzNezclG'),
(13, 3, -23, 'sale', '2025-04-30', 0, 'debit', 'YKQ25SNc34'),
(14, 1, -21, 'sale', '2025-04-30', 0, 'debit', 'YKQ25SNc34'),
(15, 4, -123, 'sale', '2025-04-30', 0, 'debit', '5sPD6goJGh'),
(16, 1, -145, 'sale', '2025-04-30', 0, 'debit', '5sPD6goJGh'),
(17, 1, -12, 'sale', '2025-04-30', 0, 'debit', 'R0qmns2MWU'),
(18, 4, -12, 'sale', '2025-04-30', 0, 'debit', 'R0qmns2MWU'),
(19, 3, -12, 'sale', '2025-04-30', 0, 'debit', '44gx1XxU9u'),
(20, 1, -100, 'sale', '2025-04-30', 0, 'debit', '44gx1XxU9u'),
(21, 1, 1000, 'purchase', '2025-04-30', 0, 'Credit', '12356'),
(22, 3, 105, 'purchase', '2025-04-30', 0, 'Credit', '12356'),
(23, 4, 1, 'purchase', '2025-04-30', 0, 'Credit', 'WAR276'),
(24, 3, -500, 'sale', '2025-04-30', 0, 'debit', '1yuyZYbrzr'),
(25, 3, -250, 'sale', '2025-04-30', 0, 'debit', 'hrMTpFrjBZ'),
(26, 4, 1, 'purchase', '2025-04-30', 0, 'Credit', '12356'),
(27, 4, 10001, 'purchase', '2025-04-30', 0, 'Credit', '12356'),
(28, 2, 1000, 'purchase', '2025-04-30', 0, 'Credit', '12356'),
(29, 4, -13, 'sale', '2025-05-05', 0, 'debit', 'Yv3Jzi0ouT'),
(30, 4, -100, 'sale', '2025-05-05', 0, 'debit', 'AIeAjRl2f3'),
(31, 3, -12, 'sale', '2025-05-05', 0, 'debit', '624yy3uU7x'),
(32, 3, -12, 'sale', '2025-05-05', 0, 'debit', '8UbwPpXryz'),
(33, 2, 1, 'purchase', '2025-05-05', 0, 'Credit', '12356'),
(34, 3, 2, 'purchase', '2025-05-05', 0, 'Credit', '12356'),
(35, 2, 1, 'purchase', '2025-05-05', 0, 'Credit', '12356'),
(36, 2, 10, 'purchase', '2025-05-05', 0, 'Credit', '12356'),
(37, 1, 4000, 'replacement', '2025-05-06', 0, 'Debit', '332'),
(38, 2, 1000, 'replacement', '2025-05-06', 0, 'Debit', '332'),
(39, 1, 1, 'damage', '2025-05-06', 0, 'Debit', '32'),
(40, 2, 1000, 'replacement', '2025-05-06', 0, 'Debit', '98'),
(41, 3, 500, 'replacement', '2025-05-06', 0, 'Debit', '64646'),
(42, 1, 500, 'replacement', '2025-05-06', 0, 'Debit', '33223'),
(43, 1, 400, 'replacement', '2025-05-06', 0, 'Debit', '2332'),
(44, 2, 100, 'replacement', '2025-05-06', 0, 'Debit', 'FREE-REPL-1746514495338'),
(45, 2, 100, 'replacement', '2025-05-06', 0, 'Debit', 'FREE-REPL-1746514509283'),
(46, 3, 100, 'replacement', '2025-05-06', 0, 'Debit', 'FREE-REPL-1746514538005'),
(47, 1, 99, 'replacement', '2025-05-06', 0, 'Debit', 'FREE-REPL-1746514553784'),
(48, 4, 1, 'replacement', '2025-05-06', 0, 'Debit', 'FREE-REPL-1746514553784'),
(49, 2, 10, 'replacement', '2025-05-06', 0, 'Debit', 'FREE-REPL-1746514563514'),
(50, 3, 100, 'replacement', '2025-05-06', 0, 'Debit', 'FREE-REPL-1746514575022'),
(51, 2, 89, 'replacement', '2025-05-06', 0, 'Debit', 'FREE-REPL-1746514575022'),
(52, 1, 1, 'replacement', '2025-05-06', 0, 'Debit', 'FREE-REPL-1746514575022'),
(53, 2, 1, 'replacement', '2025-05-06', 0, 'Debit', 'FREE-REPL-1746514610855'),
(54, 1, 10, 'replacement', '2025-05-06', 0, 'Debit', 'FREE-REPL-1746515196090'),
(55, 1, 2, 'replacement', '2025-05-06', 0, 'Debit', 'FREE-REPL-1746515248098'),
(56, 1, 7, 'replacement', '2025-05-06', 0, 'Debit', 'FREE-REPL-1746515902141'),
(57, 1, 1900, 'purchase', '2025-05-06', 0, 'Credit', 'ABC11233156'),
(58, 1, 1, 'replacement', '2025-05-06', 0, 'Debit', 'FREE-REPL-1746516167017'),
(59, 4, -230, 'sale', '2025-05-06', 0, 'debit', 'F8tcKTgrkC'),
(60, 1, -10, 'sale', '2025-05-06', 0, 'debit', 'tp4ebZEkDF'),
(61, 2, 1, 'replacement', '2025-05-06', 0, 'Debit', 'FREE-REPL-1746517043028'),
(62, 1, 2, 'replacement', '2025-05-06', 0, 'Debit', 'FREE-REPL-1746517317649'),
(63, 3, -6, 'sale', '2025-05-06', 0, 'debit', 'tVdWM5BS2A'),
(64, 1, 100, 'purchase', '2025-05-08', 0, 'Credit', 'WAR276'),
(65, 3, -12, 'sale', '2025-05-08', 0, 'debit', 'ctxanHNLJu'),
(66, 1, 1000, 'purchase', '2025-05-12', 0, 'Credit', '12356'),
(67, 2, 1000, 'purchase', '2025-05-12', 0, 'Credit', '12356'),
(68, 4, 500, 'purchase', '2025-05-12', 0, 'Credit', '12356'),
(69, 3, -12, 'sale', '2025-05-13', 0, 'debit', '4hOH43Cqle'),
(70, 3, -3, 'sale', '2025-05-31', 0, 'debit', 'TsztC3jbfe'),
(71, 4, -1, 'sale', '2025-05-31', 0, 'debit', 'TsztC3jbfe'),
(72, 3, -23, 'sale', '2025-05-31', 0, 'debit', '2FQuupUkDw'),
(73, 3, -21, 'sale', '2025-05-31', 0, 'debit', 'grg5QhrGx0'),
(74, 1, 2, 'replacement', '2025-06-01', 0, 'Debit', 'FREE-REPL-1748741891133'),
(75, 3, -1, 'sale', '2025-06-01', 0, 'debit', 'pDqyvDI09s');

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

--
-- Dumping data for table `suppliers`
--

INSERT INTO `suppliers` (`supplier_id`, `supplier_name`, `added_Date`, `contact_number`, `email_Id`, `Address`, `isActive`) VALUES
(1, 'sa', '2025-04-15 10:21:40', '09496873618', 'ani@gmail.com', 'Vilayil Puthen Veedu', 1),
(2, 'TT Agency', '2025-04-18 20:20:52', '09496873618', 'tt@gmail.com', 'Vilayil Puthen Veedu', 1);

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
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `profile_avathar`, `name`, `role`, `phone`, `email`, `password_hash`, `created_at`, `Place_Of_Allocation`, `isActive`) VALUES
(1, 'https://www.shareicon.net/data/512x512/2016/05/24/770117_people_512x512.png', 'ANISH S NAIR', 'admin', '09496873618', 'anish@gmail.com', '$2b$10$UF39jT8zQLv0addmBHB6JefKYGqXT928I3A5/IV5C9dqJmGQB6jOK', '2025-04-15 04:55:24', 'Pandalam', 1),
(3, 'https://www.shareicon.net/data/512x512/2016/05/24/770117_people_512x512.png', 'Kavya M Nair', 'staff', '9526674440', 'kavya@gmail.com', '$2b$10$JmoVTa.Cu9D7qwU4.NIsD.e2DKkG5uiTOgq5nvv.FkHbJc8pK3cUO', '2025-04-17 11:30:42', 'Pandalam', 1),
(4, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTz_8dYkmPhhETAYJMKE2aSjA7RhjRbp8Vecg&s', 'Syama', 'marketing_staff', '9497888736', 'aa@gmail.com', '$2b$10$6yqONHIqy7UF.UaklWSAXOF9vJuhts54//ME.bH4lcr1h2iIazIUy', '2025-04-30 09:06:49', 'Home', 1);

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
-- Indexes for table `Customers`
--
ALTER TABLE `Customers`
  ADD PRIMARY KEY (`id`);

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
-- AUTO_INCREMENT for table `Customers`
--
ALTER TABLE `Customers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT for table `daily_stock_allocation`
--
ALTER TABLE `daily_stock_allocation`
  MODIFY `daily_stock_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=166;

--
-- AUTO_INCREMENT for table `final_sale`
--
ALTER TABLE `final_sale`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=150;

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=55;

--
-- AUTO_INCREMENT for table `returns`
--
ALTER TABLE `returns`
  MODIFY `return_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Salary`
--
ALTER TABLE `Salary`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sales`
--
ALTER TABLE `sales`
  MODIFY `sale_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=217;

--
-- AUTO_INCREMENT for table `sales_credit_history`
--
ALTER TABLE `sales_credit_history`
  MODIFY `sales_credit_history_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=166;

--
-- AUTO_INCREMENT for table `stock`
--
ALTER TABLE `stock`
  MODIFY `stock_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `stock_History`
--
ALTER TABLE `stock_History`
  MODIFY `stock_History_Id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=76;

--
-- AUTO_INCREMENT for table `suppliers`
--
ALTER TABLE `suppliers`
  MODIFY `supplier_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `credits`
--
ALTER TABLE `credits`
  ADD CONSTRAINT `credits_ibfk_1` FOREIGN KEY (`marketing_staff_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `credits_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE;

--
-- Constraints for table `daily_stock_allocation`
--
ALTER TABLE `daily_stock_allocation`
  ADD CONSTRAINT `daily_stock_allocation_ibfk_1` FOREIGN KEY (`marketing_staff_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `daily_stock_allocation_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE;

--
-- Constraints for table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `products_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `products_ibfk_2` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`brand_id`) ON DELETE SET NULL;

--
-- Constraints for table `product_prices`
--
ALTER TABLE `product_prices`
  ADD CONSTRAINT `product_prices_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE;

--
-- Constraints for table `purchase`
--
ALTER TABLE `purchase`
  ADD CONSTRAINT `fk_purchase_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `purchase_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`);

--
-- Constraints for table `returns`
--
ALTER TABLE `returns`
  ADD CONSTRAINT `returns_ibfk_1` FOREIGN KEY (`marketing_staff_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `returns_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE;

--
-- Constraints for table `sales`
--
ALTER TABLE `sales`
  ADD CONSTRAINT `sales_ibfk_1` FOREIGN KEY (`marketing_staff_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `sales_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `sales_ibfk_3` FOREIGN KEY (`price_id`) REFERENCES `product_prices` (`price_id`) ON DELETE CASCADE;

--
-- Constraints for table `stock`
--
ALTER TABLE `stock`
  ADD CONSTRAINT `stock_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `stock_ibfk_2` FOREIGN KEY (`price_id`) REFERENCES `product_prices` (`price_id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
