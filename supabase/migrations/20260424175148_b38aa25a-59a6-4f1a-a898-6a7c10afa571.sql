INSERT INTO public.free_checker_leads (email, domain, metadata)
VALUES (
  'context-seed@llumos.app',
  'commonsenselawyer.com',
  jsonb_build_object(
    'business_research', E'Common Sense Lawyer is a law firm based in Saskatoon, Saskatchewan, Canada, led by lawyer Don Panko.\n\n1. Industry/category: Legal services — a Canadian law firm (NOT a technology platform, NOT a legaltech company, NOT a SaaS product). Practice areas include family law, divorce, separation, child custody, wills and estates, real estate, and general civil litigation serving individuals and families in Saskatchewan.\n\n2. Main products/services: In-person and virtual legal representation, legal advice, document drafting, court representation, and consultations for residents of Saskatoon and the surrounding Saskatchewan region.\n\n3. Target audience: Individuals and families in Saskatoon, Saskatchewan and nearby communities seeking affordable, plain-language legal counsel.\n\n4. Key competitors: Other Saskatoon-area law firms and Saskatchewan family/estate-law practitioners such as McKercher LLP, MLT Aikins LLP, Robertson Stromberg LLP, Scharfstein LLP, W Law Group LLP, and Stevenson Hood Thornton Beaubier LLP.',
    'research_cached_at', now()::text,
    'seeded', true,
    'seed_reason', 'manual override - report was misclassifying Saskatoon SK law firm as a tech platform'
  )
);

UPDATE public.visibility_report_requests
SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('emailSent', false, 'rerunReason', 'wrong industry classification (tech vs legal); seeded Saskatoon SK legal context', 'rerunResetAt', now()::text)
WHERE email = 'chris.abouraad@smbteam.com'
  AND domain = 'commonsenselawyer.com';