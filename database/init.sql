CREATE DATABASE IF NOT EXISTS oraclu_db;
USE oraclu_db;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    unit VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS survey_presets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    unit VARCHAR(10) NOT NULL,
    is_active TINYINT(1) DEFAULT 0,
    is_deleted TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- NOVA TABELA: Gerencia as Páginas, seus títulos e regras condicionais
CREATE TABLE IF NOT EXISTS survey_pages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    preset_id INT NOT NULL,
    page_number INT NOT NULL,
    title VARCHAR(255) DEFAULT '',
    is_conditional TINYINT(1) DEFAULT 0,
    cond_question_id INT DEFAULT NULL,
    cond_value VARCHAR(50) DEFAULT NULL,
    FOREIGN KEY (preset_id) REFERENCES survey_presets(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS survey_questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    preset_id INT NOT NULL,
    page_number INT DEFAULT 1,
    question_text VARCHAR(255) NOT NULL,
    question_type VARCHAR(50) NOT NULL, 
    image_a_url VARCHAR(255), 
    image_b_url VARCHAR(255), 
    order_index INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (preset_id) REFERENCES survey_presets(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS survey_responses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    preset_id INT NOT NULL,
    client_code VARCHAR(50) NOT NULL,
    client_name VARCHAR(100) DEFAULT NULL, -- ADICIONADO: Nome real do cliente
    unit VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (preset_id) REFERENCES survey_presets(id)
);

CREATE TABLE IF NOT EXISTS survey_answers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    response_id INT NOT NULL,
    question_id INT NOT NULL,
    answer_value VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (response_id) REFERENCES survey_responses(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES survey_questions(id)
);

CREATE TABLE IF NOT EXISTS vouchers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_code VARCHAR(50) NOT NULL UNIQUE,
    voucher_code VARCHAR(20) NOT NULL UNIQUE,
    is_used TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS survey_coupons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    unit VARCHAR(10) NOT NULL,
    client_code VARCHAR(50) NOT NULL,
    operation_date DATE NOT NULL,
    legacy_coupon_id VARCHAR(50) NULL,
    legacy_type INT NOT NULL DEFAULT 8,
    status ENUM('pending', 'created', 'failed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_coupon_per_client_day (unit, client_code, operation_date)
);

INSERT IGNORE INTO users (username, password_hash, role, unit) VALUES 
('super', 'superMatteus76', 'super', 'BOTH'),
('admin', 'adminjonas01', 'admin', 'BOTH'),
('adminsp', 'adminspale01', 'adminsp', 'SP'),
('adminbh', 'adminbhluiz01', 'adminbh', 'BH'),
('surveysp', 'surveyspale01', 'surveysp', 'SP'),
('surveybh', 'surveybhluiz01', 'surveybh', 'BH');