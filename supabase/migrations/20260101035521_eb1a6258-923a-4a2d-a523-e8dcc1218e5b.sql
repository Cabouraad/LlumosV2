-- Create update_updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create table to track email sequences for leads
CREATE TABLE public.lead_email_sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  sequence_type TEXT NOT NULL DEFAULT 'snapshot_followup',
  email_key TEXT NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(lead_id, email_key)
);

-- Enable Row Level Security
ALTER TABLE public.lead_email_sequences ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access (edge functions)
CREATE POLICY "Service role can manage email sequences"
ON public.lead_email_sequences
FOR ALL
USING (true)
WITH CHECK (true);

-- Create indexes for efficient querying
CREATE INDEX idx_lead_email_sequences_pending ON public.lead_email_sequences(status, scheduled_at) WHERE status = 'pending';
CREATE INDEX idx_lead_email_sequences_lead_id ON public.lead_email_sequences(lead_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_lead_email_sequences_updated_at
BEFORE UPDATE ON public.lead_email_sequences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();