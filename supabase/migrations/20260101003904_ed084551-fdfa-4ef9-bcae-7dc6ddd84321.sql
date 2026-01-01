-- Create table for report email preferences
CREATE TABLE public.report_email_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'weekly' CHECK (frequency IN ('weekly', 'monthly', 'none')),
  day_of_week INTEGER DEFAULT 1 CHECK (day_of_week >= 0 AND day_of_week <= 6),
  include_pdf BOOLEAN DEFAULT true,
  include_summary BOOLEAN DEFAULT true,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  last_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id, brand_id)
);

-- Enable RLS
ALTER TABLE public.report_email_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own report preferences"
  ON public.report_email_preferences
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own report preferences"
  ON public.report_email_preferences
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own report preferences"
  ON public.report_email_preferences
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own report preferences"
  ON public.report_email_preferences
  FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage report preferences"
  ON public.report_email_preferences
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create updated_at trigger using existing function
CREATE TRIGGER update_report_email_preferences_updated_at
  BEFORE UPDATE ON public.report_email_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create index for scheduler queries
CREATE INDEX idx_report_email_preferences_active ON public.report_email_preferences(is_active, frequency) WHERE is_active = true;