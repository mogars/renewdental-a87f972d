-- MySQL Database Schema for Dental Clinic
-- Run this script to create all tables

-- Patients table
CREATE TABLE IF NOT EXISTS patients (
  id VARCHAR(36) PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  date_of_birth DATE,
  address TEXT,
  insurance_provider VARCHAR(255),
  insurance_id VARCHAR(100),
  notes TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_patients_name (last_name, first_name),
  INDEX idx_patients_email (email)
);

-- Doctors table
CREATE TABLE IF NOT EXISTS doctors (
  id VARCHAR(36) PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  specialty VARCHAR(100),
  phone VARCHAR(50),
  email VARCHAR(255),
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_doctors_name (last_name, first_name),
  INDEX idx_doctors_active (is_active)
);

-- Treatment types table
CREATE TABLE IF NOT EXISTS treatment_types (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 60,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_treatment_types_active (is_active)
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  treatment_type VARCHAR(100),
  dentist_name VARCHAR(200),
  doctor_id VARCHAR(36),
  notes TEXT,
  status VARCHAR(50) DEFAULT 'scheduled',
  google_event_id VARCHAR(255),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_appointments_date (appointment_date),
  INDEX idx_appointments_patient (patient_id),
  INDEX idx_appointments_doctor (doctor_id),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL
);

-- Chart records table
CREATE TABLE IF NOT EXISTS chart_records (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36) NOT NULL,
  treatment_type VARCHAR(100) NOT NULL,
  tooth_number VARCHAR(10),
  description TEXT,
  dentist_name VARCHAR(200),
  cost DECIMAL(10, 2),
  status VARCHAR(50) DEFAULT 'completed',
  record_date DATE NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_chart_records_patient (patient_id),
  INDEX idx_chart_records_date (record_date),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- App settings table
CREATE TABLE IF NOT EXISTS app_settings (
  id VARCHAR(36) PRIMARY KEY,
  `key` VARCHAR(100) NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_app_settings_key (`key`)
);

-- Profiles table (for user management)
CREATE TABLE IF NOT EXISTS profiles (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL,
  display_name VARCHAR(200),
  phone VARCHAR(50),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_profiles_user (user_id),
  INDEX idx_profiles_email (email)
);

-- User roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  role ENUM('admin', 'staff', 'dentist') NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_role (user_id, role),
  INDEX idx_user_roles_user (user_id)
);

-- Insert default settings
INSERT INTO app_settings (id, `key`, value, description) VALUES
  (UUID(), 'clinic_name', 'Renew Dental', 'Clinic name'),
  (UUID(), 'clinic_address', '', 'Clinic address'),
  (UUID(), 'clinic_phone', '', 'Clinic phone number'),
  (UUID(), 'clinic_email', '', 'Clinic email'),
  (UUID(), 'clinic_website', '', 'Clinic website')
ON DUPLICATE KEY UPDATE id = id;

-- Insert default admin user profile
INSERT INTO profiles (id, user_id, email, display_name) VALUES
  (UUID(), 'local-admin', 'admin@clinic.local', 'Local Admin')
ON DUPLICATE KEY UPDATE id = id;

-- Insert admin role for default user
INSERT INTO user_roles (id, user_id, role) VALUES
  (UUID(), 'local-admin', 'admin')
ON DUPLICATE KEY UPDATE id = id;
