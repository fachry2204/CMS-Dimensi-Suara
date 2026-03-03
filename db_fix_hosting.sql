-- Script ini untuk dijalankan di Database Manager Hosting Anda (contoh: phpMyAdmin)
-- Gunakan ini untuk memperbaiki tabel yang hilang atau kolom yang kurang.

-- 1. Buat Tabel Reports (Penting untuk menu Reports & Dashboard)
CREATE TABLE IF NOT EXISTS reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    period VARCHAR(20), -- YYYY-MM
    upc VARCHAR(50),
    isrc VARCHAR(50),
    title VARCHAR(255),
    artist VARCHAR(255),
    platform VARCHAR(100),
    country VARCHAR(100),
    quantity INT DEFAULT 0,
    revenue DECIMAL(15, 2) DEFAULT 0.00,
    original_file_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Pastikan kolom profile_picture ada di tabel users
SET @dbname = DATABASE();
SET @tablename = "users";
SET @columnname = "profile_picture";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD ", @columnname, " VARCHAR(255);")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 3. Pastikan kolom-kolom baru ada di tabel releases
-- (Cover Art, Primary Artists, P-Line, C-Line, dll)

-- Tambah cover_art
SET @columnname = "cover_art";
SET @tablename = "releases";
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE (table_name = @tablename) AND (table_schema = @dbname) AND (column_name = @columnname)) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD ", @columnname, " VARCHAR(255);")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Tambah primary_artists
SET @columnname = "primary_artists";
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE (table_name = @tablename) AND (table_schema = @dbname) AND (column_name = @columnname)) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD ", @columnname, " JSON;")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Tambah p_line
SET @columnname = "p_line";
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE (table_name = @tablename) AND (table_schema = @dbname) AND (column_name = @columnname)) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD ", @columnname, " VARCHAR(255);")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Tambah c_line
SET @columnname = "c_line";
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE (table_name = @tablename) AND (table_schema = @dbname) AND (column_name = @columnname)) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD ", @columnname, " VARCHAR(255);")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Tambah genre
SET @columnname = "genre";
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE (table_name = @tablename) AND (table_schema = @dbname) AND (column_name = @columnname)) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD ", @columnname, " VARCHAR(100);")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Tambah aggregator
SET @columnname = "aggregator";
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE (table_name = @tablename) AND (table_schema = @dbname) AND (column_name = @columnname)) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD ", @columnname, " VARCHAR(50);")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Hapus production_year jika ada (karena sudah diganti p_line/c_line)
-- DROP COLUMN production_year; -- Opsional, jalankan manual jika ingin bersih-bersih.

-- 4. Buat Tabel Login Settings (Untuk Branding Halaman Login)
CREATE TABLE IF NOT EXISTS login_settings (
    id INT PRIMARY KEY,
    logo VARCHAR(255),
    login_background VARCHAR(255),
    login_title VARCHAR(255) DEFAULT 'Agregator & Publishing Musik',
    login_footer TEXT,
    login_button_color VARCHAR(100) DEFAULT 'linear-gradient(to right, #2563eb, #0891b2)',
    login_form_bg_color VARCHAR(100) DEFAULT 'rgba(255, 255, 255, 0.9)',
    enable_registration ENUM('true', 'false') DEFAULT 'true',
    login_form_bg_opacity INT DEFAULT 90,
    login_bg_opacity INT DEFAULT 100,
    login_glass_effect ENUM('true', 'false') DEFAULT 'false',
    login_form_text_color VARCHAR(20) DEFAULT '#334155',
    login_title_color VARCHAR(20) DEFAULT '#1e293b',
    login_footer_color VARCHAR(20) DEFAULT '#94a3b8',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed default data jika kosong
INSERT IGNORE INTO login_settings (id, login_title, login_footer, login_button_color, login_form_bg_color, enable_registration, login_form_text_color)
VALUES (1, 'Agregator & Publishing Musik', 'Protected CMS Area. Authorized personnel only.', 'linear-gradient(to right, #2563eb, #0891b2)', 'rgba(255, 255, 255, 0.9)', 'true', '#334155');

-- 5. Pastikan kolom-kolom baru ada di tabel login_settings (jika tabel sudah ada sebelumnya)

-- Tambah login_title_color
SET @dbname = DATABASE();
SET @tablename = "login_settings";
SET @columnname = "login_title_color";
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE (table_name = @tablename) AND (table_schema = @dbname) AND (column_name = @columnname)) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD ", @columnname, " VARCHAR(20) DEFAULT '#1e293b';")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Tambah login_footer_color
SET @columnname = "login_footer_color";
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE (table_name = @tablename) AND (table_schema = @dbname) AND (column_name = @columnname)) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD ", @columnname, " VARCHAR(20) DEFAULT '#94a3b8';")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Tambah login_glass_effect
SET @columnname = "login_glass_effect";
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE (table_name = @tablename) AND (table_schema = @dbname) AND (column_name = @columnname)) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD ", @columnname, " ENUM('true', 'false') DEFAULT 'false';")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Tambah login_form_text_color
SET @columnname = "login_form_text_color";
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE (table_name = @tablename) AND (table_schema = @dbname) AND (column_name = @columnname)) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD ", @columnname, " VARCHAR(20) DEFAULT '#334155';")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Tambah login_form_bg_opacity
SET @columnname = "login_form_bg_opacity";
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE (table_name = @tablename) AND (table_schema = @dbname) AND (column_name = @columnname)) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD ", @columnname, " INT DEFAULT 90;")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Tambah login_bg_opacity
SET @columnname = "login_bg_opacity";
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE (table_name = @tablename) AND (table_schema = @dbname) AND (column_name = @columnname)) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD ", @columnname, " INT DEFAULT 100;")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;
