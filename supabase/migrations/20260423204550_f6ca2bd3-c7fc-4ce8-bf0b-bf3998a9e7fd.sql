INSERT INTO public.free_checker_leads (domain, email, processed, results_sent, metadata)
VALUES (
  'cohenandcohenlaw.com',
  'chris.abouraad@smbteam.com',
  true,
  true,
  jsonb_build_object(
    'business_research', E'Cohen & Cohen is a personal injury law firm headquartered in Hollywood, Florida (Hollywood, FL), serving clients throughout South Florida including Broward County, Miami-Dade, and the greater Fort Lauderdale and Miami metropolitan areas.\n\n1. Industry/Category: Personal injury law firm based in Hollywood, FL (South Florida).\n2. Main products/services: Personal injury representation including car accidents, motorcycle accidents, truck accidents, slip and fall, wrongful death, and insurance claims for clients in Hollywood FL and surrounding South Florida communities.\n3. Target audience: Injury victims and families located in Hollywood, Florida and the South Florida region (Broward County, Miami-Dade, Fort Lauderdale, Miami).\n4. Key competitors: Other South Florida / Hollywood FL personal injury firms such as Morgan & Morgan, Steinger Greene & Feiner, Lytal Reiter Smith Ivey & Fronrath, Rosenberg & Rosenberg, and Schiller Kessler Group.\n\nGEOGRAPHY: Hollywood, Florida (NOT Washington DC). All location-specific prompts and analysis MUST use Hollywood, FL / South Florida / Broward County as the geography. The firm does NOT operate in Washington DC.',
    'research_cached_at', now()::text,
    'manual_seed', true,
    'seed_reason', 'Override incorrect Washington DC inference; firm is in Hollywood FL'
  )
);