UPDATE visibility_report_requests
SET status = 'error',
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('cleared_for_rerun_at', now()::text, 'cleared_reason', 'competitor-detection floor fix rerun')
WHERE id IN (
  'aaaaaaaa-1111-4111-a111-111111111111',
  'bbbbbbbb-2222-4222-a222-222222222222',
  'cccccccc-3333-4333-a333-333333333333'
);

INSERT INTO visibility_report_requests (id, email, domain, status, metadata) VALUES
  ('aaaaaaaa-1111-4111-a111-111111111112', 'chris.abouraad@smbteam.com', 'atlfamilyimmigrationlaw.com', 'pending', jsonb_build_object('firstName', 'Jadia', 'companyName', 'Atlanta Family & Immigration')),
  ('bbbbbbbb-2222-4222-a222-222222222223', 'chris.abouraad@smbteam.com', 'dosslaw.ca', 'pending', jsonb_build_object('firstName', 'Marlenne', 'companyName', 'Doss Law Professional Corporation')),
  ('cccccccc-3333-4333-a333-333333333334', 'chris.abouraad@smbteam.com', 'elderlawnv.com', 'pending', jsonb_build_object('firstName', 'Kim', 'companyName', 'Boyer Law Group'));