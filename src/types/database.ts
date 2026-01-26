// Database types matching PostgreSQL schema

export type AppRole = 'admin' | 'staff' | 'dentist';

export interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  address: string | null;
  insurance_provider: string | null;
  insurance_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  title: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string | null;
  notes: string | null;
  treatment_type: string | null;
  dentist_name: string | null;
  google_event_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined relations
  patients?: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    email: string | null;
  } | null;
  doctors?: Doctor | null;
}

export interface AppointmentWithPatient extends Appointment {
  patients: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    email: string | null;
  } | null;
}

export interface Doctor {
  id: string;
  first_name: string;
  last_name: string;
  specialty: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChartRecord {
  id: string;
  patient_id: string;
  treatment_type: string;
  tooth_number: string | null;
  description: string | null;
  cost: number | null;
  status: string | null;
  dentist_name: string | null;
  record_date: string;
  created_at: string;
  updated_at: string;
}

export interface TreatmentType {
  id: string;
  name: string;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AppSetting {
  id: string;
  key: string;
  value: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  created_at: string;
}
