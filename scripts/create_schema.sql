-- phpMyAdmin SQL Dump
-- version 5.1.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jul 30, 2022 at 05:23 PM
-- Server version: 10.4.20-MariaDB
-- PHP Version: 8.0.9

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `ttdb`
--

-- --------------------------------------------------------

--
-- Table structure for table `chatlist`
--

CREATE TABLE `chatlist` (
  `chatId` bigint(11) NOT NULL,
  `chatName` text NOT NULL,
  `chatMemberIDs` text NOT NULL,
  `ttMessageId` bigint(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `classesselected`
--

CREATE TABLE `classesselected` (
  `memberId` int(11) NOT NULL,
  `moduleCode` text NOT NULL,
  `classNo` text NOT NULL,
  `lessonType` text NOT NULL,
  `chatId` bigint(20) NOT NULL,
  `ay` text NOT NULL,
  `semester` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `classlist`
--

CREATE TABLE `classlist` (
  `uniqueClassId` int(11) NOT NULL,
  `moduleCode` text NOT NULL,
  `venue` text NOT NULL,
  `lessonType` text NOT NULL,
  `classNo` text NOT NULL,
  `startTime` int(11) NOT NULL,
  `endTime` int(11) NOT NULL,
  `weeks` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`weeks`)),
  `lastUpdated` timestamp NOT NULL DEFAULT current_timestamp(),
  `ay` text NOT NULL,
  `semester` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `memberlist`
--

CREATE TABLE `memberlist` (
  `memberId` int(11) NOT NULL,
  `memberName` text NOT NULL,
  `memberUsername` text NOT NULL,
  `timetableLink` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `modulelist`
--

CREATE TABLE `modulelist` (
  `rowId` int(11) NOT NULL,
  `moduleCode` text NOT NULL,
  `moduleName` text NOT NULL,
  `lastUpdated` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `chatlist`
--
ALTER TABLE `chatlist`
  ADD UNIQUE KEY `chatId` (`chatId`);

--
-- Indexes for table `classlist`
--
ALTER TABLE `classlist`
  ADD PRIMARY KEY (`uniqueClassId`);

--
-- Indexes for table `memberlist`
--
ALTER TABLE `memberlist`
  ADD UNIQUE KEY `memberId` (`memberId`);

--
-- Indexes for table `modulelist`
--
ALTER TABLE `modulelist`
  ADD PRIMARY KEY (`rowId`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `classlist`
--
ALTER TABLE `classlist`
  MODIFY `uniqueClassId` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `modulelist`
--
ALTER TABLE `modulelist`
  MODIFY `rowId` int(11) NOT NULL AUTO_INCREMENT;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
