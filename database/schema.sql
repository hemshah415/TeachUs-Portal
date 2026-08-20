-- College Academic Data Management and Validation System Schema

CREATE DATABASE IF NOT EXISTS college_academic_db;
USE college_academic_db;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    role ENUM('ADMIN', 'COLLEGE') NOT NULL DEFAULT 'COLLEGE',
    college_id INT NULL,
    status ENUM('ACTIVE', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Colleges Table
CREATE TABLE IF NOT EXISTS colleges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    university VARCHAR(255) DEFAULT 'University of Mumbai',
    state VARCHAR(100) DEFAULT 'Maharashtra',
    contact_email VARCHAR(150) NOT NULL,
    contact_phone VARCHAR(50),
    status ENUM('ACTIVE', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Academic Years Table
CREATE TABLE IF NOT EXISTS academic_years (
    id INT AUTO_INCREMENT PRIMARY KEY,
    year_label VARCHAR(50) NOT NULL UNIQUE, -- e.g. "2025-2026"
    start_date DATE,
    end_date DATE,
    deadline DATETIME,
    is_open BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Templates Table
CREATE TABLE IF NOT EXISTS templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL DEFAULT 'v1.0',
    file_path VARCHAR(500) NOT NULL,
    academic_year_id INT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE SET NULL
);

-- 5. Uploads Table
CREATE TABLE IF NOT EXISTS uploads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    college_id INT NOT NULL,
    academic_year_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    student_count INT DEFAULT 0,
    validation_status ENUM('Pending', 'Processing', 'Passed', 'Failed') DEFAULT 'Pending',
    admin_status ENUM('Not Submitted', 'Under Review', 'Approved', 'Rejected', 'Correction Requested') DEFAULT 'Under Review',
    admin_remarks TEXT,
    error_count INT DEFAULT 0,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE,
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
);

-- 6. Validation Results Table
CREATE TABLE IF NOT EXISTS validation_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    upload_id INT NOT NULL UNIQUE,
    total_rows INT DEFAULT 0,
    passed_rows INT DEFAULT 0,
    error_count INT DEFAULT 0,
    report_path VARCHAR(500),
    status ENUM('Passed', 'Failed') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (upload_id) REFERENCES uploads(id) ON DELETE CASCADE
);

-- 7. Validation Errors Table
CREATE TABLE IF NOT EXISTS validation_errors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    upload_id INT NOT NULL,
    row_number INT NOT NULL,
    column_name VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    severity ENUM('ERROR', 'WARNING') DEFAULT 'ERROR',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (upload_id) REFERENCES uploads(id) ON DELETE CASCADE
);

-- 8. Students Table (Extracted valid data)
CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    upload_id INT NOT NULL,
    college_id INT NOT NULL,
    academic_year_id INT NOT NULL,
    roll_number VARCHAR(100) NOT NULL,
    student_name VARCHAR(255) NOT NULL,
    branch VARCHAR(100),
    semester INT,
    year INT,
    gender VARCHAR(20),
    dob VARCHAR(50),
    email VARCHAR(150),
    mobile_number VARCHAR(50),
    cgpa DECIMAL(4,2),
    percentage DECIMAL(5,2),
    enrollment_number VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (upload_id) REFERENCES uploads(id) ON DELETE CASCADE,
    FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE,
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
);

-- 9. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    username VARCHAR(100),
    college_name VARCHAR(255),
    action VARCHAR(255) NOT NULL,
    details TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
