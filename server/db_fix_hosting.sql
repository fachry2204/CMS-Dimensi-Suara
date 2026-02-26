
-- Script untuk memperbaiki database di Hosting (jalankan di phpMyAdmin)

-- 1. Tambahkan kolom yang hilang di tabel tracks
-- Menggunakan syntax yang aman (akan error jika kolom sudah ada, abaikan saja error 'Duplicate column name')

ALTER TABLE `tracks` ADD COLUMN `audio_file` VARCHAR(1024) NULL;
ALTER TABLE `tracks` ADD COLUMN `audio_clip` VARCHAR(1024) NULL;
ALTER TABLE `tracks` ADD COLUMN `ipl_file` VARCHAR(1024) NULL;
ALTER TABLE `tracks` ADD COLUMN `is_instrumental` TINYINT(1) NULL DEFAULT 0;
ALTER TABLE `tracks` ADD COLUMN `lyrics` MEDIUMTEXT NULL;
ALTER TABLE `tracks` ADD COLUMN `preview_start` INT DEFAULT 0;

-- 2. Tambahkan kolom yang hilang di tabel releases
ALTER TABLE `releases` ADD COLUMN `cover_art` VARCHAR(1024) NULL;
ALTER TABLE `releases` ADD COLUMN `primary_artists` JSON NULL;
ALTER TABLE `releases` ADD COLUMN `original_release_date` DATE NULL;
ALTER TABLE `releases` ADD COLUMN `planned_release_date` DATE NULL;
ALTER TABLE `releases` ADD COLUMN `upc` VARCHAR(50) NULL;
ALTER TABLE `releases` ADD COLUMN `aggregator` VARCHAR(100) NULL;

-- 3. Perbesar ukuran kolom jika sudah ada tapi terlalu pendek
ALTER TABLE `tracks` MODIFY COLUMN `audio_file` VARCHAR(1024) NULL;
ALTER TABLE `tracks` MODIFY COLUMN `audio_clip` VARCHAR(1024) NULL;
ALTER TABLE `tracks` MODIFY COLUMN `ipl_file` VARCHAR(1024) NULL;
ALTER TABLE `releases` MODIFY COLUMN `cover_art` VARCHAR(1024) NULL;

-- 4. Pastikan tabel penunjang ada
CREATE TABLE IF NOT EXISTS `track_contributors` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `track_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `type` VARCHAR(100) NULL,
  `role` VARCHAR(100) NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_track_contributors_track_id` (`track_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
