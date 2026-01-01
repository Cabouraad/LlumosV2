/**
 * Shared citation validation utility
 * Can be called inline or used to trigger async validation
 */

/**
 * Validates citations by checking URL accessibility
 * Used inline after response storage to update citation quality
 */
export async function validateCitationsInline(
  citations: Array<{ url: string; title?: string; domain?: string }>,
  options: { timeout?: number; maxConcurrent?: number } = {}
): Promise<{
  validatedCitations: Array<any>;
  accessibleCount: number;
  totalCount: number;
  validationMetadata: any;
}> {
  const { timeout = 5000, maxConcurrent = 5 } = options;
  const totalCount = citations.length;

  if (!citations || citations.length === 0) {
    return {
      validatedCitations: [],
      accessibleCount: 0,
      totalCount: 0,
      validationMetadata: {
        validated_at: new Date().toISOString(),
        status: 'no_citations'
      }
    };
  }

  console.log(`[Citation Validator] Validating ${totalCount} citations...`);

  // Process in batches to avoid overwhelming servers
  const batches: Array<Array<any>> = [];
  for (let i = 0; i < citations.length; i += maxConcurrent) {
    batches.push(citations.slice(i, i + maxConcurrent));
  }

  const allValidated: Array<any> = [];

  for (const batch of batches) {
    const batchResults = await Promise.all(
      batch.map(async (citation) => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);

          const response = await fetch(citation.url, {
            method: 'HEAD',
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; LlumosBot/1.0; +https://llumos.app)',
            },
          });

          clearTimeout(timeoutId);

          const isAccessible = response.status >= 200 && response.status < 400;

          return {
            ...citation,
            is_accessible: isAccessible,
            validation_status_code: response.status,
            validated_at: new Date().toISOString(),
          };
        } catch (error: any) {
          // Don't log every failure - just mark as inaccessible
          return {
            ...citation,
            is_accessible: false,
            validation_status_code: 0,
            validation_error: error.name === 'AbortError' ? 'timeout' : error.message,
            validated_at: new Date().toISOString(),
          };
        }
      })
    );

    allValidated.push(...batchResults);
  }

  const accessibleCount = allValidated.filter(c => c.is_accessible).length;

  console.log(`[Citation Validator] Results: ${accessibleCount}/${totalCount} accessible`);

  return {
    validatedCitations: allValidated,
    accessibleCount,
    totalCount,
    validationMetadata: {
      original_count: totalCount,
      validated_count: allValidated.length,
      accessible_count: accessibleCount,
      filtered_count: totalCount - accessibleCount,
      validated_at: new Date().toISOString(),
      validation_version: 'inline-v1'
    }
  };
}

/**
 * Trigger async citation validation for a response
 * Returns immediately, validation happens in background
 */
export async function triggerAsyncValidation(
  supabaseUrl: string,
  supabaseServiceKey: string,
  responseId: string
): Promise<void> {
  try {
    // Fire and forget - don't await
    fetch(`${supabaseUrl}/functions/v1/validate-citations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ responseId }),
    }).catch(err => {
      console.warn(`[Citation Validator] Async validation trigger failed for ${responseId}:`, err.message);
    });
    
    console.log(`[Citation Validator] Async validation triggered for response: ${responseId}`);
  } catch (error) {
    // Non-blocking - just log the error
    console.warn('[Citation Validator] Failed to trigger async validation:', error);
  }
}

/**
 * Validate and update citations directly on a response record
 * This is the preferred inline method for batch processing
 */
export async function validateAndUpdateCitations(
  supabase: any,
  responseId: string,
  citationsJson: any
): Promise<boolean> {
  if (!citationsJson?.citations || citationsJson.citations.length === 0) {
    return true; // Nothing to validate
  }

  try {
    // Mark as validating
    await supabase
      .from('prompt_provider_responses')
      .update({ citations_validation_status: 'validating' })
      .eq('id', responseId);

    const { validatedCitations, accessibleCount, validationMetadata } = 
      await validateCitationsInline(citationsJson.citations, { timeout: 3000, maxConcurrent: 3 });

    // Keep only accessible citations in the filtered list
    const filteredCitations = validatedCitations.filter(c => c.is_accessible);

    // Update with validated data
    const updatedCitationsJson = {
      ...citationsJson,
      citations: filteredCitations,
      all_citations: validatedCitations, // Keep full list for debugging
      validation_metadata: validationMetadata,
    };

    await supabase
      .from('prompt_provider_responses')
      .update({
        citations_json: updatedCitationsJson,
        citations_validation_status: 'completed',
        citations_validated_at: new Date().toISOString(),
      })
      .eq('id', responseId);

    console.log(`[Citation Validator] Updated response ${responseId}: ${accessibleCount}/${citationsJson.citations.length} accessible`);
    return true;
  } catch (error) {
    console.error(`[Citation Validator] Failed to validate response ${responseId}:`, error);
    
    // Mark as failed but don't block the main flow
    await supabase
      .from('prompt_provider_responses')
      .update({ citations_validation_status: 'failed' })
      .eq('id', responseId)
      .catch(() => {}); // Ignore errors on cleanup

    return false;
  }
}
