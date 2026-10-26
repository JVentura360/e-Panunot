
CREATE DATABASE IF NOT EXISTS epanunot_db
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE epanunot_db;

CREATE TABLE terms (
    id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    school_year VARCHAR(9)  NOT NULL,                
    semester    TINYINT UNSIGNED NOT NULL,           
    starts_on   DATE NOT NULL,
    ends_on     DATE NOT NULL,
    is_active   TINYINT(1) NOT NULL DEFAULT 0,
    created_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_term (school_year, semester),
    CONSTRAINT chk_term_semester CHECK (semester IN (1, 2))
) ENGINE=InnoDB;

CREATE TABLE blocks (
    id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    term_id      BIGINT UNSIGNED NOT NULL,
    program      VARCHAR(20)  NOT NULL,            
    year_level   TINYINT UNSIGNED NOT NULL,        
    block_number TINYINT UNSIGNED NOT NULL,
    google_calendar_id VARCHAR(255) NULL AFTER mayor_id;        
    mayor_id     BIGINT UNSIGNED NULL,
    created_at   TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE CASCADE,
    UNIQUE KEY uq_block_per_term      (term_id, program, year_level, block_number),
    UNIQUE KEY uq_one_mayor_per_term  (term_id, mayor_id)
) ENGINE=InnoDB;

CREATE TABLE users (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    google_id   VARCHAR(255) NULL UNIQUE,
    name        VARCHAR(255) NOT NULL,
    email       VARCHAR(255) NOT NULL UNIQUE,
    role        ENUM('student','mayor','admin') NOT NULL DEFAULT 'student',
    picture_url TEXT NULL,
    block_id    BIGINT UNSIGNED NULL,
    created_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_block FOREIGN KEY (block_id)
        REFERENCES blocks(id) ON DELETE SET NULL
) ENGINE=InnoDB;

