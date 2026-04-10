-- Add privacy fields to User table
ALTER TABLE `User` ADD COLUMN `phonePublic` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `User` ADD COLUMN `emailPublic` BOOLEAN NOT NULL DEFAULT false;
