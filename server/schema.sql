-- 1. Users
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('Admin', 'Operator', 'User') DEFAULT 'User',
    status ENUM('Pending', 'Review', 'Approved', 'Active', 'Inactive') DEFAULT 'Pending',
    joined_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    profile_picture VARCHAR(255),
    account_type ENUM('PERSONAL', 'COMPANY') DEFAULT 'PERSONAL',
    company_name VARCHAR(255),
    nik VARCHAR(32),
    full_name VARCHAR(255),
    address TEXT,
    country VARCHAR(100),
    province VARCHAR(100),
    city VARCHAR(100),
    district VARCHAR(100),
    subdistrict VARCHAR(100),
    postal_code VARCHAR(20),
    phone VARCHAR(50),
    pic_name VARCHAR(255),
    pic_position VARCHAR(255),
    pic_phone VARCHAR(50),
    nib_doc_path VARCHAR(255),
    kemenkumham_doc_path VARCHAR(255),
    ktp_doc_path VARCHAR(255),
    npwp_doc_path VARCHAR(255),
    signature_doc_path VARCHAR(255),
    profile_json JSON
);

-- 2. Releases
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
    p_line VARCHAR(255),
    c_line VARCHAR(255),
    genre VARCHAR(100),
    sub_genre VARCHAR(100),
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
    version VARCHAR(100),
    isrc VARCHAR(50),
    track_number VARCHAR(10),
    disk_number VARCHAR(10) DEFAULT '1',
    duration VARCHAR(20),
    audio_file VARCHAR(255),
    release_date DATE,
    genre VARCHAR(100),
    sub_genre VARCHAR(100),
    explicit_lyrics VARCHAR(20), -- Yes, No, Clean
    explicit BOOLEAN, -- Alternative boolean flag
    primary_artists TEXT, -- JSON string or text
    featured_artists TEXT, -- JSON string or text
    writer TEXT, -- JSON string or text
    composer TEXT, -- JSON string or text
    producer TEXT, -- JSON string or text
    lyricist TEXT,
    lyrics TEXT,
    contributors JSON, -- Array of objects {name, type, role}
    preview_start INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE
);

-- 5. Publishing Registrations (Removed)

-- 6. Reports (Distribution Revenue)
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

-- 7. Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'system', 'release', 'payment', etc.
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 8. Publishing Module

CREATE TABLE IF NOT EXISTS writers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    nik VARCHAR(50),
    birth_place VARCHAR(100),
    birth_date DATE,
    address TEXT,
    religion VARCHAR(50),
    marital_status VARCHAR(50),
    occupation VARCHAR(100),
    nationality VARCHAR(100),
    ktp_path VARCHAR(255),
    npwp_path VARCHAR(255),
    bank_name VARCHAR(100),
    bank_account_name VARCHAR(255),
    bank_account_number VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS songs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    song_id VARCHAR(100), -- Custom ID or from user
    title VARCHAR(255) NOT NULL,
    other_title VARCHAR(255),
    authorized_rights VARCHAR(255),
    performer VARCHAR(255),
    duration VARCHAR(20),
    genre VARCHAR(100),
    language VARCHAR(50),
    region VARCHAR(100),
    iswc VARCHAR(50),
    isrc VARCHAR(50),
    note TEXT,
    status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
    rejection_reason TEXT,
    lyrics_file VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS song_writers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    song_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    share_percent DECIMAL(5, 2) DEFAULT 0,
    role VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS publishing_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    song_id INT,
    custom_id VARCHAR(100),
    title VARCHAR(255),
    writer VARCHAR(255),
    source VARCHAR(100),
    gross_revenue DECIMAL(15, 2) DEFAULT 0,
    deduction DECIMAL(15, 2) DEFAULT 0,
    net_revenue DECIMAL(15, 2) DEFAULT 0,
    sub_pub_share DECIMAL(15, 2) DEFAULT 0,
    tbw_share DECIMAL(15, 2) DEFAULT 0,
    month INT,
    year INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS import_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    file_name VARCHAR(255),
    month INT,
    year INT,
    period VARCHAR(50),
    total_records INT,
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
