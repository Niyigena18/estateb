-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Aug 10, 2025 at 04:26 AM
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
-- Database: `real_estate`
--

-- --------------------------------------------------------

--
-- Table structure for table `houses`
--

CREATE TABLE `houses` (
  `id` int(11) NOT NULL,
  `landlord_id` int(11) NOT NULL,
  `tenant_id` int(11) DEFAULT NULL,
  `title` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `address` varchar(300) NOT NULL,
  `rent_amount` decimal(10,2) NOT NULL,
  `bedrooms` int(11) DEFAULT 0,
  `bathrooms` int(11) DEFAULT 0,
  `status` enum('available','rented') NOT NULL DEFAULT 'available',
  `image_url` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `rental_start_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `houses`
--

INSERT INTO `houses` (`id`, `landlord_id`, `tenant_id`, `title`, `description`, `address`, `rent_amount`, `bedrooms`, `bathrooms`, `status`, `image_url`, `is_active`, `rental_start_date`, `created_at`, `updated_at`) VALUES
(1, 2, NULL, 'Spacious Family Home', 'Beautiful 4-bedroom house with a large garden.', '123 Main St, Springfield', 1500.00, 4, 2, 'available', 'http://example.com/house1.jpg', 1, '2025-08-01', '2025-07-23 13:30:50', '2025-07-23 13:30:50'),
(2, 2, NULL, 'Spacious Family Home', 'Beautiful 4-bedroom house with a large garden.', '123 Main St, Springfield', 1500.00, 4, 2, 'available', 'http://example.com/house1.jpg', 1, '2025-08-01', '2025-07-23 13:30:54', '2025-07-23 13:30:54'),
(3, 2, NULL, 'Spacious Family Home', 'Beautiful 4-bedroom house with a large garden.', '123 Main St, Springfield', 1500.00, 4, 2, 'available', 'http://example.com/house1.jpg', 1, '2025-08-01', '2025-07-23 13:31:45', '2025-07-23 13:31:45'),
(4, 4, NULL, 'Updated House Title', 'This is a beautifully updated house.', '123 Test St, Test City', 1250.00, 4, 2, 'available', 'http://example.com/images/house1.jpg', 1, '2025-09-01', '2025-07-24 11:28:38', '2025-07-24 11:39:11'),
(5, 4, NULL, 'Modern Apartment', 'Spacious 3-bedroom apartment.', '123 Test St, Test City', 1200.00, 3, 2, 'available', 'http://example.com/images/house1.jpg', 1, '2025-09-01', '2025-07-24 12:13:18', '2025-07-24 12:13:18');

-- --------------------------------------------------------

--
-- Table structure for table `lease_agreements`
--

CREATE TABLE `lease_agreements` (
  `id` int(11) NOT NULL,
  `house_id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL,
  `landlord_id` int(11) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `rent_amount` decimal(10,2) NOT NULL,
  `deposit_amount` decimal(10,2) NOT NULL,
  `terms` text NOT NULL,
  `status` varchar(50) DEFAULT 'pending',
  `document_url` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `lease_agreements`
--

INSERT INTO `lease_agreements` (`id`, `house_id`, `tenant_id`, `landlord_id`, `start_date`, `end_date`, `rent_amount`, `deposit_amount`, `terms`, `status`, `document_url`, `created_at`, `updated_at`) VALUES
(1, 4, 6, 4, '2025-08-01', '2026-07-31', 1200.00, 2400.00, 'Standard lease terms for a 12-month period, rent due on the 1st of each month. No pets allowed. Tenant responsible for utilities.', 'active', 'https://example.com/lease_docs/lease_123.pdf', '2025-07-24 14:16:36', '2025-07-24 14:16:36');

-- --------------------------------------------------------

--
-- Table structure for table `maintenance_requests`
--

CREATE TABLE `maintenance_requests` (
  `id` int(11) NOT NULL,
  `house_id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL,
  `landlord_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `category` varchar(100) NOT NULL,
  `priority` varchar(50) DEFAULT 'Medium',
  `status` varchar(50) DEFAULT 'New',
  `requested_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `scheduled_date` date DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `resolution_notes` text DEFAULT NULL,
  `media_urls` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`media_urls`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `maintenance_requests`
--

INSERT INTO `maintenance_requests` (`id`, `house_id`, `tenant_id`, `landlord_id`, `title`, `description`, `category`, `priority`, `status`, `requested_at`, `scheduled_date`, `completed_at`, `resolution_notes`, `media_urls`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 2, 'Leaky Bathroom Faucet', 'The cold water faucet in the master bathroom drips constantly, even when fully shut off. It\'s wasting water and making noise.', 'Plumbing', 'Medium', 'New', '2025-07-24 15:55:53', NULL, NULL, NULL, '[\"http://example.com/images/faucet_leak_1.jpg\",\"http://example.com/videos/faucet_leak_proof.mp4\"]', '2025-07-24 15:55:53', '2025-07-24 15:55:53');

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `type` varchar(50) NOT NULL,
  `source_id` int(11) DEFAULT NULL,
  `message` text NOT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `rent_payments`
--

CREATE TABLE `rent_payments` (
  `id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL,
  `house_id` int(11) NOT NULL,
  `due_date` date NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `paid_amount` decimal(10,2) DEFAULT 0.00,
  `status` enum('pending','paid','overdue') DEFAULT 'pending',
  `payment_method` enum('mtn','airtel','credit_card') DEFAULT NULL,
  `payment_date` timestamp NULL DEFAULT NULL,
  `receipt_url` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `rent_reminders`
--

CREATE TABLE `rent_reminders` (
  `id` int(11) NOT NULL,
  `landlord_id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL,
  `house_id` int(11) NOT NULL,
  `type` enum('payment_due','overdue_payment') NOT NULL,
  `payment_id` int(11) DEFAULT NULL,
  `message` text DEFAULT NULL,
  `sent_at` timestamp NULL DEFAULT NULL,
  `reminder_date` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `rent_requests`
--

CREATE TABLE `rent_requests` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `house_id` int(11) NOT NULL,
  `message` text DEFAULT NULL,
  `status` enum('pending','approved','rejected','cancelled') DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `rent_requests`
--

INSERT INTO `rent_requests` (`id`, `user_id`, `house_id`, `message`, `status`, `created_at`, `updated_at`) VALUES
(1, 1, 2, 'I am very interested in renting this property. Please contact me soon!', 'rejected', '2025-07-23 14:05:30', '2025-07-23 14:14:10'),
(2, 1, 5, 'I am very interested in renting this property. Please contact me soon!', 'pending', '2025-07-24 15:35:47', '2025-07-24 15:35:47');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `role` enum('tenant','landlord') DEFAULT 'tenant',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `password_reset_token` varchar(255) DEFAULT NULL,
  `password_reset_expires` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `email`, `password`, `phone`, `role`, `created_at`, `updated_at`, `password_reset_token`, `password_reset_expires`) VALUES
(1, 'jane.doe', 'jane.doe@example.com', '$2a$10$yzE6CmBnQQjwfvQ7ww3IXeVvOnHHN5Bx6qtp340ek1mQYqAeAE6JG', '0781234567', 'tenant', '2025-07-23 10:21:15', '2025-07-23 10:21:15', NULL, NULL),
(2, 'landlord_john', 'john.landlord@example.com', '$2a$10$tA.YUueTI98OWJAT/xGiJ.l/awaYQWds7dV..NfKiY.CXohCbaYbi', '0701234567', 'landlord', '2025-07-23 13:27:07', '2025-07-23 13:27:07', NULL, NULL),
(4, 'landlord_vicky', 'vicky.landlord@example.com', '$2a$10$nDElHofjx6vgGLAW9Tg47.SCd9km5Nz91OdqIZyPPUYp30FqksWcO', '0731234567', 'landlord', '2025-07-24 11:23:52', '2025-07-24 13:14:11', '9497195bfa87465a2a60a0e9b931c075c2e88581115158f39915db1d2d13ea01', 1753366451446),
(5, 'rene', 'iniyigena74@gmail.com', '$2a$10$rAaIrzBJJ6MHx6zEnc11d.7LNx69dpO9xvtqxidJF3ZZXMGPZks9G', '0781234567', 'landlord', '2025-07-24 13:17:19', '2025-07-24 13:42:09', NULL, NULL),
(6, 'renei', 'iniyigena@gmail.com', '$2a$10$X2LpBU2ZmX2qtLvnP6HK0ODZ5TN65.ZqiasYwTKx1rwOenqEDucA6', '0771234567', 'tenant', '2025-07-24 14:12:17', '2025-07-24 14:12:17', NULL, NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `houses`
--
ALTER TABLE `houses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_tenant_id` (`tenant_id`),
  ADD KEY `idx_landlord_id` (`landlord_id`),
  ADD KEY `idx_is_active` (`is_active`);

--
-- Indexes for table `lease_agreements`
--
ALTER TABLE `lease_agreements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `house_id` (`house_id`),
  ADD KEY `tenant_id` (`tenant_id`),
  ADD KEY `landlord_id` (`landlord_id`);

--
-- Indexes for table `maintenance_requests`
--
ALTER TABLE `maintenance_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `house_id` (`house_id`),
  ADD KEY `tenant_id` (`tenant_id`),
  ADD KEY `landlord_id` (`landlord_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `rent_payments`
--
ALTER TABLE `rent_payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `house_id` (`house_id`),
  ADD KEY `idx_tenant_status` (`tenant_id`,`status`),
  ADD KEY `idx_due_date` (`due_date`);

--
-- Indexes for table `rent_reminders`
--
ALTER TABLE `rent_reminders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `landlord_id` (`landlord_id`),
  ADD KEY `tenant_id` (`tenant_id`),
  ADD KEY `house_id` (`house_id`),
  ADD KEY `fk_rent_payments_id` (`payment_id`);

--
-- Indexes for table `rent_requests`
--
ALTER TABLE `rent_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `house_id` (`house_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_user_house` (`user_id`,`house_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `houses`
--
ALTER TABLE `houses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `lease_agreements`
--
ALTER TABLE `lease_agreements`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `maintenance_requests`
--
ALTER TABLE `maintenance_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `rent_payments`
--
ALTER TABLE `rent_payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `rent_reminders`
--
ALTER TABLE `rent_reminders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `rent_requests`
--
ALTER TABLE `rent_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `houses`
--
ALTER TABLE `houses`
  ADD CONSTRAINT `houses_ibfk_1` FOREIGN KEY (`landlord_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `houses_ibfk_2` FOREIGN KEY (`tenant_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `lease_agreements`
--
ALTER TABLE `lease_agreements`
  ADD CONSTRAINT `lease_agreements_ibfk_1` FOREIGN KEY (`house_id`) REFERENCES `houses` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `lease_agreements_ibfk_2` FOREIGN KEY (`tenant_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `lease_agreements_ibfk_3` FOREIGN KEY (`landlord_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `maintenance_requests`
--
ALTER TABLE `maintenance_requests`
  ADD CONSTRAINT `maintenance_requests_ibfk_1` FOREIGN KEY (`house_id`) REFERENCES `houses` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `maintenance_requests_ibfk_2` FOREIGN KEY (`tenant_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `maintenance_requests_ibfk_3` FOREIGN KEY (`landlord_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `rent_payments`
--
ALTER TABLE `rent_payments`
  ADD CONSTRAINT `rent_payments_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `rent_payments_ibfk_2` FOREIGN KEY (`house_id`) REFERENCES `houses` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `rent_reminders`
--
ALTER TABLE `rent_reminders`
  ADD CONSTRAINT `fk_rent_payments_id` FOREIGN KEY (`payment_id`) REFERENCES `rent_payments` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `rent_reminders_ibfk_1` FOREIGN KEY (`landlord_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `rent_reminders_ibfk_2` FOREIGN KEY (`tenant_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `rent_reminders_ibfk_3` FOREIGN KEY (`house_id`) REFERENCES `houses` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `rent_requests`
--
ALTER TABLE `rent_requests`
  ADD CONSTRAINT `rent_requests_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `rent_requests_ibfk_2` FOREIGN KEY (`house_id`) REFERENCES `houses` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