ALTER TABLE blocks
    ADD CONSTRAINT fk_blocks_mayor FOREIGN KEY (mayor_id)
        REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE subjects (
    id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code       VARCHAR(20)  NOT NULL UNIQUE,
    name       VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE block_subjects (
    block_id   BIGINT UNSIGNED NOT NULL,
    subject_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (block_id, subject_id),
    FOREIGN KEY (block_id)   REFERENCES blocks(id)   ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE block_join_requests (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT UNSIGNED NOT NULL,
    block_id    BIGINT UNSIGNED NOT NULL,
    status      ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    reviewed_by BIGINT UNSIGNED NULL,
    reviewed_at TIMESTAMP NULL DEFAULT NULL,
    created_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)     REFERENCES users(id)  ON DELETE CASCADE,
    FOREIGN KEY (block_id)    REFERENCES blocks(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id)  ON DELETE SET NULL,
    INDEX idx_join_requests_block_status (block_id, status)
) ENGINE=InnoDB;

CREATE TABLE mayor_applications (
    id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    term_id      BIGINT UNSIGNED NOT NULL,
    user_id      BIGINT UNSIGNED NOT NULL,
    program      VARCHAR(20)  NOT NULL,
    year_level   TINYINT UNSIGNED NOT NULL,
    block_number TINYINT UNSIGNED NOT NULL,
    block_id     BIGINT UNSIGNED NULL,             
    motivation   TEXT NULL,
    status       ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    reviewed_by  BIGINT UNSIGNED NULL,
    reviewed_at  TIMESTAMP NULL DEFAULT NULL,
    created_at   TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (term_id)     REFERENCES terms(id)  ON DELETE CASCADE,
    FOREIGN KEY (user_id)     REFERENCES users(id)  ON DELETE CASCADE,
    FOREIGN KEY (block_id)    REFERENCES blocks(id) ON DELETE SET NULL,
    FOREIGN KEY (reviewed_by) REFERENCES users(id)  ON DELETE SET NULL,
    INDEX idx_mayor_apps_term_status (term_id, status, program, year_level, block_number)
) ENGINE=InnoDB;

CREATE TABLE announcements (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    block_id    BIGINT UNSIGNED NOT NULL,
    title       VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    created_by  BIGINT UNSIGNED NULL,
    created_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (block_id)   REFERENCES blocks(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)  ON DELETE SET NULL,
    INDEX idx_announcements_block_created (block_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE tasks (
    id                        BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    block_id                  BIGINT UNSIGNED NULL,
    created_by                BIGINT UNSIGNED NULL,
    subject_id                BIGINT UNSIGNED NULL,
    title                     VARCHAR(255) NOT NULL,
    description               TEXT NULL,
    platform                  VARCHAR(50) NULL,   
    due_date                  DATETIME NOT NULL,
    reminder_interval_minutes INT UNSIGNED NOT NULL DEFAULT 1440,
    google_event_id           VARCHAR(255) NULL,
    created_at                TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (block_id)   REFERENCES blocks(id)   ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)    ON DELETE SET NULL,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
    INDEX idx_tasks_due_date (due_date),
    INDEX idx_tasks_block (block_id)
) ENGINE=InnoDB;

CREATE TABLE task_assignments (
    id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    task_id          BIGINT UNSIGNED NOT NULL,
    user_id          BIGINT UNSIGNED NOT NULL,
    completed_at     TIMESTAMP NULL DEFAULT NULL,
    last_reminded_at TIMESTAMP NULL DEFAULT NULL,
    reminders_sent   INT UNSIGNED NOT NULL DEFAULT 0,
    created_at       TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uq_assignment (task_id, user_id),
    INDEX idx_assignments_pending (user_id, completed_at)
) ENGINE=InnoDB;

CREATE TABLE concerns (
    id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    block_id       BIGINT UNSIGNED NOT NULL,
    student_id     BIGINT UNSIGNED NOT NULL,
    subject_id     BIGINT UNSIGNED NULL,
    title          VARCHAR(255) NOT NULL,
    category       ENUM('academic','schedule','other') NOT NULL DEFAULT 'other',
    description    TEXT NOT NULL,
    status         ENUM('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
    student_unread TINYINT(1) NOT NULL DEFAULT 0,
    mayor_unread   TINYINT(1) NOT NULL DEFAULT 1,
    created_at     TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (block_id)   REFERENCES blocks(id)   ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id)    ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
    INDEX idx_concerns_block_status (block_id, status),
    INDEX idx_concerns_student (student_id)
) ENGINE=InnoDB;

CREATE TABLE conversation_messages (
    id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    concern_id   BIGINT UNSIGNED NOT NULL,
    sender_id    BIGINT UNSIGNED NULL,
    type         ENUM('message','system') NOT NULL DEFAULT 'message',
    message_text TEXT NOT NULL,
    created_at   TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (concern_id) REFERENCES concerns(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id)  REFERENCES users(id)    ON DELETE SET NULL,
    INDEX idx_messages_concern (concern_id)
) ENGINE=InnoDB;

CREATE TABLE concern_attachments (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    concern_id    BIGINT UNSIGNED NOT NULL,
    file_path     VARCHAR(500) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type     VARCHAR(100) NULL,
    size_bytes    INT UNSIGNED NULL,
    created_at    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (concern_id) REFERENCES concerns(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE calendar_events (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    block_id        BIGINT UNSIGNED NULL,
    created_by      BIGINT UNSIGNED NULL,
    subject_id      BIGINT UNSIGNED NULL,
    title           VARCHAR(255) NOT NULL,
    starts_at       DATETIME NOT NULL,
    ends_at         DATETIME NOT NULL,
    google_event_id VARCHAR(255) NULL,
    created_at      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (block_id)   REFERENCES blocks(id)   ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)    ON DELETE SET NULL,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
    INDEX idx_events_block_starts   (block_id, starts_at),
    INDEX idx_events_creator_starts (created_by, starts_at)
) ENGINE=InnoDB;

CREATE TABLE personal_todos (
    id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id        BIGINT UNSIGNED NOT NULL,
    title          VARCHAR(255) NOT NULL,
    is_done        TINYINT(1) NOT NULL DEFAULT 0,
    google_task_id VARCHAR(255) NULL,
    created_at     TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_todos_user_done (user_id, is_done)
) ENGINE=InnoDB;
