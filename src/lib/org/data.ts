import { supabase } from "@/integrations/supabase/client";
import { getOrgId } from "@/lib/auth";
import type { Json } from "@/integrations/supabase/types";

export interface LocationTarget {
  city: string;
  state: string;
  country?: string;
  isPrimary?: boolean;
}

export interface OrganizationKeywords {
  keywords: string[];
  competitors?: string[];
  products_services?: string;
  target_audience?: string;
  business_description?: string;
  business_city?: string;
  business_state?: string;
  business_country?: string;
  enable_localized_prompts?: boolean;
  localization_config?: {
    additional_locations?: LocationTarget[];
  };
}

export async function getOrganizationKeywords(): Promise<OrganizationKeywords> {
  try {
    const orgId = await getOrgId();

    const { data, error } = await supabase
      .from("organizations")
      .select("keywords, competitors, products_services, target_audience, business_description, business_city, business_state, business_country, enable_localized_prompts, localization_config")
      .eq("id", orgId)
      .single();

    if (error) throw error;

    return {
      keywords: data?.keywords || [],
      competitors: data?.competitors || [],
      products_services: data?.products_services || "",
      target_audience: data?.target_audience || "",
      business_description: data?.business_description || "",
      business_city: data?.business_city || "",
      business_state: data?.business_state || "",
      business_country: data?.business_country || "United States",
      enable_localized_prompts: data?.enable_localized_prompts || false,
      localization_config: data?.localization_config as OrganizationKeywords['localization_config'] || { additional_locations: [] },
    };
  } catch (error) {
    console.error("Error fetching organization keywords:", error);
    throw error;
  }
}

export async function updateOrganizationKeywords(keywords: Partial<OrganizationKeywords>) {
  try {
    const orgId = await getOrgId();
    
    // Build update object for direct table update
    const updateData: Record<string, unknown> = {};
    
    if (keywords.keywords !== undefined) updateData.keywords = keywords.keywords;
    if (keywords.competitors !== undefined) updateData.competitors = keywords.competitors;
    if (keywords.products_services !== undefined) updateData.products_services = keywords.products_services;
    if (keywords.target_audience !== undefined) updateData.target_audience = keywords.target_audience;
    if (keywords.business_description !== undefined) updateData.business_description = keywords.business_description;
    if (keywords.business_city !== undefined) updateData.business_city = keywords.business_city;
    if (keywords.business_state !== undefined) updateData.business_state = keywords.business_state;
    if (keywords.business_country !== undefined) updateData.business_country = keywords.business_country;
    if (keywords.enable_localized_prompts !== undefined) updateData.enable_localized_prompts = keywords.enable_localized_prompts;
    if (keywords.localization_config !== undefined) updateData.localization_config = keywords.localization_config;

    // Try using RPC function first, fall back to direct update
    const { error: rpcError } = await supabase.rpc('update_org_business_context', {
      p_keywords: keywords.keywords || null,
      p_competitors: keywords.competitors || null,
      p_products_services: keywords.products_services || null,
      p_target_audience: keywords.target_audience || null,
      p_business_description: keywords.business_description || null,
      p_business_city: keywords.business_city || null,
      p_business_state: keywords.business_state || null,
      p_business_country: keywords.business_country || null,
      p_enable_localized_prompts: keywords.enable_localized_prompts ?? null
    });

    // If RPC doesn't support localization_config, update it directly
    if (keywords.localization_config !== undefined) {
      const { error: directError } = await supabase
        .from("organizations")
        .update({ localization_config: keywords.localization_config as Json })
        .eq("id", orgId);
      
      if (directError) {
        console.error("Direct update error for localization_config:", directError);
      }
    }

    if (rpcError) {
      console.error("RPC function error:", rpcError);
      throw rpcError;
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating organization keywords:", error);
    throw error;
  }
}