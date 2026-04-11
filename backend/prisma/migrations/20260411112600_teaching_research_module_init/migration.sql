-- CreateTable
CREATE TABLE `Major` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `educationSystem` ENUM('THREE_YEAR', 'FIVE_YEAR') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Major_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Grade` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `majorId` VARCHAR(191) NOT NULL,
    `educationSystem` ENUM('THREE_YEAR', 'FIVE_YEAR') NOT NULL,
    `status` ENUM('ACTIVE', 'GRADUATED') NOT NULL DEFAULT 'ACTIVE',
    `graduatedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Grade_majorId_idx`(`majorId`),
    INDEX `Grade_status_idx`(`status`),
    UNIQUE INDEX `Grade_majorId_name_key`(`majorId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Course` (
    `id` CHAR(36) NOT NULL DEFAULT (uuid()),
    `name` VARCHAR(191) NOT NULL,
    `courseType` ENUM('PUBLIC', 'MAJOR') NOT NULL,
    `sourceType` ENUM('MANUAL', 'PLAN_IMPORT') NOT NULL DEFAULT 'MANUAL',
    `status` ENUM('ACTIVE', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',
    `majorId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Course_majorId_idx`(`majorId`),
    INDEX `Course_courseType_idx`(`courseType`),
    UNIQUE INDEX `Course_courseType_name_key`(`courseType`, `name`),
    UNIQUE INDEX `Course_majorId_name_key`(`majorId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TeachingPlan` (
    `id` VARCHAR(191) NOT NULL,
    `gradeId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TeachingPlan_gradeId_idx`(`gradeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TeachingPlanRow` (
    `id` VARCHAR(191) NOT NULL,
    `teachingPlanId` VARCHAR(191) NOT NULL,
    `termNo` INTEGER NOT NULL,
    `termType` ENUM('SCHOOL', 'INTERNSHIP') NOT NULL,
    `courseName` VARCHAR(191) NOT NULL,
    `courseId` CHAR(36) NULL,
    `weeklyHoursRaw` VARCHAR(191) NOT NULL,
    `weeklyHoursValue` DECIMAL(10, 2) NULL,
    `teacherName` VARCHAR(191) NULL,
    `remark` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TeachingPlanRow_teachingPlanId_idx`(`teachingPlanId`),
    INDEX `TeachingPlanRow_courseId_idx`(`courseId`),
    INDEX `TeachingPlanRow_termNo_termType_idx`(`termNo`, `termType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Grade` ADD CONSTRAINT `Grade_majorId_fkey` FOREIGN KEY (`majorId`) REFERENCES `Major`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Course` ADD CONSTRAINT `Course_majorId_fkey` FOREIGN KEY (`majorId`) REFERENCES `Major`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeachingPlan` ADD CONSTRAINT `TeachingPlan_gradeId_fkey` FOREIGN KEY (`gradeId`) REFERENCES `Grade`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeachingPlanRow` ADD CONSTRAINT `TeachingPlanRow_teachingPlanId_fkey` FOREIGN KEY (`teachingPlanId`) REFERENCES `TeachingPlan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeachingPlanRow` ADD CONSTRAINT `TeachingPlanRow_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `Course`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
