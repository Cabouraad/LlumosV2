INSERT INTO public.free_checker_leads (email, domain, company_name, processed, results_sent, metadata)
VALUES (
  'chris.abouraad@smbteam.com',
  'smithelaw.com',
  'Smith E Law',
  true,
  false,
  jsonb_build_object(
    'firstName', 'Eon',
    'industry', 'Legal services',
    'businessType', 'Law firm',
    'locations', jsonb_build_array('New York, NY', 'Hartford, CT'),
    'description', 'Smith E Law is a law firm with offices in New York City and Hartford, Connecticut, providing legal services to clients in those markets.',
    'researchOverride', true,
    'promptGuidance', 'Generate buyer-intent prompts relevant to a law firm serving New York City and Hartford, CT for the current year (2026). Do NOT use year-specific phrasing like "best law firm 2023" or any outdated year. Use evergreen or current-year framing (e.g., "top-rated", "near me", "this year"). Focus on practice-area searches a prospective client would actually ask an AI assistant about a law firm in NYC or Hartford.'
  )
);

UPDATE public.visibility_report_requests
SET status = 'pending',
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'firstName', 'Eon',
      'rerunReason', 'wrong industry classification + outdated year prompts',
      'industryHint', 'Legal services - law firm in NYC and Hartford CT',
      'emailSent', false
    )
WHERE domain = 'smithelaw.com'
  AND email = 'chris.abouraad@smbteam.com';