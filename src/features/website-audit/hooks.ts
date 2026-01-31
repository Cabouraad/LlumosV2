import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Audit, AuditPage, AuditCheck, AuditResult, ModuleScores } from './types';

export function useRunAudit() {
  return useMutation({
    mutationFn: async (params: {
      domain: string;
      brand_name?: string;
      business_type?: string;
      user_id?: string;
    }): Promise<AuditResult> => {
      const { data, error } = await supabase.functions.invoke('run-website-audit', {
        body: params
      });

      if (error) throw error;
      return data as AuditResult;
    }
  });
}

export function useAudit(auditId: string | undefined) {
  return useQuery({
    queryKey: ['audit', auditId],
    queryFn: async () => {
      if (!auditId) return null;
      
      const { data, error } = await supabase
        .from('audits')
        .select('*')
        .eq('id', auditId)
        .single();

      if (error) throw error;
      
      // Transform the data to match our types
      return {
        ...data,
        module_scores: (data.module_scores || {}) as unknown as ModuleScores,
        status: data.status as Audit['status']
      } as Audit;
    },
    enabled: !!auditId,
    staleTime: 60 * 1000
  });
}

export function useAuditPages(auditId: string | undefined) {
  return useQuery({
    queryKey: ['audit-pages', auditId],
    queryFn: async () => {
      if (!auditId) return [];
      
      const { data, error } = await supabase
        .from('audit_pages')
        .select('*')
        .eq('audit_id', auditId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as AuditPage[];
    },
    enabled: !!auditId
  });
}

export function useAuditChecks(auditId: string | undefined) {
  return useQuery({
    queryKey: ['audit-checks', auditId],
    queryFn: async () => {
      if (!auditId) return [];
      
      const { data, error } = await supabase
        .from('audit_checks')
        .select('*')
        .eq('audit_id', auditId)
        .order('module', { ascending: true });

      if (error) throw error;
      return data as AuditCheck[];
    },
    enabled: !!auditId
  });
}

export function useUserAudits(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-audits', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('audits')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      // Transform the data to match our types
      return (data || []).map(item => ({
        ...item,
        module_scores: (item.module_scores || {}) as unknown as ModuleScores,
        status: item.status as Audit['status']
      })) as Audit[];
    },
    enabled: !!userId
  });
}
