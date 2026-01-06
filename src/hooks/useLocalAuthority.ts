/**
 * Local AI Authority Hook
 * State machine and API integration for the Local Authority scan flow
 */

import { useState, useCallback, useReducer } from 'react';
import { invokeEdge } from '@/lib/supabase/invoke';
import { toast } from 'sonner';
import type {
  LocalProfile,
  LocalAuthorityRun,
  LocalAuthorityScore,
  CreateLocalProfileInput,
  LocalProfileLocation,
  CompetitorOverride,
} from '@/types/local-authority';
import { isLocalAuthorityEligible, getIneligibleTierMessage } from '@/lib/local-authority/plan-gating';
import { useSubscriptionGate } from '@/hooks/useSubscriptionGate';

// Wizard form data
export interface LocalAuthorityFormData {
  // Step 1: Business Info
  business_name: string;
  domain: string;
  brand_synonyms: string[];
  
  // Step 2: Location
  city: string;
  state: string;
  country: string;
  zip: string;
  address: string;
  gbp_url: string;
  phone: string;
  service_radius_miles: number;
  neighborhoods: string[];
  
  // Step 3: Categories & Competitors
  categories: string[];
  competitor_overrides: CompetitorOverride[];
}

// Scan progress stages
export type ScanStage = 
  | 'idle'
  | 'creating_profile'
  | 'generating_prompts'
  | 'creating_run'
  | 'executing_scan'
  | 'complete'
  | 'error';

// State machine
type State = {
  step: 1 | 2 | 3 | 4;
  formData: LocalAuthorityFormData;
  profileId: string | null;
  runId: string | null;
  scanStage: ScanStage;
  scanError: string | null;
  promptCounts: { geo_cluster: number; implicit: number; radius_neighborhood: number; problem_intent: number } | null;
  result: {
    profile: LocalProfile | null;
    run: LocalAuthorityRun | null;
    score: LocalAuthorityScore | null;
    highlights: Array<{ type: string; text: string }>;
    top_competitors: Array<{ name: string; mention_rate: number }>;
    sample_responses: Array<{ layer: string; prompt_text: string; model: string; snippet: string; citations?: any[] }>;
    confidence: { level: 'high' | 'medium' | 'low'; reasons: string[] };
  } | null;
  cached: boolean;
};

type Action =
  | { type: 'SET_STEP'; step: 1 | 2 | 3 | 4 }
  | { type: 'UPDATE_FORM'; patch: Partial<LocalAuthorityFormData> }
  | { type: 'SET_PROFILE_ID'; profileId: string }
  | { type: 'SET_RUN_ID'; runId: string }
  | { type: 'SET_SCAN_STAGE'; stage: ScanStage }
  | { type: 'SET_SCAN_ERROR'; error: string }
  | { type: 'SET_PROMPT_COUNTS'; counts: State['promptCounts'] }
  | { type: 'SET_RESULT'; result: State['result']; cached?: boolean }
  | { type: 'RESET' };

const initialFormData: LocalAuthorityFormData = {
  business_name: '',
  domain: '',
  brand_synonyms: [],
  city: '',
  state: '',
  country: 'USA',
  zip: '',
  address: '',
  gbp_url: '',
  phone: '',
  service_radius_miles: 15,
  neighborhoods: [],
  categories: [],
  competitor_overrides: [],
};

