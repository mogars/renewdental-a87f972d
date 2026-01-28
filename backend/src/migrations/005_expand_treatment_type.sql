-- Expand treatment_type column to support multiple selected services (comma-separated)
ALTER TABLE appointments MODIFY treatment_type TEXT;
ALTER TABLE chart_records MODIFY treatment_type TEXT;
