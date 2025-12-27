-- Drop the duplicate function with inconsistent parameter order
DROP FUNCTION IF EXISTS public.get_citation_performance_insights(uuid, integer, integer, uuid);