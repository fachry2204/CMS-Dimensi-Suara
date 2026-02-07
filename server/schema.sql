-- Database Schema for Dimensi Suara CMS

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('Admin', 'Operator', 'User') DEFAULT 'User',
    status ENUM('Active', 'Inactive') DEFAULT 'Active',
    profile_picture VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    type VARCHAR(50),
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Saved Songwriters (Master Data)
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

-- 4. Releases
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

-- 5. Tracks
CREATE TABLE IF NOT EXISTS tracks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    release_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    version VARCHAR(100),
    isrc VARCHAR(50),
    track_number VARCHAR(10),
    disk_number VARCHAR(10) DEFAULT '1',
    duration VARCHAR(20),
    audio_file VARCHAR(255),
    release_date DATE,
    genre VARCHAR(100),
    explicit_lyrics VARCHAR(20), -- Yes, No, Clean
    explicit BOOLEAN, -- Alternative boolean flag
    primary_artists TEXT, -- JSON string or text
    writer TEXT, -- JSON string or text
    composer TEXT, -- JSON string or text
    producer TEXT, -- JSON string or text
    lyrics TEXT,
    contributors JSON, -- Array of objects {name, type, role}
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE
);

-- 6. Publishing Registrations
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
