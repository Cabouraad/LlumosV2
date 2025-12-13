-- Create table for CMS connections (WordPress sites)
CREATE TABLE public.cms_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  platform TEXT NOT NULL DEFAULT 'wordpress',
  site_url TEXT NOT NULL,
  username TEXT NOT NULL,
  app_password_encrypted TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_connected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for scheduled content publications
CREATE TABLE public.scheduled_publications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  content_studio_item_id UUID NOT NULL REFERENCES public.content_studio_items(id) ON DELETE CASCADE,
  cms_connection_id UUID NOT NULL REFERENCES public.cms_connections(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'scheduled',
  wordpress_post_id TEXT,
  error_message TEXT,
  post_type TEXT NOT NULL DEFAULT 'post',
  post_status TEXT NOT NULL DEFAULT 'draft',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cms_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_publications ENABLE ROW LEVEL SECURITY;

-- RLS policies for cms_connections
CREATE POLICY "Users can view their org's CMS connections"
  ON public.cms_connections FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.org_id = cms_connections.org_id
  ));

CREATE POLICY "Org owners can manage CMS connections"
  ON public.cms_connections FOR ALL
  USING (EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.org_id = cms_connections.org_id AND u.role = 'owner'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.org_id = cms_connections.org_id AND u.role = 'owner'
  ));

CREATE POLICY "Service role can manage CMS connections"
  ON public.cms_connections FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- RLS policies for scheduled_publications
CREATE POLICY "Users can view their org's scheduled publications"
  ON public.scheduled_publications FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.org_id = scheduled_publications.org_id
  ));

CREATE POLICY "Users can manage their org's scheduled publications"
  ON public.scheduled_publications FOR ALL
  USING (EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.org_id = scheduled_publications.org_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.org_id = scheduled_publications.org_id
  ));

CREATE POLICY "Service role can manage scheduled publications"
  ON public.scheduled_publications FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Add delete policy for content_studio_items (was missing)
CREATE POLICY "content_studio_items_delete_own_org"
  ON public.content_studio_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.org_id = content_studio_items.org_id
  ));

-- Indexes for performance
CREATE INDEX idx_cms_connections_org_id ON public.cms_connections(org_id);
CREATE INDEX idx_scheduled_publications_org_id ON public.scheduled_publications(org_id);
CREATE INDEX idx_scheduled_publications_scheduled_at ON public.scheduled_publications(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX idx_scheduled_publications_status ON public.scheduled_publications(status);