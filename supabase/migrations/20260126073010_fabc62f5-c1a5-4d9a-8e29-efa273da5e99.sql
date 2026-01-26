-- Create treatment_types table for configurable services with durations
CREATE TABLE public.treatment_types (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    duration_minutes integer NOT NULL DEFAULT 60,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.treatment_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view treatment types"
ON public.treatment_types FOR SELECT
USING (public.is_authenticated());

CREATE POLICY "Admins can insert treatment types"
ON public.treatment_types FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update treatment types"
ON public.treatment_types FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete treatment types"
ON public.treatment_types FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_treatment_types_updated_at
    BEFORE UPDATE ON public.treatment_types
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default treatment types with durations
INSERT INTO public.treatment_types (name, duration_minutes) VALUES
    ('Consultație', 30),
    ('Curățare', 45),
    ('Plombă', 60),
    ('Coroană', 90),
    ('Tratament de canal', 120),
    ('Extracție', 45),
    ('Albire', 60),
    ('Radiografie', 15),
    ('Control', 20),
    ('Ortodonție', 60),
    ('Implant', 120),
    ('Punte dentară', 90),
    ('Proteză', 60),
    ('Tratament parodontal', 60),
    ('Altele', 30);