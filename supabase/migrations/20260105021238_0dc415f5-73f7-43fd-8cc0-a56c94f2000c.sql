-- Add confidence columns to local_ai_scans
ALTER TABLE public.local_ai_scans
ADD COLUMN confidence_score int NOT NULL DEFAULT 0,
ADD COLUMN confidence_label text NOT NULL DEFAULT 'Low';

-- Add extraction tracking columns to local_ai_scan_runs
ALTER TABLE public.local_ai_scan_runs
ADD COLUMN list_detected boolean NOT NULL DEFAULT false,
ADD COLUMN competitor_count int NOT NULL DEFAULT 0;