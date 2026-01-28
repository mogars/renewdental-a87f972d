-- Create offices table
CREATE TABLE IF NOT EXISTS offices (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_offices_active (is_active)
);

-- Insert default offices
INSERT INTO offices (id, name, is_active) VALUES
  (UUID(), 'Office 1', 1),
  (UUID(), 'Office 2', 1)
ON DUPLICATE KEY UPDATE id = id;

-- Add office_id to appointments table
-- We check if column exists first to avoid errors on re-run (though MySQL doesn't support IF NOT EXISTS for columns easily in one statement, this is a standard migration)
-- For simplicity in this environment, we'll try to add it. If it fails, it might be because it exists.
-- A safe way is to just run the ALTER.

ALTER TABLE appointments 
ADD COLUMN office_id VARCHAR(36) NULL AFTER doctor_id;

-- Add Foreign Key
ALTER TABLE appointments
ADD CONSTRAINT fk_appointments_office
FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_appointments_office ON appointments(office_id);
