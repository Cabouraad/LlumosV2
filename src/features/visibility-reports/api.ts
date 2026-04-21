import { supabase } from '@/integrations/supabase/client';

export type SavedVisibilityReport = {
  id: string;
  domain: string;
  brand_name: string | null;
  overall_score: number;
  prompts_run: number;
  providers_queried: number;
  pdf_url: string | null;
  created_at: string;
};

export async function listRecentVisibilityReports(limit = 10): Promise<SavedVisibilityReport[]> {
  const { data, error } = await supabase
    .from('visibility_reports')
    .select('id, domain, brand_name, overall_score, prompts_run, providers_queried, pdf_url, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as SavedVisibilityReport[];
}
