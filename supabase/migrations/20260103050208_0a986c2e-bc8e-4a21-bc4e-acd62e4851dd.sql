-- Create visibility_snapshots table for storing AI visibility snapshot data
CREATE TABLE public.visibility_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  snapshot_token TEXT NOT NULL UNIQUE,
  domain TEXT NOT NULL,
  email TEXT NOT NULL,
  first_name TEXT,
  company_name TEXT,
  visibility_score INTEGER NOT NULL CHECK (visibility_score >= 0 AND visibility_score <= 100),
  visibility_status TEXT NOT NULL CHECK (visibility_status IN ('strong', 'moderate', 'low')),
  model_presence JSONB NOT NULL DEFAULT '[]'::jsonb,
  competitor_placeholders JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  email_sent BOOLEAN NOT NULL DEFAULT false,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  email_opened BOOLEAN DEFAULT false,
  email_opened_at TIMESTAMP WITH TIME ZONE,
  link_clicked BOOLEAN DEFAULT false,
  link_clicked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for fast token lookups
CREATE INDEX idx_visibility_snapshots_token ON public.visibility_snapshots(snapshot_token);
CREATE INDEX idx_visibility_snapshots_email ON public.visibility_snapshots(email);
CREATE INDEX idx_visibility_snapshots_domain ON public.visibility_snapshots(domain);
CREATE INDEX idx_visibility_snapshots_created_at ON public.visibility_snapshots(created_at);

-- Enable RLS
ALTER TABLE public.visibility_snapshots ENABLE ROW LEVEL SECURITY;

-- Service role can manage all snapshots
CREATE POLICY "Service role can manage visibility snapshots"
ON public.visibility_snapshots
FOR ALL
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- Public can read snapshots by token (for results page)
CREATE POLICY "Public can read snapshots by token"
ON public.visibility_snapshots
FOR SELECT
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_visibility_snapshots_updated_at
BEFORE UPDATE ON public.visibility_snapshots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();