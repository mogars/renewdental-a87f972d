-- Create app_settings table for configurable settings
CREATE TABLE public.app_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key text UNIQUE NOT NULL,
    value text NOT NULL,
    description text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can view settings
CREATE POLICY "Authenticated users can view settings"
ON public.app_settings
FOR SELECT
TO authenticated
USING (true);

-- Only admins can update settings
CREATE POLICY "Admins can update settings"
ON public.app_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert settings
CREATE POLICY "Admins can insert settings"
ON public.app_settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default SMS template
INSERT INTO public.app_settings (key, value, description) VALUES (
    'sms_template',
    'Hi {patient_name}! This is a reminder for your dental appointment on {appointment_date} at {appointment_time}. Please reply CONFIRM to confirm or call us to reschedule. - DentaCare',
    'SMS reminder template. Available placeholders: {patient_name}, {appointment_date}, {appointment_time}'
);