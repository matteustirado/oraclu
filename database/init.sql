CREATE DATABASE IF NOT EXISTS oraclu_db;
USE oraclu_db;

-- ==========================================
-- 1. USUÁRIOS E PERMISSÕES
-- ==========================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL, -- 'super', 'admin', 'adminsp', 'adminbh', 'surveysp', 'surveybh'
    unit VARCHAR(10) NOT NULL, -- 'SP', 'BH', 'BOTH'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 2. PREDEFINIÇÕES (O Grupo de Perguntas)
-- ==========================================
CREATE TABLE IF NOT EXISTS survey_presets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    unit VARCHAR(10) NOT NULL, -- 'SP', 'BH', 'BOTH'
    is_active TINYINT(1) DEFAULT 0,
    is_deleted TINYINT(1) DEFAULT 0, -- Soft Delete: 1 = apagado da interface, mas salvo no histórico
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 3. PERGUNTAS DINÂMICAS
-- ==========================================
CREATE TABLE IF NOT EXISTS survey_questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    preset_id INT NOT NULL,
    question_text VARCHAR(255) NOT NULL,
    question_type VARCHAR(50) NOT NULL, -- 'SCALE_10', 'YES_NO', 'EMOJI', 'THIS_THAT'
    image_a_url VARCHAR(255), -- Usado apenas se for 'THIS_THAT'
    image_b_url VARCHAR(255), -- Usado apenas se for 'THIS_THAT'
    order_index INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (preset_id) REFERENCES survey_presets(id) ON DELETE CASCADE
);

-- ==========================================
-- 4. A SESSÃO DE RESPOSTA DO CLIENTE
-- ==========================================
CREATE TABLE IF NOT EXISTS survey_responses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    preset_id INT NOT NULL,
    client_code VARCHAR(50) NOT NULL,
    unit VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (preset_id) REFERENCES survey_presets(id)
);

-- ==========================================
-- 5. OS VOTOS INDIVIDUAIS
-- ==========================================
CREATE TABLE IF NOT EXISTS survey_answers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    response_id INT NOT NULL,
    question_id INT NOT NULL,
    answer_value VARCHAR(255) NOT NULL, -- Armazena '10', 'YES', 'SMILE_EMOJI', 'IMAGE_A'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (response_id) REFERENCES survey_responses(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES survey_questions(id)
);

-- ==========================================
-- 6. VOUCHERS E ANTI-SPAM
-- ==========================================
CREATE TABLE IF NOT EXISTS vouchers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_code VARCHAR(50) NOT NULL UNIQUE,
    voucher_code VARCHAR(20) NOT NULL UNIQUE,
    is_used TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 7. SEED DE USUÁRIOS INICIAIS
-- Nota Técnica: Estou inserindo as senhas puras aqui para facilitar o reset.
-- Quando formos programar o authController.js, eu farei uma trava que converte 
-- essas senhas para BCRYPT automaticamente no primeiro login.
-- ==========================================
INSERT IGNORE INTO users (username, password_hash, role, unit) VALUES 
('super', 'superMatteus76', 'super', 'BOTH'),
('admin', 'adminjonas01', 'admin', 'BOTH'),
('adminsp', 'adminspale01', 'adminsp', 'SP'),
('adminbh', 'adminbhluiz01', 'adminbh', 'BH'),
('surveysp', 'surveyspale01', 'surveysp', 'SP'),
('surveybh', 'surveybhluiz01', 'surveybh', 'BH');