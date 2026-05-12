INSERT INTO public.visibility_report_requests (email, domain, score, status, metadata)
VALUES (
  'chris.abouraad@smbteam.com',
  'thesgfirm.com',
  0,
  'pending',
  jsonb_build_object(
    'firstName', 'Jadinah',
    'lastName', 'Gustave',
    'companyName', 'The Sejour-Gustave Firm PLLC',
    'role', 'Owner',
    'practiceArea', 'Estate Planning',
    'employeeCount', '6-10',
    'industryHint', 'Legal Firm / Law Firm - Estate Planning',
    'manualRerun', true,
    'prospectName', 'Jadinah Gustave'
  )
);