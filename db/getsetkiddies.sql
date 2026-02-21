-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Nov 12, 2025 at 09:28 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `getsetkiddies`
--

-- --------------------------------------------------------

--
-- Table structure for table `admin`
--

CREATE TABLE `admin` (
  `id` int(11) NOT NULL,
  `firstname` varchar(100) DEFAULT NULL,
  `lastname` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `date_created` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `geofences`
--

CREATE TABLE `geofences` (
  `id` int(11) NOT NULL,
  `child_id` int(11) NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `radius` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `geofences`
--

INSERT INTO `geofences` (`id`, `child_id`, `name`, `latitude`, `longitude`, `radius`, `created_at`, `updated_at`) VALUES
(1, 9, 'UI', 10.6915327, 122.5697663, 80, '2025-11-05 14:12:38', '2025-11-06 21:27:06'),
(2, 6, 'asdf', 10.6925686, 122.5333447, 100, '2025-11-05 17:08:48', '2025-11-06 05:32:33'),
(3, 7, 'church', 10.6971696, 122.5452714, 100, '2025-11-05 20:14:51', NULL),
(6, 11, 'school', 10.7821445, 122.3885021, 100, '2025-11-06 12:18:41', '2025-11-06 20:19:48'),
(7, 5, 'school', 10.7800462, 122.3901753, 100, '2025-11-06 12:31:33', NULL),
(8, 13, 'school', 10.7770591, 122.3881932, 100, '2025-11-07 04:27:57', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `locations`
--

CREATE TABLE `locations` (
  `id` int(11) NOT NULL,
  `child_id` int(11) DEFAULT NULL,
  `latitude` double DEFAULT NULL,
  `longitude` double DEFAULT NULL,
  `readable_address` varchar(255) DEFAULT NULL,
  `date_time` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `locations`
--

INSERT INTO `locations` (`id`, `child_id`, `latitude`, `longitude`, `readable_address`, `date_time`) VALUES
(1, 5, 10.7019, 122.5622, 'Esplanade 6, Aurora Subdivision, City Proper, Iloilo City, Western Visayas, 5000, Philippines', '2025-11-03 07:43:33'),
(4, 6, 10.7019, 122.5622, 'Esplanade 6, Aurora Subdivision, City Proper, Iloilo City, Western Visayas, 5000, Philippines', '2025-11-03 07:56:14'),
(22, 5, 10.689109971524688, 122.5438777395491, 'San Juan, Molo, Iloilo City, Western Visayas, 5000, Philippines', '2025-11-05 12:52:04'),
(23, 7, 10.689102172851562, 122.5439682006836, 'San Juan, Molo, Iloilo City, Western Visayas, 5000, Philippines', '2025-11-06 19:17:40'),
(25, 9, 10.689109971524688, 122.5438777395491, 'San Juan, Molo, Iloilo City, Western Visayas, 5000, Philippines', '2025-11-05 12:51:47'),
(26, 6, 10.689105483325493, 122.5438800440028, 'San Juan, Molo, Iloilo City, Western Visayas, 5000, Philippines', '2025-11-05 18:18:03'),
(28, 11, 10.781659, 122.388535, 'Saint Catherine Parochial School, Cabanilla Street, Poblacion, Leon, Iloilo, Western Visayas, 5026, Philippines', '2025-11-06 12:17:45'),
(29, 5, 10.781659, 122.388535, 'Saint Catherine Parochial School, Cabanilla Street, Poblacion, Leon, Iloilo, Western Visayas, 5026, Philippines', '2025-11-06 12:29:32'),
(30, 12, 10.781537, 122.3886185, 'Cabanilla Street, Poblacion, Leon, Iloilo, Western Visayas, 5026, Philippines', '2025-11-06 13:23:56'),
(31, 9, 10.781537, 122.3886185, 'Cabanilla Street, Poblacion, Leon, Iloilo, Western Visayas, 5026, Philippines', '2025-11-06 13:28:58'),
(32, 5, 10.689102172851562, 122.5439682006836, 'San Juan, Molo, Iloilo City, Western Visayas, 5000, Philippines', '2025-11-06 19:02:49'),
(33, 7, 10.781537, 122.3886185, 'Cabanilla Street, Poblacion, Leon, Iloilo, Western Visayas, 5026, Philippines', '2025-11-07 02:39:53'),
(35, 5, 10.7163, 122.565685, 'Iloilo Science and Technology University, Burgos Street, Jereos, San Pedro, Jaro, Tabuc Suba, Iloilo City, Western Visayas, 5000, Philippines', '2025-11-07 03:30:34'),
(36, 13, 10.689102172851562, 122.5439682006836, 'San Juan, Molo, Iloilo City, Western Visayas, 5000, Philippines', '2025-11-07 04:28:18');

-- --------------------------------------------------------

--
-- Table structure for table `parents`
--

CREATE TABLE `parents` (
  `id` int(11) NOT NULL,
  `firstname` varchar(100) DEFAULT NULL,
  `lastname` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `home_address` text DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `date_created` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `parents`
--

INSERT INTO `parents` (`id`, `firstname`, `lastname`, `email`, `phone_number`, `home_address`, `password`, `date_created`) VALUES
(1, 'ellen', 'cabaya', 'ellen@gmail.com', '09702289407', 'Camandag, Leon, Iloilo', '123', '2025-11-01 13:36:34'),
(2, 'Jerson', 'Galabo', 'jerson@gmail.com', '0987654321', 'Leon Iloilo', '123', '2025-11-02 04:25:39'),
(3, 'rowena', 'supleo', 'rowena@gmail.com', '09123456789', 'Iloilo city', '123', '2025-11-06 12:16:54'),
(4, 'sakura', 'sakura', 'sakura@gmail.com', '09876543219', 'Miag-ao, Iloilo', '123', '2025-11-07 03:45:24');

-- --------------------------------------------------------

--
-- Table structure for table `registered_children`
--

CREATE TABLE `registered_children` (
  `id` int(11) NOT NULL,
  `firstname` varchar(100) DEFAULT NULL,
  `lastname` varchar(100) DEFAULT NULL,
  `child_age` int(11) DEFAULT NULL,
  `child_gender` varchar(20) DEFAULT NULL,
  `parent_id` int(11) DEFAULT NULL,
  `parent_name` varchar(150) DEFAULT NULL,
  `parent_email` varchar(100) DEFAULT NULL,
  `parent_number` varchar(20) DEFAULT NULL,
  `parent_home_address` text DEFAULT NULL,
  `date_registered` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `registered_children`
--

INSERT INTO `registered_children` (`id`, `firstname`, `lastname`, `child_age`, `child_gender`, `parent_id`, `parent_name`, `parent_email`, `parent_number`, `parent_home_address`, `date_registered`) VALUES
(5, 'jayrold', 'tabalina', 12, 'Male', 1, 'ellen cabaya', 'ellen@gmail.com', '09702289407', 'Camandag, Leon, Iloilo', '2025-11-02 03:20:37'),
(6, 'yasmine', 'talaman', 12, 'Female', 1, 'ellen cabaya', 'ellen@gmail.com', '09702289407', 'Camandag, Leon, Iloilo', '2025-11-02 03:21:15'),
(7, 'jayrold', 'tabalina', 12, 'Male', 2, 'Jerson Galabo', 'jerson@gmail.com', '0987654321', 'Leon Iloilo', '2025-11-02 04:25:59'),
(9, 'test', 'test', 35, 'Male', 1, 'ellen cabaya', 'ellen@gmail.com', '09702289407', 'Camandag, Leon, Iloilo', '2025-11-03 16:18:43'),
(11, 'paul', 'paul', 12, 'Male', 3, 'rowena supleo', 'rowena@gmail.com', '09123456789', 'Iloilo city', '2025-11-06 12:17:23'),
(12, 'rowena', 'supleo', 13, 'Female', 1, 'ellen cabaya', 'ellen@gmail.com', '09702289407', 'Camandag, Leon, Iloilo', '2025-11-06 13:23:17'),
(13, 'wena', 'sup', 12, 'Female', 1, 'ellen cabaya', 'ellen@gmail.com', '09702289407', 'Camandag, Leon, Iloilo', '2025-11-07 04:26:04'),
(14, 'test2', 'test2', 29, 'Male', 1, 'ellen cabaya', 'ellen@gmail.com', '09702289407', 'Camandag, Leon, Iloilo', '2025-11-12 19:36:08');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admin`
--
ALTER TABLE `admin`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `geofences`
--
ALTER TABLE `geofences`
  ADD PRIMARY KEY (`id`),
  ADD KEY `child_id` (`child_id`);

--
-- Indexes for table `locations`
--
ALTER TABLE `locations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `child_id` (`child_id`);

--
-- Indexes for table `parents`
--
ALTER TABLE `parents`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `registered_children`
--
ALTER TABLE `registered_children`
  ADD PRIMARY KEY (`id`),
  ADD KEY `parent_id` (`parent_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admin`
--
ALTER TABLE `admin`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `geofences`
--
ALTER TABLE `geofences`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `locations`
--
ALTER TABLE `locations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=37;

--
-- AUTO_INCREMENT for table `parents`
--
ALTER TABLE `parents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `registered_children`
--
ALTER TABLE `registered_children`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `geofences`
--
ALTER TABLE `geofences`
  ADD CONSTRAINT `geofences_ibfk_1` FOREIGN KEY (`child_id`) REFERENCES `registered_children` (`id`);

--
-- Constraints for table `locations`
--
ALTER TABLE `locations`
  ADD CONSTRAINT `locations_ibfk_1` FOREIGN KEY (`child_id`) REFERENCES `registered_children` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `registered_children`
--
ALTER TABLE `registered_children`
  ADD CONSTRAINT `registered_children_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `parents` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
