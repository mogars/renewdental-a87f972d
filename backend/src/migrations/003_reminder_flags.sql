-- Migration to add reminder sent flags to appointments table
ALTER TABLE appointments
ADD COLUMN reminder_sent_24h TINYINT(1) DEFAULT 0,
ADD COLUMN reminder_sent_2h TINYINT(1) DEFAULT 0,
ADD COLUMN reminder_sent_1h TINYINT(1) DEFAULT 0;
