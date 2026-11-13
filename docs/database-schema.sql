-- ePanunot MySQL/MariaDB schema generated from Laravel migrations.
-- Import ONLY into an empty, already selected database. No application records or accounts.
-- Migration history rows are included so subsequent artisan migrate runs do not recreate tables.
-- Prefer artisan migrate for deployment; regenerate this reference after schema changes.
-- Generated 2026-11-13; 29 tables.

SET @EPANUNOT_OLD_FK_CHECKS = @@FOREIGN_KEY_CHECKS;
SET FOREIGN_KEY_CHECKS=0;

CREATE TABLE `announcements` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `block_id` bigint(20) unsigned NOT NULL,
  `subject_id` bigint(20) unsigned DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `announcements_created_by_foreign` (`created_by`),
  KEY `announcements_block_id_created_at_index` (`block_id`,`created_at`),
  KEY `announcements_subject_id_foreign` (`subject_id`),
  CONSTRAINT `announcements_block_id_foreign` FOREIGN KEY (`block_id`) REFERENCES `blocks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `announcements_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `announcements_subject_id_foreign` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `block_join_requests` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `block_id` bigint(20) unsigned NOT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `reviewed_by` bigint(20) unsigned DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `student_type` varchar(16) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `block_join_requests_reviewed_by_foreign` (`reviewed_by`),
  KEY `block_join_requests_block_id_status_index` (`block_id`,`status`),
  KEY `block_join_requests_user_id_status_index` (`user_id`,`status`),
  CONSTRAINT `block_join_requests_block_id_foreign` FOREIGN KEY (`block_id`) REFERENCES `blocks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `block_join_requests_reviewed_by_foreign` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `block_join_requests_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `block_subjects` (
  `block_id` bigint(20) unsigned NOT NULL,
  `subject_id` bigint(20) unsigned NOT NULL,
  PRIMARY KEY (`block_id`,`subject_id`),
  KEY `block_subjects_subject_id_foreign` (`subject_id`),
  CONSTRAINT `block_subjects_block_id_foreign` FOREIGN KEY (`block_id`) REFERENCES `blocks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `block_subjects_subject_id_foreign` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `blocks` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `term_id` bigint(20) unsigned NOT NULL,
  `program` varchar(20) NOT NULL,
  `year_level` tinyint(3) unsigned NOT NULL,
  `block_number` tinyint(3) unsigned NOT NULL,
  `mayor_id` bigint(20) unsigned DEFAULT NULL,
  `google_calendar_id` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `blocks_term_id_program_year_level_block_number_unique` (`term_id`,`program`,`year_level`,`block_number`),
  UNIQUE KEY `blocks_term_id_mayor_id_unique` (`term_id`,`mayor_id`),
  KEY `blocks_mayor_id_foreign` (`mayor_id`),
  CONSTRAINT `blocks_mayor_id_foreign` FOREIGN KEY (`mayor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `blocks_term_id_foreign` FOREIGN KEY (`term_id`) REFERENCES `terms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `cache` (
  `key` varchar(255) NOT NULL,
  `value` mediumtext NOT NULL,
  `expiration` bigint(20) NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `cache_locks` (
  `key` varchar(255) NOT NULL,
  `owner` varchar(255) NOT NULL,
  `expiration` bigint(20) NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_locks_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `calendar_events` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `block_id` bigint(20) unsigned DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `subject_id` bigint(20) unsigned DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `starts_at` datetime NOT NULL,
  `ends_at` datetime NOT NULL,
  `google_event_id` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `calendar_events_subject_id_foreign` (`subject_id`),
  KEY `calendar_events_block_id_starts_at_index` (`block_id`,`starts_at`),
  KEY `calendar_events_created_by_starts_at_index` (`created_by`,`starts_at`),
  CONSTRAINT `calendar_events_block_id_foreign` FOREIGN KEY (`block_id`) REFERENCES `blocks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `calendar_events_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `calendar_events_subject_id_foreign` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `concern_attachments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `concern_id` bigint(20) unsigned NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `size_bytes` int(10) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `concern_attachments_concern_id_foreign` (`concern_id`),
  CONSTRAINT `concern_attachments_concern_id_foreign` FOREIGN KEY (`concern_id`) REFERENCES `concerns` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `concerns` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `block_id` bigint(20) unsigned NOT NULL,
  `student_id` bigint(20) unsigned NOT NULL,
  `subject_id` bigint(20) unsigned DEFAULT NULL,
  `task_id` bigint(20) unsigned DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `category` enum('academic','schedule','other') NOT NULL DEFAULT 'other',
  `description` text NOT NULL,
  `status` enum('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
  `student_unread` tinyint(1) NOT NULL DEFAULT 0,
  `mayor_unread` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `student_removed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `concerns_student_id_foreign` (`student_id`),
  KEY `concerns_subject_id_foreign` (`subject_id`),
  KEY `concerns_block_id_status_index` (`block_id`,`status`),
  KEY `concerns_task_id_foreign` (`task_id`),
  CONSTRAINT `concerns_block_id_foreign` FOREIGN KEY (`block_id`) REFERENCES `blocks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `concerns_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `concerns_subject_id_foreign` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE SET NULL,
  CONSTRAINT `concerns_task_id_foreign` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `conversation_messages` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `concern_id` bigint(20) unsigned NOT NULL,
  `sender_id` bigint(20) unsigned DEFAULT NULL,
  `type` enum('message','system') NOT NULL DEFAULT 'message',
  `message_text` text NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `conversation_messages_concern_id_foreign` (`concern_id`),
  KEY `conversation_messages_sender_id_foreign` (`sender_id`),
  CONSTRAINT `conversation_messages_concern_id_foreign` FOREIGN KEY (`concern_id`) REFERENCES `concerns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `conversation_messages_sender_id_foreign` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `failed_jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) NOT NULL,
  `connection` varchar(255) NOT NULL,
  `queue` varchar(255) NOT NULL,
  `payload` longtext NOT NULL,
  `exception` longtext NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`),
  KEY `failed_jobs_connection_queue_failed_at_index` (`connection`,`queue`,`failed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `job_batches` (
  `id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `total_jobs` int(11) NOT NULL,
  `pending_jobs` int(11) NOT NULL,
  `failed_jobs` int(11) NOT NULL,
  `failed_job_ids` longtext NOT NULL,
  `options` mediumtext DEFAULT NULL,
  `cancelled_at` int(11) DEFAULT NULL,
  `created_at` int(11) NOT NULL,
  `finished_at` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) NOT NULL,
  `payload` longtext NOT NULL,
  `attempts` smallint(5) unsigned NOT NULL,
  `reserved_at` int(10) unsigned DEFAULT NULL,
  `available_at` int(10) unsigned NOT NULL,
  `created_at` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `mayor_applications` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `term_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `program` varchar(20) NOT NULL,
  `year_level` tinyint(3) unsigned NOT NULL,
  `block_number` tinyint(3) unsigned NOT NULL,
  `block_id` bigint(20) unsigned DEFAULT NULL,
  `motivation` text DEFAULT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `reviewed_by` bigint(20) unsigned DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `proposed_subjects` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`proposed_subjects`)),
  `subject_load_revision` int(10) unsigned DEFAULT NULL,
  `is_regular_student` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `mayor_applications_user_id_foreign` (`user_id`),
  KEY `mayor_applications_block_id_foreign` (`block_id`),
  KEY `mayor_applications_reviewed_by_foreign` (`reviewed_by`),
  KEY `idx_mayor_apps_lookup` (`term_id`,`status`,`program`,`year_level`,`block_number`),
  CONSTRAINT `mayor_applications_block_id_foreign` FOREIGN KEY (`block_id`) REFERENCES `blocks` (`id`) ON DELETE SET NULL,
  CONSTRAINT `mayor_applications_reviewed_by_foreign` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `mayor_applications_term_id_foreign` FOREIGN KEY (`term_id`) REFERENCES `terms` (`id`) ON DELETE CASCADE,
  CONSTRAINT `mayor_applications_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `migrations` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) NOT NULL,
  `batch` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `notifications` (
  `id` char(36) NOT NULL,
  `type` varchar(255) NOT NULL,
  `notifiable_type` varchar(255) NOT NULL,
  `notifiable_id` bigint(20) unsigned NOT NULL,
  `data` text NOT NULL,
  `read_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `notifications_notifiable_type_notifiable_id_index` (`notifiable_type`,`notifiable_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `offline_operations` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `operation_id` char(36) NOT NULL,
  `payload_hash` varchar(64) NOT NULL,
  `client_id` char(36) DEFAULT NULL,
  `result` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`result`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `offline_operations_user_id_operation_id_unique` (`user_id`,`operation_id`),
  KEY `offline_operations_user_id_client_id_index` (`user_id`,`client_id`),
  CONSTRAINT `offline_operations_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `personal_access_tokens` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tokenable_type` varchar(255) NOT NULL,
  `tokenable_id` bigint(20) unsigned NOT NULL,
  `name` text NOT NULL,
  `token` varchar(64) NOT NULL,
  `abilities` text DEFAULT NULL,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`),
  KEY `personal_access_tokens_expires_at_index` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `personal_todos` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `title` varchar(255) NOT NULL,
  `due_date` date DEFAULT NULL,
  `is_done` tinyint(1) NOT NULL DEFAULT 0,
  `google_task_id` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `revision` int(10) unsigned NOT NULL DEFAULT 0,
  `client_id` char(36) DEFAULT NULL,
  `last_reminded_at` timestamp NULL DEFAULT NULL,
  `reminders_sent` tinyint(3) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_todos_user_id_client_id_unique` (`user_id`,`client_id`),
  KEY `personal_todos_user_id_is_done_index` (`user_id`,`is_done`),
  CONSTRAINT `personal_todos_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `push_subscriptions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `subscribable_type` varchar(255) NOT NULL,
  `subscribable_id` bigint(20) unsigned NOT NULL,
  `endpoint` varchar(1024) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `public_key` varchar(255) DEFAULT NULL,
  `auth_token` varchar(255) DEFAULT NULL,
  `content_encoding` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `push_subscriptions_endpoint_unique` (`endpoint`),
  KEY `push_subscriptions_subscribable_morph_idx` (`subscribable_type`,`subscribable_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `student_term_profiles` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `term_id` bigint(20) unsigned NOT NULL,
  `student_type` enum('regular','irregular') NOT NULL,
  `regular_block_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `student_term_profiles_user_id_term_id_unique` (`user_id`,`term_id`),
  KEY `student_term_profiles_term_id_foreign` (`term_id`),
  KEY `student_term_profiles_regular_block_id_foreign` (`regular_block_id`),
  CONSTRAINT `student_term_profiles_regular_block_id_foreign` FOREIGN KEY (`regular_block_id`) REFERENCES `blocks` (`id`) ON DELETE SET NULL,
  CONSTRAINT `student_term_profiles_term_id_foreign` FOREIGN KEY (`term_id`) REFERENCES `terms` (`id`) ON DELETE CASCADE,
  CONSTRAINT `student_term_profiles_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `subject_enrollments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `term_id` bigint(20) unsigned NOT NULL,
  `block_id` bigint(20) unsigned NOT NULL,
  `subject_id` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `subject_enrollments_user_id_term_id_subject_id_unique` (`user_id`,`term_id`,`subject_id`),
  KEY `subject_enrollments_term_id_foreign` (`term_id`),
  KEY `subject_enrollments_subject_id_foreign` (`subject_id`),
  KEY `subject_enrollments_block_id_subject_id_foreign` (`block_id`,`subject_id`),
  CONSTRAINT `subject_enrollments_block_id_foreign` FOREIGN KEY (`block_id`) REFERENCES `blocks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `subject_enrollments_block_id_subject_id_foreign` FOREIGN KEY (`block_id`, `subject_id`) REFERENCES `block_subjects` (`block_id`, `subject_id`),
  CONSTRAINT `subject_enrollments_subject_id_foreign` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `subject_enrollments_term_id_foreign` FOREIGN KEY (`term_id`) REFERENCES `terms` (`id`) ON DELETE CASCADE,
  CONSTRAINT `subject_enrollments_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `subject_load_subject` (
  `subject_load_id` bigint(20) unsigned NOT NULL,
  `subject_id` bigint(20) unsigned NOT NULL,
  PRIMARY KEY (`subject_load_id`,`subject_id`),
  KEY `subject_load_subject_subject_id_foreign` (`subject_id`),
  CONSTRAINT `subject_load_subject_subject_id_foreign` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`),
  CONSTRAINT `subject_load_subject_subject_load_id_foreign` FOREIGN KEY (`subject_load_id`) REFERENCES `subject_loads` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `subject_loads` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `term_id` bigint(20) unsigned NOT NULL,
  `program` varchar(20) NOT NULL,
  `year_level` tinyint(3) unsigned NOT NULL,
  `revision` int(10) unsigned NOT NULL DEFAULT 1,
  `updated_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `subject_loads_term_id_program_year_level_unique` (`term_id`,`program`,`year_level`),
  KEY `subject_loads_updated_by_foreign` (`updated_by`),
  CONSTRAINT `subject_loads_term_id_foreign` FOREIGN KEY (`term_id`) REFERENCES `terms` (`id`) ON DELETE CASCADE,
  CONSTRAINT `subject_loads_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `subjects` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(20) NOT NULL,
  `name` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `subjects_code_unique` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `task_assignments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `task_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `last_reminded_at` timestamp NULL DEFAULT NULL,
  `reminders_sent` int(10) unsigned NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `completion_revision` int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `task_assignments_task_id_user_id_unique` (`task_id`,`user_id`),
  KEY `task_assignments_user_id_completed_at_index` (`user_id`,`completed_at`),
  CONSTRAINT `task_assignments_task_id_foreign` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `task_assignments_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `tasks` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `block_id` bigint(20) unsigned DEFAULT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `subject_id` bigint(20) unsigned DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `platform` varchar(50) DEFAULT NULL,
  `due_date` datetime NOT NULL,
  `reminder_interval_minutes` int(10) unsigned NOT NULL DEFAULT 1440,
  `google_event_id` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tasks_block_id_foreign` (`block_id`),
  KEY `tasks_created_by_foreign` (`created_by`),
  KEY `tasks_subject_id_foreign` (`subject_id`),
  KEY `tasks_due_date_index` (`due_date`),
  CONSTRAINT `tasks_block_id_foreign` FOREIGN KEY (`block_id`) REFERENCES `blocks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tasks_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `tasks_subject_id_foreign` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `terms` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `school_year` varchar(9) NOT NULL,
  `semester` tinyint(3) unsigned NOT NULL,
  `starts_on` date NOT NULL,
  `ends_on` date NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `terms_school_year_semester_unique` (`school_year`,`semester`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `google_id` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `role` enum('student','mayor','admin') NOT NULL DEFAULT 'student',
  `picture_url` text DEFAULT NULL,
  `block_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`),
  UNIQUE KEY `users_google_id_unique` (`google_id`),
  KEY `users_block_id_foreign` (`block_id`),
  CONSTRAINT `users_block_id_foreign` FOREIGN KEY (`block_id`) REFERENCES `blocks` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `migrations` (`migration`, `batch`) VALUES ('0001_01_01_000001_create_cache_table', 1);

INSERT INTO `migrations` (`migration`, `batch`) VALUES ('0001_01_01_000002_create_jobs_table', 1);

INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_10_12_135729_create_personal_access_tokens_table', 1);

INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_10_13_121828_create_push_subscriptions_table', 1);

INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_10_13_121828_increase_push_subscriptions_endpoint_length', 1);

INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_10_24_201235_create_terms_table', 1);

INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_10_24_201300_create_blocks_table', 1);

INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_10_24_201325_create_users_table', 1);

INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_10_24_201453_add_mayor_foreign_key_to_blocks_table', 1);

INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_10_24_204516_create_subjects_table', 1);

INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_10_24_204528_create_block_subjects_table', 1);

INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_10_24_204548_create_block_join_requests_table', 1);

INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_10_24_204608_create_mayor_applications_table', 1);

INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_10_24_210512_create_announcements_table', 1);

INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_10_24_210519_create_tasks_table', 1);

INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_10_24_210526_create_task_assignments_table', 1);

INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_10_24_210549_create_concerns_table', 1);

INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_10_24_210557_create_conversation_messages_table', 1);

INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_10_24_210609_create_concern_attachments_table', 1);

INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_10_29_120000_create_calendar_events_table', 1);

INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_10_29_120100_create_personal_todos_table', 1);

INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_10_29_130000_add_google_calendar_id_to_blocks_table', 1);

INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_10_31_135605_create_subject_enrollments_table', 1);

INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_11_01_143109_create_shared_subject_loads', 1);

INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_11_01_155632_add_student_term_profiles', 1);

INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_11_02_035755_add_due_date_to_personal_todos_table', 1);

INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_11_02_124543_add_task_id_to_concerns_table', 1);

INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_11_02_131307_add_subject_id_to_announcements_table', 1);

INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_11_03_080015_create_notifications_table', 1);

INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_11_03_084843_add_student_removed_at_to_concerns_table', 1);

INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_11_03_090437_resolve_previously_removed_concerns', 1);

INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_11_03_200000_add_offline_sync_state', 1);

INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_11_04_220000_add_student_type_to_block_join_requests', 1);

INSERT INTO `migrations` (`migration`, `batch`) VALUES ('2026_11_10_000001_add_reminder_state_to_personal_todos', 1);

SET FOREIGN_KEY_CHECKS=@EPANUNOT_OLD_FK_CHECKS;
