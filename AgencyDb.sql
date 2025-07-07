-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Jul 07, 2025 at 06:38 PM
-- Server version: 10.4.28-MariaDB
-- PHP Version: 8.2.4

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
(165, 3, 4, 1, '2025-06-01', 1, 1),
(166, 1, 1, 0, '2025-06-23', 1, 1),
(167, 1, 4, 0, '2025-06-23', 1, 1),
(168, 1, 1, 7, '2025-06-30', 1, 1);

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
  `OtherExpenses` decimal(10,2) DEFAULT 0.00,
  `isGstBilling` tinyint(1) NOT NULL DEFAULT 0,
  `customerGstNumber` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `final_sale`
--

INSERT INTO `final_sale` (`id`, `sale_tracking_Id`, `TotalAmount`, `UserId`, `DateofTransaction`, `isSettled`, `AmountPaid`, `FuelExpenses`, `VehcileServiceExpenses`, `OtherExpenses`, `isGstBilling`, `customerGstNumber`) VALUES
(131, 'vSBJIRwTra', 260, 1, '2025-05-25', 0, 160, 30.00, 40.00, 30.00, 0, NULL),
(132, '57HJMtAfM7', 260, 1, '2025-05-25', 0, 250, 10.00, 0.00, 0.00, 0, NULL),
(133, '1Iya6NyflS', 260, 1, '2025-05-25', 1, 450, 0.00, 10.00, 0.00, 0, NULL),
(135, 'TsztC3jbfe', 124, 23, '2025-05-31', 0, 124, 0.00, 0.00, 0.00, 0, NULL),
(136, '2FQuupUkDw', 621, 17, '2025-05-31', 1, 621, 0.00, 0.00, 0.00, 0, NULL),
(137, 'grg5QhrGx0', 588, 23, '2025-05-31', 0, 581, 0.00, 0.00, 0.00, 0, NULL),
(138, 'uRV6yG12Gi', 3120, 1, '2025-06-01', 0, 2920, 100.00, 0.00, 0.00, 0, NULL),
(139, '25UZNn86dW', 972, 1, '2025-06-01', 1, 871, 100.00, 0.00, 0.00, 0, NULL),
(140, 'pDqyvDI09s', 27, 24, '2025-06-01', 0, 23, 0.00, 0.00, 0.00, 0, NULL),
(141, 'jBr20sxBge', 832, 1, '2025-06-01', 0, 650, 100.00, 0.00, 0.00, 0, NULL),
(142, 'MqNm5c4Lp3', 312, 1, '2025-06-01', 0, 12, 11.00, 0.00, 0.00, 0, NULL),
(143, '2MXToIFowX', 806, 1, '2025-06-01', 0, 10, 0.00, 0.00, 0.00, 0, NULL),
(144, '5Fs6klF4y2', 26, 1, '2025-06-01', 0, 12, 10.00, 0.00, 0.00, 0, NULL),
(145, 'PqVuuQKRMW', 312, 1, '2025-06-01', 0, 21, 12.00, 0.00, 0.00, 0, NULL),
(146, 'IEFBzNHe0F', 26, 3, '2025-06-01', 0, 10, 10.00, 0.00, 0.00, 0, NULL),
(147, 'hsqjZCGFpF', 1577, 3, '2025-06-01', 1, 1400, 100.00, 30.00, 31.00, 0, NULL),
(148, 'GwMsvrO4Rl', 396, 3, '2025-06-01', 1, 262, 100.00, 21.00, 0.00, 0, NULL),
(149, 'FSImzE3WDi', 55, 3, '2025-06-01', 0, 10, 0.00, 0.00, 0.00, 0, NULL),
(150, 'TYDvIYqfdP', 3700, 1, '2025-06-23', 1, 3496, 100.00, 3.00, 3.00, 0, NULL),
(151, 'fzv6MVM3eR', 137, 24, '2025-06-23', 0, 100, 0.00, 0.00, 0.00, 0, NULL),
(152, 'Vgh5KRUk3r', 137, 24, '2025-06-23', 0, 100, 0.00, 0.00, 0.00, 0, NULL),
(153, '6x5Wd8lyp6', 137, 24, '2025-06-23', 0, 100, 0.00, 0.00, 0.00, 0, NULL),
(154, 'ZVjzDC5jL0', 55, 18, '2025-06-23', 0, 50, 0.00, 0.00, 0.00, 0, NULL),
(155, 'IpPqRrL4sB', 404.25, 23, '2025-06-23', 0, 250, 0.00, 0.00, 0.00, 0, NULL),
(156, 'O0XQlQbBFQ', 717.75, 23, '2025-06-23', 0, 120, 0.00, 0.00, 0.00, 0, NULL),
(157, 'tqXdWb7VfO', 346.5, 23, '2025-06-23', 0, 321, 0.00, 0.00, 0.00, 0, NULL),
(158, 'rBSEgkuTky', 346.5, 23, '2025-06-23', 0, 12, 0.00, 0.00, 0.00, 0, NULL),
(159, 'hJGA56QTw2', 330, 23, '2025-06-23', 0, 223, 0.00, 0.00, 0.00, 0, NULL),
(160, '0AuqVpwjgv', 94.88, 23, '2025-06-23', 0, 94.88, 0.00, 0.00, 0.00, 0, NULL),
(161, '2JsL9GjUgh', 28.88, 23, '2025-06-23', 0, 21, 0.00, 0.00, 0.00, 0, NULL),
(162, '35vbngbMxD', 28.88, 23, '2025-06-23', 0, 1, 0.00, 0.00, 0.00, 0, NULL),
(163, 'kR2ycFQZCE', 28.88, 23, '2025-06-23', 0, 12, 0.00, 0.00, 0.00, 0, NULL),
(164, 'iFDo5E5TQf', 66, 23, '2025-06-23', 0, 12, 0.00, 0.00, 0.00, 0, NULL),
(165, 'yK8hVS9cVv', 28.35, 17, '2025-06-23', 0, 25, 0.00, 0.00, 0.00, 0, NULL),
(166, 'Obcae5xSzI', 28.35, 17, '2025-06-23', 0, 25, 0.00, 0.00, 0.00, 0, NULL),
(167, 'UdcfIfJ3sO', 57.75, 23, '2025-06-23', 0, 57, 0.00, 0.00, 0.00, 0, NULL),
(168, 'nIRaiEd4vh', 28.88, 17, '2025-06-23', 0, 1, 0.00, 0.00, 0.00, 0, NULL),
(169, 'uQum9u6Qpr', 28.35, 17, '2025-06-23', 0, 1, 0.00, 0.00, 0.00, 0, NULL),
(170, 'bOX9ejhyhC', 28.35, 17, '2025-06-23', 0, 1, 0.00, 0.00, 0.00, 0, NULL),
(171, 'TISYIzJl2K', 340.2, 18, '2025-06-23', 0, 123, 0.00, 0.00, 0.00, 0, NULL),
(172, 'ENStYoyCqy', 28.88, 23, '2025-06-23', 0, 28, 0.00, 0.00, 0.00, 0, NULL),
(173, 'T4tcSuQqVD', 28.88, 23, '2025-06-23', 0, 10, 0.00, 0.00, 0.00, 0, NULL),
(174, 'HID2pyh3bl', 28.88, 23, '2025-06-23', 0, 10, 0.00, 0.00, 0.00, 0, NULL),
(175, 'BhGN9xmAbI', 888.5, 23, '2025-06-23', 0, 888.5, 0.00, 0.00, 0.00, 0, NULL),
(176, '2ayHlHnVBt', 28.88, 17, '2025-06-23', 0, 1, 0.00, 0.00, 0.00, 0, NULL),
(177, 'xhinu674Sh', 81, 1, '2025-06-30', 0, 80, 0.00, 0.00, 0.00, 0, NULL),
(178, 'UeTX4wt8Tm', 652.05, 23, '2025-06-30', 0, 600, 0.00, 0.00, 0.00, 0, NULL),
(179, 'N35Qcu401m', 340.2, 23, '2025-06-30', 0, 234, 0.00, 0.00, 0.00, 0, NULL),
(180, 'rE4UkZLTkY', 340.2, 17, '2025-06-30', 0, 34, 0.00, 0.00, 0.00, 0, NULL),
(181, 'hODeKJY8Nc', 340.2, 17, '2025-06-30', 0, 300, 0.00, 0.00, 0.00, 0, NULL),
(182, 'NJPfUwakhm', 570.2, 17, '2025-06-30', 0, 250, 0.00, 0.00, 0.00, 0, NULL),
(183, 'bRAISZtOAj', 652.05, 17, '2025-06-30', 0, 123, 0.00, 0.00, 0.00, 0, NULL),
(184, 'CAecIDDfAk', 340.2, 17, '2025-06-30', 0, 234, 0.00, 0.00, 0.00, 0, NULL),
(185, 'Cc5kyQFvYK', 340.2, 18, '2025-06-30', 0, 212, 0.00, 0.00, 0.00, 0, NULL),
(186, 'gwBMVH9RUZ', 2069.55, 17, '2025-06-30', 0, 767, 0.00, 0.00, 0.00, 0, NULL),
(187, '9UUuxSWnwK', 2107.88, 17, '2025-06-30', 0, 123, 0.00, 0.00, 0.00, 0, NULL),
(188, 'NW1vdpZ6qE', 2007.5, 17, '2025-06-30', 0, 1000, 0.00, 0.00, 0.00, 0, NULL),
(189, 'mOZMnr5bOx', 2007.5, 18, '2025-06-30', 0, 123, 0.00, 0.00, 0.00, 0, NULL),
(190, 'JoDAoEUGev', 2508, 17, '2025-06-30', 0, 123, 0.00, 0.00, 0.00, 0, NULL),
(191, 'qhwLMi2PgS', 820, 17, '2025-06-30', 0, 123, 0.00, 0.00, 0.00, 0, NULL),
(192, 'sgPnsFWZt5', 270, 17, '2025-06-30', 0, 212, 0.00, 0.00, 0.00, 0, NULL),
(193, 'CGKsrqxrB0', 324, 17, '2025-06-30', 0, 12, 0.00, 0.00, 0.00, 0, NULL),
(194, 'tAnPBkfn86', 935, 17, '2025-06-30', 0, 78, 0.00, 0.00, 0.00, 0, NULL),
(195, 'S2dq22EuGr', 324, 17, '2025-06-30', 0, 123, 0.00, 0.00, 0.00, 0, NULL),
(196, 'fPBApCSIUy', 324, 17, '2025-06-30', 0, 32, 0.00, 0.00, 0.00, 0, NULL),
(197, 'TeQkY08aTi', 1161, 17, '2025-06-30', 0, 1123, 0.00, 0.00, 0.00, 0, NULL),
(198, 'gMiLSwwPg0', 351, 17, '2025-07-01', 0, 250, 0.00, 0.00, 0.00, 0, NULL),
(199, 'myaKFKkeeq', 135, 23, '2025-07-01', 0, 5, 0.00, 0.00, 0.00, 0, NULL);

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
(1, 'Milk 500ml Cover', 1, 1, 27.50, 'kjshbkjsd', 1, 'https://i.ytimg.com/vi/A9XhWTry3ks/hqdefault.jpg', '2025-04-15 04:52:23', 1),
(2, 'Pakkavada', 2, 2, 55.00, 'frfrf', 1, 'https://i.ytimg.com/vi/A9XhWTry3ks/hqdefault.jpg', '2025-04-15 05:26:02', 1),
(3, 'Muruku Packet', 2, 2, 60.00, 'bjbk', 5, 'https://i.ytimg.com/vi/A9XhWTry3ks/hqdefault.jpg', '2025-04-17 09:33:13', 1),
(4, 'Mixture ', 2, 2, 60.00, ',kbnkj', 1, 'https://i.ytimg.com/vi/A9XhWTry3ks/hqdefault.jpg', '2025-04-17 11:32:56', 1),
(5, 'Banana Chips', 2, 2, 89.00, 'kjbgjhkb', 30, 'https://i.ytimg.com/vi/A9XhWTry3ks/hqdefault.jpg', '2025-04-18 14:46:12', 1);

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
  `isActive` int(11) NOT NULL DEFAULT 1,
  `cgst_percentage` decimal(5,2) NOT NULL DEFAULT 0.00,
  `sgst_percentage` decimal(5,2) NOT NULL DEFAULT 0.00,
  `igst_percentage` decimal(5,2) NOT NULL DEFAULT 0.00,
  `cess_percentage` decimal(5,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `product_prices`
--

INSERT INTO `product_prices` (`price_id`, `product_id`, `purchase_price`, `commision_rate`, `marketing_selling_price`, `direct_selling_price`, `whole_sale_price`, `effective_date`, `isActive`, `cgst_percentage`, `sgst_percentage`, `igst_percentage`, `cess_percentage`) VALUES
(1, 1, 0.00, 0.5, 28.00, 28.00, 0, '2025-04-15', 0, 0.00, 0.00, 0.00, 0.00),
(2, 1, 24.00, 0.5, 26.00, 28.00, 0, '2025-04-14', 0, 0.00, 0.00, 0.00, 0.00),
(3, 2, 0.00, 2, 45.00, 45.00, 0, '2025-04-15', 0, 0.00, 0.00, 0.00, 0.00),
(4, 2, 34.00, 2, 40.00, 44.00, 0, '2025-04-14', 0, 0.00, 0.00, 0.00, 0.00),
(5, 3, 0.00, 3, 50.00, 50.00, 0, '2025-04-17', 0, 0.00, 0.00, 0.00, 0.00),
(6, 3, 45.00, 3, 47.00, 49.00, 0, '2025-04-16', 0, 0.00, 0.00, 0.00, 0.00),
(7, 4, 0.00, 1, 60.00, 60.00, 0, '2025-04-17', 0, 0.00, 0.00, 0.00, 0.00),
(8, 4, 55.00, 1, 55.00, 60.00, 55, '2025-04-16', 0, 0.00, 0.00, 0.00, 0.00),
(9, 3, 45.00, 3, 47.00, 49.00, 43, '2025-04-15', 0, 0.00, 0.00, 0.00, 0.00),
(10, 2, 34.00, 2, 40.00, 44.00, 43, '2025-04-13', 0, 0.00, 0.00, 0.00, 0.00),
(11, 1, 24.00, 0.5, 26.00, 28.00, 27, '2025-04-13', 0, 0.00, 0.00, 0.00, 0.00),
(14, 1, 24.00, 0.5, 26.00, 28.00, 27, '2025-06-23', 0, 0.00, 0.00, 0.00, 0.00),
(15, 1, 24.00, 0.5, 27.00, 27.50, 27, '2025-06-23', 0, 0.00, 0.00, 0.00, 0.00),
(16, 1, 24.00, 0.5, 27.00, 27.50, 27, '2025-06-23', 1, 2.50, 2.50, 0.00, 0.00),
(17, 2, 34.00, 2, 40.00, 44.00, 43, '2025-06-23', 1, 7.50, 7.50, 0.00, 0.00),
(18, 3, 45.00, 3, 47.00, 49.00, 43, '2025-04-23', 1, 9.00, 9.00, 0.00, 0.00),
(19, 4, 55.00, 1, 55.00, 60.00, 55, '2025-04-23', 1, 5.00, 5.00, 0.00, 0.00);

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
  `is_free_replacement` tinyint(1) DEFAULT 0,
  `is_freebie` tinyint(1) DEFAULT 0,
  `related_purchase_id` int(11) DEFAULT NULL,
  `compensation_type` varchar(50) DEFAULT NULL,
  `compensation_details` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `purchase`
--

INSERT INTO `purchase` (`id`, `product_id`, `purchase_date`, `purchase_price`, `total_amount`, `quantity`, `Invoice_Number`, `supplier_id`, `isActive`, `AddedDate`, `is_damaged`, `damage_description`, `replacement_provided`, `replacement_date`, `is_free_replacement`, `is_freebie`, `related_purchase_id`, `compensation_type`, `compensation_details`) VALUES
(68, 1, '2025-06-30', 24.00, 240, 10, '13', 1, 1, '2025-06-30', 0, NULL, 0, NULL, 0, 0, NULL, NULL, NULL),
(69, 1, '2025-06-30', 24.00, 240, 10, '21', 2, 1, '2025-06-30', 0, NULL, 0, NULL, 0, 0, NULL, NULL, NULL),
(70, 2, '2025-06-30', 34.00, 340, 10, '21', 2, 1, '2025-06-30', 0, NULL, 0, NULL, 0, 0, NULL, NULL, NULL),
(71, 1, '2025-06-30', 24.00, 2400, 100, '322', 2, 1, '2025-06-30', 0, NULL, 0, NULL, 0, 0, NULL, NULL, NULL),
(72, 1, '2025-06-30', 0.00, 0, 100, '322', 2, 1, '2025-06-30', 0, NULL, 0, NULL, 0, 1, NULL, NULL, NULL),
(73, 3, '2025-06-30', 45.00, 450, 10, '322', 2, 1, '2025-06-30', 0, NULL, 0, NULL, 0, 0, NULL, NULL, NULL),
(74, 3, '2025-06-30', 0.00, 0, 5, '322', 2, 1, '2025-06-30', 0, NULL, 0, NULL, 0, 1, NULL, NULL, NULL),
(75, 4, '2025-06-30', 0.00, 0, 1, '675', 2, 1, '2025-06-30', 0, NULL, 1, '2025-06-30', 1, 0, NULL, NULL, NULL),
(76, 3, '2025-06-30', 45.00, 450, 10, 'HGFHG12', 1, 1, '2025-06-30', 0, NULL, 0, NULL, 0, 0, NULL, NULL, NULL),
(77, 3, '2025-06-30', 0.00, 0, 10, 'HGFHG12', 1, 1, '2025-06-30', 0, NULL, 0, NULL, 0, 1, NULL, NULL, NULL),
(78, 4, '2025-06-30', 55.00, 5500, 100, 'HGFHG12', 1, 1, '2025-06-30', 0, NULL, 0, NULL, 0, 0, NULL, NULL, NULL),
(79, 4, '2025-06-30', 0.00, 0, 50, 'HGFHG12', 1, 1, '2025-06-30', 0, NULL, 0, NULL, 0, 1, NULL, NULL, NULL),
(80, 2, '2025-06-30', 34.00, 3400, 100, '979', 2, 1, '2025-06-30', 0, NULL, 0, NULL, 0, 0, NULL, NULL, NULL),
(81, 2, '2025-06-30', 0.00, 0, 50, '979', 2, 1, '2025-06-30', 0, NULL, 0, NULL, 0, 1, NULL, NULL, NULL),
(82, 3, '2025-06-30', 45.00, 4500, 100, '979', 2, 1, '2025-06-30', 0, NULL, 0, NULL, 0, 0, NULL, NULL, NULL),
(83, 3, '2025-06-30', 0.00, 0, 100, '979', 2, 1, '2025-06-30', 0, NULL, 0, NULL, 0, 1, NULL, NULL, NULL),
(84, 1, '2025-06-30', 0.00, 0, 100, '979', 2, 1, '2025-06-30', 0, NULL, 1, '2025-06-30', 1, 0, NULL, NULL, NULL),
(85, 3, '2025-06-30', 0.00, 0, 1, '12', 1, 1, '2025-06-30', 0, NULL, 1, '2025-06-30', 1, 0, NULL, NULL, NULL),
(86, 1, '2025-06-30', 24.00, 48, 2, '678vhgj', 2, 1, '2025-06-30', 1, 'test', 0, NULL, 0, 0, NULL, NULL, NULL),
(90, 1, '2025-06-30', 0.00, 0, 2, '87578', 2, 1, '2025-06-30', 0, NULL, 1, '2025-06-30', 1, 0, NULL, NULL, NULL),
(91, 1, '2025-06-30', 0.00, 0, 10, '87578', 2, 1, '2025-06-30', 0, NULL, 1, '2025-06-30', 1, 0, NULL, NULL, NULL);

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
(216, 'marketing', 3, 4, 8, 1, 55, 1, 'FSImzE3WDi', '2025-06-01', 1, 0, 0, 1),
(217, 'marketing', 1, 1, 11, 100, 2600, 0, 'TYDvIYqfdP', '2025-06-23', 0, 0, 0, 1),
(218, 'marketing', 1, 4, 8, 20, 1100, 0, 'TYDvIYqfdP', '2025-06-23', 0, 0, 0, 1),
(219, 'wholesale', 1, 1, 16, 1, 27, 0, 'fzv6MVM3eR', '2025-06-23', 0, 0, 0, 1),
(220, 'wholesale', 1, 4, 19, 2, 110, 0, 'fzv6MVM3eR', '2025-06-23', 0, 0, 0, 1),
(221, 'wholesale', 1, 1, 16, 1, 27, 0, 'Vgh5KRUk3r', '2025-06-23', 0, 0, 0, 1),
(222, 'wholesale', 1, 4, 19, 2, 110, 0, 'Vgh5KRUk3r', '2025-06-23', 0, 0, 0, 1),
(223, 'wholesale', 1, 1, 16, 1, 27, 0, '6x5Wd8lyp6', '2025-06-23', 0, 0, 0, 1),
(224, 'wholesale', 1, 4, 19, 2, 110, 0, '6x5Wd8lyp6', '2025-06-23', 0, 0, 0, 1),
(225, 'direct', 1, 1, 16, 2, 55, 0, 'ZVjzDC5jL0', '2025-06-23', 0, 0, 0, 1),
(226, 'direct', 1, 1, 16, 14, 385, 0, 'IpPqRrL4sB', '2025-06-23', 0, 0, 0, 1),
(227, 'direct', 1, 1, 16, 2, 55, 0, 'O0XQlQbBFQ', '2025-06-23', 0, 0, 0, 1),
(228, 'direct', 1, 4, 19, 10, 600, 0, 'O0XQlQbBFQ', '2025-06-23', 0, 0, 0, 1),
(229, 'direct', 1, 1, 16, 12, 330, 0, 'tqXdWb7VfO', '2025-06-23', 0, 0, 0, 1),
(230, 'direct', 1, 1, 16, 12, 330, 0, 'rBSEgkuTky', '2025-06-23', 0, 0, 0, 1),
(231, 'direct', 1, 1, 16, 12, 330, 0, 'hJGA56QTw2', '2025-06-23', 0, 0, 0, 1),
(232, 'direct', 1, 1, 16, 1, 27.5, 0, '0AuqVpwjgv', '2025-06-23', 0, 0, 0, 1),
(233, 'direct', 1, 4, 19, 1, 60, 0, '0AuqVpwjgv', '2025-06-23', 0, 0, 0, 1),
(234, 'direct', 1, 1, 16, 1, 27.5, 0, '2JsL9GjUgh', '2025-06-23', 0, 0, 0, 1),
(235, 'direct', 1, 1, 16, 1, 27.5, 0, '35vbngbMxD', '2025-06-23', 0, 0, 0, 1),
(236, 'direct', 1, 1, 16, 1, 27.5, 0, 'kR2ycFQZCE', '2025-06-23', 0, 0, 0, 1),
(237, 'direct', 1, 4, 19, 1, 60, 0, 'iFDo5E5TQf', '2025-06-23', 0, 0, 0, 1),
(238, 'wholesale', 1, 1, 16, 1, 27, 0, 'yK8hVS9cVv', '2025-06-23', 0, 0, 0, 1),
(239, 'wholesale', 1, 1, 16, 1, 27, 0, 'Obcae5xSzI', '2025-06-23', 0, 0, 0, 1),
(240, 'direct', 1, 1, 16, 2, 55, 0, 'UdcfIfJ3sO', '2025-06-23', 0, 0, 0, 1),
(241, 'direct', 1, 1, 16, 1, 27.5, 0, 'nIRaiEd4vh', '2025-06-23', 0, 0, 0, 1),
(242, 'wholesale', 1, 1, 16, 1, 27, 0, 'uQum9u6Qpr', '2025-06-23', 0, 0, 0, 1),
(243, 'wholesale', 1, 1, 16, 1, 27, 0, 'bOX9ejhyhC', '2025-06-23', 0, 0, 0, 1),
(244, 'wholesale', 1, 1, 16, 12, 324, 0, 'TISYIzJl2K', '2025-06-23', 0, 0, 0, 1),
(245, 'direct', 1, 1, 16, 1, 27.5, 0, 'ENStYoyCqy', '2025-06-23', 0, 0, 0, 1),
(246, 'direct', 1, 1, 16, 1, 27.5, 0, 'T4tcSuQqVD', '2025-06-23', 0, 0, 0, 1),
(247, 'direct', 1, 1, 16, 1, 27.5, 0, 'HID2pyh3bl', '2025-06-23', 0, 0, 0, 1),
(248, 'wholesale', 1, 1, 16, 10, 270, 0, 'BhGN9xmAbI', '2025-06-23', 0, 0, 0, 1),
(249, 'wholesale', 1, 4, 19, 10, 550, 0, 'BhGN9xmAbI', '2025-06-23', 0, 0, 0, 1),
(250, 'direct', 1, 1, 16, 1, 27.5, 0, '2ayHlHnVBt', '2025-06-23', 0, 0, 0, 1),
(251, 'marketing', 1, 1, 16, 3, 81, 1, 'xhinu674Sh', '2025-06-30', 5, 0, 0, 1),
(252, 'wholesale', 1, 1, 16, 23, 621, 0, 'UeTX4wt8Tm', '2025-06-30', 0, 0, 0, 1),
(253, 'home_marketing', 1, 1, 16, 12, 324, 0, 'N35Qcu401m', '2025-06-30', 0, 0, 0, 1),
(254, 'home_marketing', 1, 1, 16, 12, 324, 0, 'rE4UkZLTkY', '2025-06-30', 0, 0, 0, 1),
(255, 'wholesale', 1, 1, 16, 12, 324, 0, 'hODeKJY8Nc', '2025-06-30', 0, 0, 0, 1),
(256, 'home_marketing', 1, 1, 16, 12, 324, 0, 'NJPfUwakhm', '2025-06-30', 0, 0, 0, 1),
(257, 'home_marketing', 1, 2, 17, 5, 215, 0, 'NJPfUwakhm', '2025-06-30', 0, 0, 0, 1),
(258, 'wholesale', 1, 1, 16, 23, 621, 0, 'bRAISZtOAj', '2025-06-30', 0, 0, 0, 1),
(259, 'home_marketing', 1, 1, 16, 12, 324, 0, 'CAecIDDfAk', '2025-06-30', 0, 0, 0, 1),
(260, 'home_marketing', 1, 1, 16, 12, 324, 0, 'Cc5kyQFvYK', '2025-06-30', 0, 0, 0, 1),
(261, 'home_marketing', 1, 1, 16, 73, 1971, 0, 'gwBMVH9RUZ', '2025-06-30', 0, 0, 0, 1),
(262, 'direct', 1, 1, 16, 73, 2007.5, 0, '9UUuxSWnwK', '2025-06-30', 0, 0, 0, 1),
(263, 'direct', 1, 1, 16, 73, 2007.5, 0, 'NW1vdpZ6qE', '2025-06-30', 0, 0, 0, 1),
(264, 'direct', 1, 1, 16, 73, 2007.5, 0, 'mOZMnr5bOx', '2025-06-30', 0, 0, 0, 1),
(265, 'direct', 1, 1, 16, 72, 1980, 0, 'JoDAoEUGev', '2025-06-30', 0, 0, 0, 1),
(266, 'direct', 1, 2, 17, 12, 528, 0, 'JoDAoEUGev', '2025-06-30', 0, 0, 0, 1),
(267, 'direct', 1, 1, 16, 12, 330, 0, 'qhwLMi2PgS', '2025-06-30', 0, 0, 0, 1),
(268, 'direct', 1, 3, 18, 10, 490, 0, 'qhwLMi2PgS', '2025-06-30', 0, 0, 0, 1),
(269, 'wholesale', 1, 1, 16, 10, 270, 0, 'sgPnsFWZt5', '2025-06-30', 0, 0, 0, 1),
(270, 'wholesale', 1, 1, 16, 12, 324, 0, 'CGKsrqxrB0', '2025-06-30', 0, 0, 0, 1),
(271, 'direct', 1, 1, 16, 34, 935, 0, 'tAnPBkfn86', '2025-06-30', 0, 0, 0, 1),
(272, 'wholesale', 1, 1, 16, 12, 324, 0, 'S2dq22EuGr', '2025-06-30', 0, 0, 0, 1),
(273, 'wholesale', 1, 1, 16, 12, 324, 0, 'fPBApCSIUy', '2025-06-30', 0, 0, 0, 1),
(274, 'wholesale', 1, 1, 16, 43, 1161, 0, 'TeQkY08aTi', '2025-06-30', 0, 0, 0, 1),
(275, 'wholesale', 1, 1, 16, 13, 351, 0, 'gMiLSwwPg0', '2025-07-01', 0, 0, 0, 1),
(276, 'wholesale', 1, 1, 16, 5, 135, 0, 'myaKFKkeeq', '2025-07-01', 0, 0, 0, 1);

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
(139, 'vSBJIRwTra', 100, '2025-05-25 09:44:43', 1, 0.00, 100.00, 0.00),
(140, 'vSBJIRwTra', 30, '2025-05-25 09:53:42', 1, 0.00, 30.00, 0.00),
(141, 'vSBJIRwTra', 30, '2025-05-25 09:54:23', 1, 0.00, 30.00, 0.00),
(142, '1Iya6NyflS', 450, '2025-05-25 10:18:49', 1, 0.00, 450.00, 0.00),
(143, '57HJMtAfM7', 30, '2025-05-25 10:33:36', 1, 0.00, 30.00, 0.00),
(144, '57HJMtAfM7', 30, '2025-05-25 10:34:01', 1, 0.00, 30.00, 0.00),
(145, '57HJMtAfM7', 190, '2025-05-25 10:37:22', 1, 0.00, 190.00, 0.00),
(147, 'TsztC3jbfe', 120, '2025-05-31 22:06:29', 1, 0.00, 0.00, 0.00),
(148, 'TsztC3jbfe', 4, '2025-05-31 22:09:52', 1, 0.00, 4.00, 0.00),
(149, '2FQuupUkDw', 621, '2025-05-31 22:33:20', 1, 0.00, 0.00, 0.00),
(150, 'grg5QhrGx0', 581, '2025-05-31 22:34:09', 1, 0.00, 0.00, 0.00),
(151, 'uRV6yG12Gi', 920, '2025-06-01 06:57:31', 1, 20.00, 900.00, 0.00),
(152, '25UZNn86dW', 871, '2025-06-01 07:04:40', 1, 0.00, 871.00, 0.00),
(153, 'uRV6yG12Gi', 2000, '2025-06-01 07:06:52', 1, 0.00, 2000.00, 0.00),
(154, 'pDqyvDI09s', 10, '2025-06-01 07:25:11', 1, 0.00, 0.00, 0.00),
(155, 'pDqyvDI09s', 10, '2025-06-01 07:34:12', 1, 0.00, 10.00, 0.00),
(156, 'pDqyvDI09s', 3, '2025-06-01 07:34:21', 1, 0.00, 0.00, 3.00),
(157, 'jBr20sxBge', 650, '2025-06-01 08:32:43', 1, 50.00, 600.00, 0.00),
(158, 'MqNm5c4Lp3', 12, '2025-06-01 08:36:44', 1, 0.00, 12.00, 0.00),
(159, '2MXToIFowX', 10, '2025-06-01 08:40:28', 1, 0.00, 10.00, 0.00),
(160, '5Fs6klF4y2', 12, '2025-06-01 08:42:47', 1, 0.00, 12.00, 0.00),
(161, 'PqVuuQKRMW', 21, '2025-06-01 08:44:45', 1, 0.00, 21.00, 0.00),
(162, 'IEFBzNHe0F', 10, '2025-06-01 08:45:20', 1, 0.00, 10.00, 0.00),
(163, 'hsqjZCGFpF', 1400, '2025-06-01 08:50:33', 1, 400.00, 1000.00, 0.00),
(164, 'GwMsvrO4Rl', 262, '2025-06-01 08:53:09', 1, 150.00, 100.00, 12.00),
(165, 'FSImzE3WDi', 10, '2025-06-01 08:54:48', 1, 0.00, 10.00, 0.00),
(166, 'TYDvIYqfdP', 3496, '2025-06-23 06:46:49', 1, 1000.00, 1996.00, 500.00),
(167, 'fzv6MVM3eR', 100, '2025-06-23 11:10:26', 1, 0.00, 0.00, 0.00),
(168, 'Vgh5KRUk3r', 100, '2025-06-23 11:11:18', 1, 0.00, 0.00, 0.00),
(169, '6x5Wd8lyp6', 100, '2025-06-23 11:12:08', 1, 0.00, 0.00, 0.00),
(170, 'ZVjzDC5jL0', 50, '2025-06-23 11:13:14', 1, 0.00, 0.00, 0.00),
(171, 'IpPqRrL4sB', 250, '2025-06-23 11:52:59', 1, 0.00, 0.00, 0.00),
(172, 'O0XQlQbBFQ', 120, '2025-06-23 12:11:18', 1, 0.00, 0.00, 0.00),
(173, 'tqXdWb7VfO', 321, '2025-06-23 12:17:52', 1, 0.00, 0.00, 0.00),
(174, 'rBSEgkuTky', 12, '2025-06-23 12:20:30', 1, 0.00, 0.00, 0.00),
(175, 'hJGA56QTw2', 223, '2025-06-23 12:21:05', 1, 0.00, 0.00, 0.00),
(176, '0AuqVpwjgv', 10, '2025-06-23 12:27:53', 1, 0.00, 0.00, 0.00),
(177, '2JsL9GjUgh', 21, '2025-06-23 12:34:20', 1, 0.00, 0.00, 0.00),
(178, '35vbngbMxD', 1, '2025-06-23 12:36:01', 1, 0.00, 0.00, 0.00),
(179, 'kR2ycFQZCE', 12, '2025-06-23 12:36:32', 1, 0.00, 0.00, 0.00),
(180, 'iFDo5E5TQf', 12, '2025-06-23 12:37:53', 1, 0.00, 0.00, 0.00),
(181, 'yK8hVS9cVv', 25, '2025-06-23 12:39:53', 1, 0.00, 0.00, 0.00),
(182, 'Obcae5xSzI', 25, '2025-06-23 12:40:23', 1, 0.00, 0.00, 0.00),
(183, 'UdcfIfJ3sO', 12, '2025-06-23 12:42:30', 1, 0.00, 0.00, 0.00),
(184, 'nIRaiEd4vh', 1, '2025-06-23 12:44:48', 1, 0.00, 0.00, 0.00),
(185, 'uQum9u6Qpr', 1, '2025-06-23 12:46:46', 1, 0.00, 0.00, 0.00),
(186, 'bOX9ejhyhC', 1, '2025-06-23 12:48:02', 1, 0.00, 0.00, 0.00),
(187, 'TISYIzJl2K', 123, '2025-06-23 12:49:15', 1, 0.00, 0.00, 0.00),
(188, 'ENStYoyCqy', 10, '2025-06-23 12:53:10', 1, 0.00, 0.00, 0.00),
(189, 'T4tcSuQqVD', 10, '2025-06-23 12:53:27', 1, 0.00, 0.00, 0.00),
(190, 'HID2pyh3bl', 10, '2025-06-23 12:56:10', 1, 0.00, 0.00, 0.00),
(191, 'BhGN9xmAbI', 888, '2025-06-23 12:57:15', 1, 0.00, 0.00, 0.00),
(192, '2ayHlHnVBt', 1, '2025-06-23 14:07:47', 1, 0.00, 0.00, 0.00),
(193, '0AuqVpwjgv', 10, '2025-06-24 06:48:12', 1, 0.00, 10.00, 0.00),
(194, 'UdcfIfJ3sO', 45, '2025-06-24 06:48:25', 1, 0.00, 45.00, 0.00),
(195, 'BhGN9xmAbI', 1, '2025-06-24 06:48:42', 1, 0.50, 0.00, 0.00),
(196, '0AuqVpwjgv', 75, '2025-06-24 06:49:00', 1, 0.00, 74.88, 0.00),
(197, 'ENStYoyCqy', 18, '2025-06-24 07:06:42', 1, 0.00, 18.00, 0.00),
(198, 'xhinu674Sh', 80, '2025-06-30 06:43:05', 1, 0.00, 80.00, 0.00),
(199, 'UeTX4wt8Tm', 600, '2025-06-30 20:56:23', 1, 0.00, 0.00, 0.00),
(200, 'N35Qcu401m', 234, '2025-06-30 20:57:54', 1, 0.00, 0.00, 0.00),
(201, 'rE4UkZLTkY', 34, '2025-06-30 20:59:03', 1, 0.00, 0.00, 0.00),
(202, 'hODeKJY8Nc', 300, '2025-06-30 21:01:46', 1, 0.00, 0.00, 0.00),
(203, 'NJPfUwakhm', 250, '2025-06-30 21:02:53', 1, 0.00, 0.00, 0.00),
(204, 'bRAISZtOAj', 123, '2025-06-30 21:05:53', 1, 0.00, 0.00, 0.00),
(205, 'CAecIDDfAk', 234, '2025-06-30 21:07:44', 1, 0.00, 0.00, 0.00),
(206, 'Cc5kyQFvYK', 212, '2025-06-30 21:09:08', 1, 0.00, 0.00, 0.00),
(207, 'gwBMVH9RUZ', 767, '2025-06-30 21:11:25', 1, 0.00, 0.00, 0.00),
(208, '9UUuxSWnwK', 123, '2025-06-30 21:20:25', 1, 0.00, 0.00, 0.00),
(209, 'NW1vdpZ6qE', 1000, '2025-06-30 21:24:37', 1, 0.00, 0.00, 0.00),
(210, 'mOZMnr5bOx', 123, '2025-06-30 21:27:59', 1, 0.00, 0.00, 0.00),
(211, 'JoDAoEUGev', 123, '2025-06-30 21:28:40', 1, 0.00, 0.00, 0.00),
(212, 'qhwLMi2PgS', 123, '2025-06-30 21:31:09', 1, 0.00, 0.00, 0.00),
(213, 'sgPnsFWZt5', 212, '2025-06-30 21:37:00', 1, 0.00, 0.00, 0.00),
(214, 'CGKsrqxrB0', 12, '2025-06-30 21:37:23', 1, 0.00, 0.00, 0.00),
(215, 'tAnPBkfn86', 78, '2025-06-30 21:41:09', 1, 0.00, 0.00, 0.00),
(216, 'S2dq22EuGr', 123, '2025-06-30 21:43:14', 1, 0.00, 0.00, 0.00),
(217, 'fPBApCSIUy', 32, '2025-06-30 21:46:58', 1, 0.00, 0.00, 0.00),
(218, 'TeQkY08aTi', 1123, '2025-06-30 21:48:40', 1, 0.00, 0.00, 0.00),
(219, 'gMiLSwwPg0', 250, '2025-07-01 22:09:33', 1, 0.00, 0.00, 0.00),
(220, 'myaKFKkeeq', 5, '2025-07-01 22:10:15', 1, 0.00, 0.00, 0.00);

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
(1, 3, 5, 255, 1, 0, '2025-05-05 08:32:45', 1),
(2, 4, 7, 564, 2, 0, '2025-05-11 23:59:16', 1),
(3, 1, 2, 490, 0, 0, '2025-06-30 01:14:42', 1),
(4, 2, 4, 916, 0, 0, '2025-05-11 23:59:16', 1);

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
(75, 3, -1, 'sale', '2025-06-01', 0, 'debit', 'pDqyvDI09s'),
(76, 3, -1, 'sale', '2025-06-23', 0, 'debit', 'fzv6MVM3eR'),
(77, 2, -2, 'sale', '2025-06-23', 0, 'debit', 'fzv6MVM3eR'),
(78, 3, -1, 'sale', '2025-06-23', 0, 'debit', 'Vgh5KRUk3r'),
(79, 2, -2, 'sale', '2025-06-23', 0, 'debit', 'Vgh5KRUk3r'),
(80, 3, -1, 'sale', '2025-06-23', 0, 'debit', '6x5Wd8lyp6'),
(81, 2, -2, 'sale', '2025-06-23', 0, 'debit', '6x5Wd8lyp6'),
(82, 3, -2, 'sale', '2025-06-23', 0, 'debit', 'ZVjzDC5jL0'),
(83, 3, -14, 'sale', '2025-06-23', 0, 'debit', 'IpPqRrL4sB'),
(84, 3, -2, 'sale', '2025-06-23', 0, 'debit', 'O0XQlQbBFQ'),
(85, 2, -10, 'sale', '2025-06-23', 0, 'debit', 'O0XQlQbBFQ'),
(86, 3, -12, 'sale', '2025-06-23', 0, 'debit', 'tqXdWb7VfO'),
(87, 3, -12, 'sale', '2025-06-23', 0, 'debit', 'rBSEgkuTky'),
(88, 3, -12, 'sale', '2025-06-23', 0, 'debit', 'hJGA56QTw2'),
(89, 3, -1, 'sale', '2025-06-23', 0, 'debit', '0AuqVpwjgv'),
(90, 2, -1, 'sale', '2025-06-23', 0, 'debit', '0AuqVpwjgv'),
(91, 3, -1, 'sale', '2025-06-23', 0, 'debit', '2JsL9GjUgh'),
(92, 3, -1, 'sale', '2025-06-23', 0, 'debit', '35vbngbMxD'),
(93, 3, -1, 'sale', '2025-06-23', 0, 'debit', 'kR2ycFQZCE'),
(94, 2, -1, 'sale', '2025-06-23', 0, 'debit', 'iFDo5E5TQf'),
(95, 3, -1, 'sale', '2025-06-23', 0, 'debit', 'yK8hVS9cVv'),
(96, 3, -1, 'sale', '2025-06-23', 0, 'debit', 'Obcae5xSzI'),
(97, 3, -2, 'sale', '2025-06-23', 0, 'debit', 'UdcfIfJ3sO'),
(98, 3, -1, 'sale', '2025-06-23', 0, 'debit', 'nIRaiEd4vh'),
(99, 3, -1, 'sale', '2025-06-23', 0, 'debit', 'uQum9u6Qpr'),
(100, 3, -1, 'sale', '2025-06-23', 0, 'debit', 'bOX9ejhyhC'),
(101, 3, -12, 'sale', '2025-06-23', 0, 'debit', 'TISYIzJl2K'),
(102, 3, -1, 'sale', '2025-06-23', 0, 'debit', 'ENStYoyCqy'),
(103, 3, -1, 'sale', '2025-06-23', 0, 'debit', 'T4tcSuQqVD'),
(104, 3, -1, 'sale', '2025-06-23', 0, 'debit', 'HID2pyh3bl'),
(105, 3, -10, 'sale', '2025-06-23', 0, 'debit', 'BhGN9xmAbI'),
(106, 2, -10, 'sale', '2025-06-23', 0, 'debit', 'BhGN9xmAbI'),
(107, 3, -1, 'sale', '2025-06-23', 0, 'debit', '2ayHlHnVBt'),
(108, 1, 100, 'purchase', '2025-06-30', 0, 'Credit', '123561sad'),
(109, 1, 2, 'purchase', '2025-06-30', 0, 'Credit', '907967'),
(110, 1, 1, 'freebie', '2025-06-30', 0, 'Credit', '907967'),
(111, 3, 10, 'purchase', '2025-06-30', 0, 'Credit', '979'),
(112, 3, 10, 'freebie', '2025-06-30', 0, 'Credit', '979'),
(113, 1, 100, 'purchase', '2025-06-30', 0, 'Credit', '98698'),
(114, 3, 10, 'purchase', '2025-06-30', 0, 'Credit', '98698'),
(115, 1, 100, 'purchase', '2025-06-30', 0, 'Credit', '1231'),
(116, 1, 50, 'freebie', '2025-06-30', 0, 'Credit', '1231'),
(117, 1, 7, 'replacement', '2025-06-30', 0, 'Debit', '1211'),
(118, 2, 10, 'purchase', '2025-06-30', 0, 'Credit', '13231'),
(119, 1, 100, 'purchase', '2025-06-30', 0, 'Credit', '13231'),
(120, 1, 10, 'purchase', '2025-06-30', 0, 'Credit', '13'),
(121, 1, 10, 'purchase', '2025-06-30', 0, 'Credit', '21'),
(122, 2, 10, 'purchase', '2025-06-30', 0, 'Credit', '21'),
(123, 1, 100, 'purchase', '2025-06-30', 0, 'Credit', '322'),
(124, 1, 100, 'freebie', '2025-06-30', 0, 'Credit', '322'),
(125, 3, 10, 'purchase', '2025-06-30', 0, 'Credit', '322'),
(126, 3, 5, 'freebie', '2025-06-30', 0, 'Credit', '322'),
(127, 4, 1, 'replacement', '2025-06-30', 0, 'Debit', '675'),
(128, 3, 10, 'purchase', '2025-06-30', 0, 'Credit', 'HGFHG12'),
(129, 3, 10, 'freebie', '2025-06-30', 0, 'Credit', 'HGFHG12'),
(130, 4, 100, 'purchase', '2025-06-30', 0, 'Credit', 'HGFHG12'),
(131, 4, 50, 'freebie', '2025-06-30', 0, 'Credit', 'HGFHG12'),
(132, 2, 100, 'purchase', '2025-06-30', 0, 'Credit', '979'),
(133, 2, 50, 'freebie', '2025-06-30', 0, 'Credit', '979'),
(134, 3, 100, 'purchase', '2025-06-30', 0, 'Credit', '979'),
(135, 3, 100, 'freebie', '2025-06-30', 0, 'Credit', '979'),
(136, 1, 100, 'replacement', '2025-06-30', 0, 'Debit', '979'),
(137, 3, 1, 'replacement', '2025-06-30', 0, 'Debit', '12'),
(138, 1, 2, 'damage', '2025-06-30', 0, 'Debit', '678vhgj'),
(142, 1, 2, 'replacement', '2025-06-30', 0, 'Debit', '87578'),
(143, 1, 10, 'replacement', '2025-06-30', 0, 'Debit', '87578'),
(144, 3, -23, 'sale', '2025-06-30', 0, 'debit', 'UeTX4wt8Tm'),
(145, 3, -12, 'sale', '2025-06-30', 0, 'debit', 'N35Qcu401m'),
(146, 3, -12, 'sale', '2025-06-30', 0, 'debit', 'rE4UkZLTkY'),
(147, 3, -12, 'sale', '2025-06-30', 0, 'debit', 'hODeKJY8Nc'),
(148, 3, -12, 'sale', '2025-06-30', 0, 'debit', 'NJPfUwakhm'),
(149, 4, -5, 'sale', '2025-06-30', 0, 'debit', 'NJPfUwakhm'),
(150, 3, -23, 'sale', '2025-06-30', 0, 'debit', 'bRAISZtOAj'),
(151, 3, -12, 'sale', '2025-06-30', 0, 'debit', 'CAecIDDfAk'),
(152, 3, -12, 'sale', '2025-06-30', 0, 'debit', 'Cc5kyQFvYK'),
(153, 3, -73, 'sale', '2025-06-30', 0, 'debit', 'gwBMVH9RUZ'),
(154, 3, -73, 'sale', '2025-06-30', 0, 'debit', '9UUuxSWnwK'),
(155, 3, -73, 'sale', '2025-06-30', 0, 'debit', 'NW1vdpZ6qE'),
(156, 3, -73, 'sale', '2025-06-30', 0, 'debit', 'mOZMnr5bOx'),
(157, 3, -72, 'sale', '2025-06-30', 0, 'debit', 'JoDAoEUGev'),
(158, 4, -12, 'sale', '2025-06-30', 0, 'debit', 'JoDAoEUGev'),
(159, 3, -12, 'sale', '2025-06-30', 0, 'debit', 'qhwLMi2PgS'),
(160, 1, -10, 'sale', '2025-06-30', 0, 'debit', 'qhwLMi2PgS'),
(161, 3, -10, 'sale', '2025-06-30', 0, 'debit', 'sgPnsFWZt5'),
(162, 3, -12, 'sale', '2025-06-30', 0, 'debit', 'CGKsrqxrB0'),
(163, 3, -34, 'sale', '2025-06-30', 0, 'debit', 'tAnPBkfn86'),
(164, 3, -12, 'sale', '2025-06-30', 0, 'debit', 'S2dq22EuGr'),
(165, 3, -12, 'sale', '2025-06-30', 0, 'debit', 'fPBApCSIUy'),
(166, 3, -43, 'sale', '2025-06-30', 0, 'debit', 'TeQkY08aTi'),
(167, 3, -13, 'sale', '2025-07-01', 0, 'debit', 'gMiLSwwPg0'),
(168, 3, -5, 'sale', '2025-07-01', 0, 'debit', 'myaKFKkeeq');

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
  ADD KEY `fk_purchase_supplier` (`supplier_id`),
  ADD KEY `fk_related_purchase` (`related_purchase_id`);

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
  MODIFY `daily_stock_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=169;

--
-- AUTO_INCREMENT for table `final_sale`
--
ALTER TABLE `final_sale`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=200;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `product_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `product_prices`
--
ALTER TABLE `product_prices`
  MODIFY `price_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `purchase`
--
ALTER TABLE `purchase`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=92;

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
  MODIFY `sale_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=277;

--
-- AUTO_INCREMENT for table `sales_credit_history`
--
ALTER TABLE `sales_credit_history`
  MODIFY `sales_credit_history_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=221;

--
-- AUTO_INCREMENT for table `stock`
--
ALTER TABLE `stock`
  MODIFY `stock_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `stock_History`
--
ALTER TABLE `stock_History`
  MODIFY `stock_History_Id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=169;

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
  ADD CONSTRAINT `fk_related_purchase` FOREIGN KEY (`related_purchase_id`) REFERENCES `purchase` (`id`),
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
