-- 1. Users
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('Admin', 'Operator', 'User') DEFAULT 'User',
    status ENUM('Active', 'Inactive') DEFAULT 'Active',
    joined_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    profile_picture VARCHAR(255)
);

-- 2. Songwriters
CREATE TABLE IF NOT EXISTS songwriters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT, -- Owner of this songwriter profile
    name VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
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

-- 6. Reports (Revenue/Analytics)
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
