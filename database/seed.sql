-- Seed initial data for testing and production setup

USE college_academic_db;

-- 1. Default Colleges
INSERT INTO colleges (code, name, university, state, contact_email, contact_phone, status) VALUES
('COL001', 'Nagindas Khandwala College', 'University of Mumbai', 'Maharashtra', 'principal@nkc.edu.in', '9820011223', 'ACTIVE'),
('COL002', 'Lala Lajpat Rai College', 'University of Mumbai', 'Maharashtra', 'info@lalacollege.edu.in', '9820044556', 'ACTIVE'),
('COL003', 'Valia Chhaganlal Laljibhai College', 'University of Mumbai', 'Maharashtra', 'contact@valiacollege.edu.in', '9820077889', 'ACTIVE'),
('COL004', 'Bhavan\'s College', 'University of Mumbai', 'Maharashtra', 'admin@bhavans.ac.in', '9820099001', 'ACTIVE')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 2. Default Users (Admin + College Logins)
-- Password for admin: admin123 (hashed: $2b$10$vN0E0wWzO... or generated at db init)
-- Password for colleges: college123
INSERT INTO users (username, password, email, role, college_id, status) VALUES
('admin', '$2b$10$wO8S2c96y32xZ.m31i7bROu3x8Q7MhR/Vn0X7/6gV4Z9wY1kQzW7a', 'admin@edtechplatform.com', 'ADMIN', NULL, 'ACTIVE'),
('nkc_user', '$2b$10$wO8S2c96y32xZ.m31i7bROu3x8Q7MhR/Vn0X7/6gV4Z9wY1kQzW7a', 'principal@nkc.edu.in', 'COLLEGE', 1, 'ACTIVE'),
('lala_user', '$2b$10$wO8S2c96y32xZ.m31i7bROu3x8Q7MhR/Vn0X7/6gV4Z9wY1kQzW7a', 'info@lalacollege.edu.in', 'COLLEGE', 2, 'ACTIVE'),
('valia_user', '$2b$10$wO8S2c96y32xZ.m31i7bROu3x8Q7MhR/Vn0X7/6gV4Z9wY1kQzW7a', 'contact@valiacollege.edu.in', 'COLLEGE', 3, 'ACTIVE')
ON DUPLICATE KEY UPDATE email=VALUES(email);

-- 3. Default Academic Year
INSERT INTO academic_years (year_label, start_date, end_date, deadline, is_open) VALUES
('2025-2026', '2025-06-01', '2026-05-31', '2026-09-30 23:59:59', TRUE),
('2026-2027', '2026-06-01', '2027-05-31', '2027-09-30 23:59:59', TRUE)
ON DUPLICATE KEY UPDATE is_open=VALUES(is_open);

-- 4. Initial Audit Log Entry
INSERT INTO audit_logs (username, college_name, action, details) VALUES
('SYSTEM', 'EdTech Platform', 'SYSTEM_INITIALIZED', 'Initial database schema and default admin accounts seeded successfully.');