const initialState: State = {
  step: 1,
  formData: initialFormData,
  profileId: null,
  runId: null,
  scanStage: 'idle',
  scanError: null,
  promptCounts: null,
  result: null,
  cached: false,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.step };
    case 'UPDATE_FORM':
      return { ...state, formData: { ...state.formData, ...action.patch } };
    case 'SET_PROFILE_ID':
      return { ...state, profileId: action.profileId };
    case 'SET_RUN_ID':
      return { ...state, runId: action.runId };
    case 'SET_SCAN_STAGE':
      return { ...state, scanStage: action.stage, scanError: action.stage === 'error' ? state.scanError : null };
    case 'SET_SCAN_ERROR':
      return { ...state, scanStage: 'error', scanError: action.error };
    case 'SET_PROMPT_COUNTS':
      return { ...state, promptCounts: action.counts };
    case 'SET_RESULT':
      return { ...state, result: action.result, cached: action.cached ?? false, scanStage: 'complete' };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export function useLocalAuthority() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { currentTier } = useSubscriptionGate();
  
  const isEligible = isLocalAuthorityEligible(currentTier);
  const ineligibleMessage = !isEligible ? getIneligibleTierMessage(currentTier) : null;

  const setStep = useCallback((step: 1 | 2 | 3 | 4) => {
    dispatch({ type: 'SET_STEP', step });
  }, []);

  const updateForm = useCallback((patch: Partial<LocalAuthorityFormData>) => {
    dispatch({ type: 'UPDATE_FORM', patch });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const validateStep = useCallback((step: number): boolean => {
    const { formData } = state;
    switch (step) {
      case 1:
        return formData.business_name.trim().length > 0 && formData.domain.trim().length > 0;
      case 2:
        return formData.city.trim().length > 0 && formData.state.trim().length > 0;
      case 3:
        return formData.categories.length > 0;
      case 4:
        return true;
      default:
        return false;
    }
  }, [state.formData]);

  const startScan = useCallback(async (force = false) => {
    if (!isEligible) {
      toast.error(ineligibleMessage || 'Plan upgrade required');
      return;
    }

    const { formData } = state;
    
    try {
      // Step 1: Create/update profile
      dispatch({ type: 'SET_SCAN_STAGE', stage: 'creating_profile' });
      
      const profileInput: CreateLocalProfileInput = {
        business_name: formData.business_name.trim(),
        domain: formData.domain.trim(),
        primary_location: {
          city: formData.city.trim(),
          state: formData.state.trim(),
          country: formData.country.trim(),
          zip: formData.zip.trim() || undefined,
        },
        service_radius_miles: formData.service_radius_miles,
        neighborhoods: formData.neighborhoods.length > 0 ? formData.neighborhoods : undefined,
        categories: formData.categories,
        brand_synonyms: formData.brand_synonyms.length > 0 ? formData.brand_synonyms : undefined,
        competitor_overrides: formData.competitor_overrides.length > 0 ? formData.competitor_overrides : undefined,
        gbp_url: formData.gbp_url.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
      };

      const { data: profileData, error: profileError } = await invokeEdge('local-authority-profile-upsert', {
        body: profileInput,
      });

      if (profileError) throw new Error(profileError.message || 'Failed to create profile');
      
      const profileId = profileData?.profile_id;
      if (!profileId) throw new Error('No profile ID returned');
      
      dispatch({ type: 'SET_PROFILE_ID', profileId });

      // Step 2: Generate prompts
      dispatch({ type: 'SET_SCAN_STAGE', stage: 'generating_prompts' });
      
      const { data: promptData, error: promptError } = await invokeEdge('local-authority-prompt-generate', {
        body: { profile_id: profileId },
      });

      if (promptError) throw new Error(promptError.message || 'Failed to generate prompts');
      
      dispatch({ type: 'SET_PROMPT_COUNTS', counts: promptData?.counts || null });

      // Step 3: Create run (with caching)
      dispatch({ type: 'SET_SCAN_STAGE', stage: 'creating_run' });
      
      const { data: runData, error: runError } = await invokeEdge('local-authority-run-create', {
        body: { 
          profile_id: profileId, 
          models_requested: ['openai', 'perplexity', 'gemini'],
          force,
        },
      });

      if (runError) throw new Error(runError.message || 'Failed to create scan run');
      
      const runId = runData?.run_id;
      const cached = runData?.cached === true;
      
      if (!runId) throw new Error('No run ID returned');
      
      dispatch({ type: 'SET_RUN_ID', runId });

      // If cached, fetch results directly
      if (cached) {
        const { data: resultData, error: resultError } = await invokeEdge('local-authority-run-get', {
          body: { run_id: runId },
        });

        if (resultError) throw new Error(resultError.message || 'Failed to fetch cached results');
        
        dispatch({ type: 'SET_RESULT', result: resultData, cached: true });
        toast.success('Loaded cached results');
        return;
      }

      // Step 4: Execute scan
      dispatch({ type: 'SET_SCAN_STAGE', stage: 'executing_scan' });
      
      const { data: execData, error: execError } = await invokeEdge('local-authority-run-execute', {
        body: { run_id: runId },
        timeoutMs: 120000, // 2 minute timeout for scan execution
      });

      if (execError) throw new Error(execError.message || 'Scan execution failed');

      // Fetch full results
      const { data: resultData, error: resultError } = await invokeEdge('local-authority-run-get', {
        body: { run_id: runId },
      });

      if (resultError) throw new Error(resultError.message || 'Failed to fetch results');
      
      dispatch({ type: 'SET_RESULT', result: resultData, cached: false });
      toast.success('Scan complete!');

    } catch (error: any) {
      console.error('Local Authority scan error:', error);
      dispatch({ type: 'SET_SCAN_ERROR', error: error.message || 'Something went wrong' });
      toast.error(error.message || 'Scan failed');
    }
  }, [state.formData, isEligible, ineligibleMessage]);

  const rerunScan = useCallback(async (force = false) => {
    if (!state.profileId) {
      toast.error('No profile to rerun');
      return;
    }
    await startScan(force);
  }, [state.profileId, startScan]);

  return {
    ...state,
    isEligible,
    ineligibleMessage,
    setStep,
    updateForm,
    reset,
    validateStep,
    startScan,
    rerunScan,
  };
}
