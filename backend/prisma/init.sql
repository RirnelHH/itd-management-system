-- IT&D 管理系统数据库初始化脚本
-- 此脚本在 MySQL 容器首次启动时自动执行

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS `itd_management` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `itd_management`;

-- 设置字符集
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
