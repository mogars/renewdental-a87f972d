-- Create user roles enum and table
CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'dentist');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user is authenticated
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
$$;

-- Policy: Users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: Admins can manage all roles
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add input validation constraints to patients table
ALTER TABLE public.patients
  ADD CONSTRAINT patients_first_name_length CHECK (char_length(first_name) <= 100),
  ADD CONSTRAINT patients_last_name_length CHECK (char_length(last_name) <= 100),
  ADD CONSTRAINT patients_email_format CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  ADD CONSTRAINT patients_phone_length CHECK (phone IS NULL OR char_length(phone) <= 20),
  ADD CONSTRAINT patients_address_length CHECK (address IS NULL OR char_length(address) <= 500),
  ADD CONSTRAINT patients_insurance_provider_length CHECK (insurance_provider IS NULL OR char_length(insurance_provider) <= 100),
  ADD CONSTRAINT patients_insurance_id_length CHECK (insurance_id IS NULL OR char_length(insurance_id) <= 100),
  ADD CONSTRAINT patients_notes_length CHECK (notes IS NULL OR char_length(notes) <= 1000);

-- Add input validation constraints to chart_records table
ALTER TABLE public.chart_records
  ADD CONSTRAINT chart_records_treatment_type_length CHECK (char_length(treatment_type) <= 100),
  ADD CONSTRAINT chart_records_tooth_number_length CHECK (tooth_number IS NULL OR char_length(tooth_number) <= 20),
  ADD CONSTRAINT chart_records_description_length CHECK (description IS NULL OR char_length(description) <= 1000),
  ADD CONSTRAINT chart_records_dentist_name_length CHECK (dentist_name IS NULL OR char_length(dentist_name) <= 100),
  ADD CONSTRAINT chart_records_cost_positive CHECK (cost IS NULL OR cost >= 0),
  ADD CONSTRAINT chart_records_status_valid CHECK (status IN ('scheduled', 'in-progress', 'completed', 'cancelled'));

-- Add input validation constraints to doctors table
ALTER TABLE public.doctors
  ADD CONSTRAINT doctors_first_name_length CHECK (char_length(first_name) <= 100),
  ADD CONSTRAINT doctors_last_name_length CHECK (char_length(last_name) <= 100),
  ADD CONSTRAINT doctors_specialty_length CHECK (specialty IS NULL OR char_length(specialty) <= 100),
  ADD CONSTRAINT doctors_phone_length CHECK (phone IS NULL OR char_length(phone) <= 20),
  ADD CONSTRAINT doctors_email_format CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Add input validation constraints to appointments table
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_title_length CHECK (char_length(title) <= 200),
  ADD CONSTRAINT appointments_treatment_type_length CHECK (treatment_type IS NULL OR char_length(treatment_type) <= 100),
  ADD CONSTRAINT appointments_notes_length CHECK (notes IS NULL OR char_length(notes) <= 1000),
  ADD CONSTRAINT appointments_dentist_name_length CHECK (dentist_name IS NULL OR char_length(dentist_name) <= 100),
  ADD CONSTRAINT appointments_status_valid CHECK (status IS NULL OR status IN ('scheduled', 'in-progress', 'completed', 'cancelled', 'no-show'));

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow all operations on patients" ON public.patients;
DROP POLICY IF EXISTS "Allow all operations on chart_records" ON public.chart_records;
DROP POLICY IF EXISTS "Allow all operations on doctors" ON public.doctors;
DROP POLICY IF EXISTS "Allow all operations on appointments" ON public.appointments;

-- Create new authenticated-only policies for patients
CREATE POLICY "Authenticated users can view patients"
ON public.patients
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert patients"
ON public.patients
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update patients"
ON public.patients
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete patients"
ON public.patients
FOR DELETE
TO authenticated
USING (true);

-- Create new authenticated-only policies for chart_records
CREATE POLICY "Authenticated users can view chart_records"
ON public.chart_records
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert chart_records"
ON public.chart_records
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update chart_records"
ON public.chart_records
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete chart_records"
ON public.chart_records
FOR DELETE
TO authenticated
USING (true);

-- Create new authenticated-only policies for doctors
CREATE POLICY "Authenticated users can view doctors"
ON public.doctors
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert doctors"
ON public.doctors
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update doctors"
ON public.doctors
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete doctors"
ON public.doctors
FOR DELETE
TO authenticated
USING (true);

-- Create new authenticated-only policies for appointments
CREATE POLICY "Authenticated users can view appointments"
ON public.appointments
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert appointments"
ON public.appointments
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update appointments"
ON public.appointments
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete appointments"
ON public.appointments
FOR DELETE
TO authenticated
USING (true);