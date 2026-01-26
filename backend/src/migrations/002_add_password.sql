-- Migration to add password support to profiles table
ALTER TABLE profiles ADD COLUMN password VARCHAR(255) AFTER email;

-- Update the default admin user with a default password 'admin123' 
-- In a real app, this should be a hash. For initial setup, we'll hash it in the code if needed.
UPDATE profiles SET password = 'admin123' WHERE user_id = 'local-admin';
