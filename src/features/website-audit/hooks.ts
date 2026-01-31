import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Audit, AuditPage, AuditCheck, AuditResult, ModuleScores, CrawlState, CrawlProgress } from './types';
import { useState, useCallback, useRef, useEffect } from 'react';

export function useInitAudit() {
  return useMutation({
    mutationFn: async (params: {
      domain: string;
      brand_name?: string;
      business_type?: string;
      crawl_limit?: number;
      allow_subdomains?: boolean;
      user_id?: string;
    }): Promise<{ audit_id: string; queue_size: number; crawl_limit: number; status: string }> => {
      const { data, error } = await supabase.functions.invoke('init-website-audit', {
        body: params
      });

      if (error) throw error;
      return data;
    }
  });
}

export function useContinueAudit() {
  return useMutation({
    mutationFn: async (audit_id: string): Promise<CrawlProgress> => {
      const { data, error } = await supabase.functions.invoke('continue-website-audit', {
        body: { audit_id }
      });

      if (error) throw error;
      return data as CrawlProgress;
    }
  });
}

export function useScoreAudit() {
  return useMutation({
    mutationFn: async (audit_id: string): Promise<AuditResult> => {
      const { data, error } = await supabase.functions.invoke('score-website-audit', {
        body: { audit_id }
      });

      if (error) throw error;
      return data as AuditResult;
    }
  });
}

// Legacy hook for backward compatibility
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

// Progressive audit hook - manages the entire flow
export function useProgressiveAudit() {
  const [progress, setProgress] = useState<CrawlProgress | null>(null);
  const [phase, setPhase] = useState<'idle' | 'initializing' | 'crawling' | 'scoring' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);
  const queryClient = useQueryClient();

  const initAudit = useInitAudit();
  const continueAudit = useContinueAudit();
  const scoreAudit = useScoreAudit();

  const reset = useCallback(() => {
    setProgress(null);
    setPhase('idle');
    setError(null);
    abortRef.current = false;
  }, []);

  const abort = useCallback(() => {
    abortRef.current = true;
  }, []);

  const runAudit = useCallback(async (params: {
    domain: string;
    brand_name?: string;
    business_type?: string;
    crawl_limit?: number;
    allow_subdomains?: boolean;
    user_id?: string;
  }): Promise<{ audit_id: string; success: boolean }> => {
    reset();
    abortRef.current = false;

    try {
      // Phase 1: Initialize
      setPhase('initializing');
      const initResult = await initAudit.mutateAsync(params);
      const auditId = initResult.audit_id;

      setProgress({
        audit_id: auditId,
        crawled_count: 0,
        crawl_limit: initResult.crawl_limit,
        queue_size: initResult.queue_size,
        done: false
      });

      // Phase 2: Crawl in batches
      setPhase('crawling');
      let isDone = false;

      while (!isDone && !abortRef.current) {
        const continueResult = await continueAudit.mutateAsync(auditId);
        
        setProgress({
          audit_id: auditId,
          crawled_count: continueResult.crawled_count,
          crawl_limit: continueResult.crawl_limit,
          queue_size: continueResult.queue_size,
          pages_this_batch: continueResult.pages_this_batch,
          done: continueResult.done
        });

        isDone = continueResult.done;

        // Small delay between batches to not overwhelm
        if (!isDone) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      if (abortRef.current) {
        setPhase('idle');
        return { audit_id: auditId, success: false };
      }

      // Phase 3: Score
      setPhase('scoring');
      await scoreAudit.mutateAsync(auditId);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['audit', auditId] });
      queryClient.invalidateQueries({ queryKey: ['audit-pages', auditId] });
      queryClient.invalidateQueries({ queryKey: ['audit-checks', auditId] });

      setPhase('done');
      return { audit_id: auditId, success: true };

    } catch (err) {
      setError(String(err));
      setPhase('error');
      throw err;
    }
  }, [initAudit, continueAudit, scoreAudit, queryClient, reset]);

  return {
    runAudit,
    progress,
    phase,
    error,
    reset,
    abort,
    isRunning: phase !== 'idle' && phase !== 'done' && phase !== 'error'
  };
}

export function useCrawlState(auditId: string | undefined) {
  return useQuery({
    queryKey: ['crawl-state', auditId],
    queryFn: async (): Promise<CrawlState | null> => {
      if (!auditId) return null;
      
      const { data, error } = await supabase
        .from('audit_crawl_state')
        .select('*')
        .eq('audit_id', auditId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      
      return data as CrawlState;
    },
    enabled: !!auditId,
    refetchInterval: (query) => {
      // Poll while crawling
      if (query.state.data && query.state.data.status === 'running') return 2000;
      return false;
    }
  });
}

export function useAudit(auditId: string | undefined) {
  return useQuery({
    queryKey: ['audit', auditId],
    queryFn: async (): Promise<Audit | null> => {
      if (!auditId) return null;
      
      const { data, error } = await supabase
        .from('audits')
        .select('*')
        .eq('id', auditId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching audit:', error);
        throw error;
      }
      
      if (!data) return null;
      
      return {
        ...data,
        module_scores: (data.module_scores || {}) as unknown as ModuleScores,
        status: data.status as Audit['status']
      } as Audit;
    },
    enabled: !!auditId,
    staleTime: 60 * 1000,
    retry: 2,
    refetchInterval: (query) => {
      // Poll while not completed
      const d = query.state.data;
      if (d && d.status !== 'completed' && d.status !== 'error') return 3000;
      return false;
    }
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
      
      return (data || []).map(item => ({
        ...item,
        module_scores: (item.module_scores || {}) as unknown as ModuleScores,
        status: item.status as Audit['status']
      })) as Audit[];
    },
    enabled: !!userId
  });
}
