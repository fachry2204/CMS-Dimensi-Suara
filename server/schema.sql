-- Database Schema for Dimensi Suara CMS

CREATE DATABASE IF NOT EXISTS dimensi_suara_db;
USE dimensi_suara_db;

-- 1. Users Table (Admin/Operator/User)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('Admin', 'Operator', 'User') DEFAULT 'User',
    status ENUM('Active', 'Inactive') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Saved Songwriters (Master Data)
CREATE TABLE IF NOT EXISTS saved_songwriters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(50),
    nik VARCHAR(50),
    npwp VARCHAR(50),
    country VARCHAR(100),
    province VARCHAR(100),
    city VARCHAR(100),
    district VARCHAR(100),
    village VARCHAR(100),
    postal_code VARCHAR(20),
    address1 TEXT,
    address2 TEXT,
    bank_name VARCHAR(100),
    bank_branch VARCHAR(100),
    account_name VARCHAR(100),
    account_number VARCHAR(50),
    publisher VARCHAR(100),
    ipi VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Releases
CREATE TABLE IF NOT EXISTS releases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT, -- Who submitted it
    title VARCHAR(255) NOT NULL,
    upc VARCHAR(50),
    status ENUM('Pending', 'Processing', 'Live', 'Rejected', 'Draft') DEFAULT 'Draft',
    submission_date DATE,
    aggregator VARCHAR(50),
    cover_art VARCHAR(255),
    language VARCHAR(50),
    primary_artists JSON, -- Array of strings
    label VARCHAR(100),
    version VARCHAR(50),
    release_type ENUM('SINGLE', 'ALBUM'),
    is_new_release BOOLEAN,
    original_release_date DATE,
    planned_release_date DATE,
    rejection_reason TEXT,
    rejection_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 4. Tracks
CREATE TABLE IF NOT EXISTS tracks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    release_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    isrc VARCHAR(50),
    track_number VARCHAR(10),
    disk_number VARCHAR(10) DEFAULT '1',
    duration VARCHAR(20),
    audio_file VARCHAR(255),
    release_date DATE,
    genre VARCHAR(100),
    explicit_lyrics VARCHAR(20), -- Yes, No, Clean
    composer VARCHAR(255),
    lyricist VARCHAR(255),
    lyrics TEXT,
    artists JSON, -- Array of objects {name, role}
    contributors JSON, -- Array of objects {name, type, role}
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE
);

-- 5. Publishing Registrations
CREATE TABLE IF NOT EXISTS publishing_registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    title VARCHAR(255) NOT NULL,
    song_code VARCHAR(50),
    status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
    submission_date DATE,
    other_title VARCHAR(255),
    sample_link TEXT,
    rights_granted JSON, -- {synchronization: true, ...}
    performer VARCHAR(255),
    duration VARCHAR(20),
    genre VARCHAR(100),
    language VARCHAR(50),
    region VARCHAR(100),
    iswc VARCHAR(50),
    isrc VARCHAR(50),
    lyrics TEXT,
    note TEXT,
    songwriters JSON, -- Array of {id, name, role, share}
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 6. Reports (Revenue Data)
CREATE TABLE IF NOT EXISTS reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    period VARCHAR(20) NOT NULL, -- YYYY-MM
    upc VARCHAR(50),
    isrc VARCHAR(50),
    title VARCHAR(255),
    artist VARCHAR(255),
    platform VARCHAR(100),
    country VARCHAR(50),
    quantity INT DEFAULT 0,
    revenue DECIMAL(15, 4) DEFAULT 0,
    original_file_name VARCHAR(255),
    upload_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('Pending', 'Reviewed') DEFAULT 'Pending',
    verification_status ENUM('Unchecked', 'Valid', 'No User') DEFAULT 'Unchecked',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default Admin User (Password: admin123)
-- Hash generated via bcrypt (cost 10)
INSERT INTO users (username, email, password_hash, role, status) 
VALUES ('admin', 'admin@dimensisuara.com', '$2b$10$5yTRGLzhuaO0aET1Vs2/M.BjjM/QJc2SeFe/d0nwpkUisUYbgzDHS', 'Admin', 'Active')
ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash);
