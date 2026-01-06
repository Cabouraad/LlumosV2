-- Enhanced Local Authority: Multi-area and localization support

-- Add service areas array to local_profiles for multi-location support
ALTER TABLE public.local_profiles 
ADD COLUMN IF NOT EXISTS service_areas jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS location_priority text DEFAULT 'primary' CHECK (location_priority IN ('primary', 'secondary', 'expansion')),
ADD COLUMN IF NOT EXISTS location_variants jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS auto_neighborhoods jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS category_location_combos jsonb DEFAULT '[]'::jsonb;

-- Add localization settings to organizations
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS localization_config jsonb DEFAULT '{
  "enable_semantic_variants": true,
  "enable_time_context": true,
  "enable_competitor_gap": true,
  "primary_language": "en",
  "secondary_languages": []
}'::jsonb;

-- Create table for location intelligence (neighborhoods, landmarks per city)
CREATE TABLE IF NOT EXISTS public.location_intelligence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  state text NOT NULL,
  country text DEFAULT 'USA',
  neighborhoods jsonb DEFAULT '[]'::jsonb,
  landmarks jsonb DEFAULT '[]'::jsonb,
  colloquial_names jsonb DEFAULT '[]'::jsonb,
  semantic_variants jsonb DEFAULT '[]'::jsonb,
  popular_categories jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(city, state, country)
);

-- Enable RLS
ALTER TABLE public.location_intelligence ENABLE ROW LEVEL SECURITY;

-- Public read access for location intelligence (reference data)
CREATE POLICY "Location intelligence is publicly readable"
  ON public.location_intelligence FOR SELECT
  USING (true);

-- Create table for category-location prompt patterns
CREATE TABLE IF NOT EXISTS public.category_location_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_keywords text[] NOT NULL,
  pattern_type text NOT NULL CHECK (pattern_type IN ('semantic', 'time_context', 'specialty', 'comparison')),
  prompt_template text NOT NULL,
  intent_tag text NOT NULL,
  priority int DEFAULT 50,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.category_location_patterns ENABLE ROW LEVEL SECURITY;

-- Public read access for patterns (reference data)
CREATE POLICY "Category patterns are publicly readable"
  ON public.category_location_patterns FOR SELECT
  USING (true);

-- Insert default category-location patterns
INSERT INTO public.category_location_patterns (category_keywords, pattern_type, prompt_template, intent_tag, priority) VALUES
-- Semantic variants
(ARRAY['dentist', 'orthodontist', 'dental'], 'semantic', 'Best {category} near {variant} in {city}', 'near_me', 80),
(ARRAY['plumber', 'hvac', 'electrician'], 'semantic', 'Reliable {category} on the {variant} of {city}', 'trust', 80),
(ARRAY['restaurant', 'cafe', 'bar'], 'semantic', 'Top {category} in {variant} {city}', 'best', 85),
(ARRAY['lawyer', 'attorney', 'legal'], 'semantic', '{category} near {variant} courthouse in {city}', 'near_me', 75),

-- Time context patterns
(ARRAY['dentist', 'doctor', 'clinic'], 'time_context', '{category} in {city} open on weekends', 'hours', 70),
(ARRAY['plumber', 'hvac', 'electrician'], 'time_context', '{category} in {city} available for same-day service', 'emergency', 90),
(ARRAY['restaurant', 'cafe', 'bar'], 'time_context', '{category} in {city} open late night', 'hours', 75),
(ARRAY['auto', 'mechanic', 'car'], 'time_context', '{category} in {city} with quick turnaround', 'hours', 70),

-- Specialty combos
(ARRAY['dentist'], 'specialty', 'Best {category} in {city} for families with kids', 'specialty', 85),
(ARRAY['plumber'], 'specialty', '{category} in {city} for old homes and historic buildings', 'specialty', 80),
(ARRAY['electrician'], 'specialty', '{category} in {city} for smart home installation', 'specialty', 75),
(ARRAY['restaurant'], 'specialty', 'Best {category} in {city} for special occasions', 'specialty', 80),
(ARRAY['lawyer', 'attorney'], 'specialty', '{category} in {city} specializing in small business', 'specialty', 85),

-- Comparison patterns
(ARRAY['dentist', 'doctor', 'lawyer'], 'comparison', 'Compare the top 3 {category} options in {city} for value', 'comparison', 70),
(ARRAY['plumber', 'hvac', 'electrician'], 'comparison', 'Which {category} in {city} has the best reviews and pricing?', 'comparison', 75),
(ARRAY['restaurant', 'cafe'], 'comparison', 'Best {category} in {city} vs {competitor_city} area', 'comparison', 65);

-- Seed some location intelligence for major cities
INSERT INTO public.location_intelligence (city, state, neighborhoods, landmarks, colloquial_names, semantic_variants) VALUES
('New York', 'NY', 
  '["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island", "SoHo", "Tribeca", "Upper East Side", "Upper West Side", "Midtown", "Chelsea", "Greenwich Village", "Harlem", "Williamsburg", "DUMBO"]'::jsonb,
  '["Times Square", "Central Park", "Empire State Building", "Brooklyn Bridge", "Wall Street", "Grand Central"]'::jsonb,
  '["NYC", "the city", "the Big Apple"]'::jsonb,
  '["downtown", "uptown", "midtown", "east side", "west side"]'::jsonb
),
('Los Angeles', 'CA',
  '["Hollywood", "Beverly Hills", "Santa Monica", "Venice", "Downtown LA", "Silver Lake", "Echo Park", "West Hollywood", "Brentwood", "Culver City", "Pasadena", "Burbank"]'::jsonb,
  '["Hollywood Sign", "Griffith Observatory", "Venice Beach", "LAX", "UCLA", "USC"]'::jsonb,
  '["LA", "City of Angels", "SoCal"]'::jsonb,
  '["the Westside", "the Valley", "East LA", "South Bay"]'::jsonb
),
('Chicago', 'IL',
  '["Loop", "River North", "Lincoln Park", "Wicker Park", "Logan Square", "Lakeview", "Gold Coast", "Old Town", "Hyde Park", "Wrigleyville"]'::jsonb,
  '["Millennium Park", "Navy Pier", "Wrigley Field", "Willis Tower", "Magnificent Mile", "O''Hare"]'::jsonb,
  '["Chi-town", "the Windy City"]'::jsonb,
  '["downtown", "the Loop", "North Side", "South Side", "West Side"]'::jsonb
),
('Houston', 'TX',
  '["Downtown", "Midtown", "Montrose", "The Heights", "River Oaks", "Memorial", "Galleria", "Medical Center", "Museum District", "East End"]'::jsonb,
  '["Space Center Houston", "NRG Stadium", "Galleria", "Texas Medical Center", "Rice University"]'::jsonb,
  '["H-Town", "Space City"]'::jsonb,
  '["inside the Loop", "the Heights", "Westside", "Southeast"]'::jsonb
),
('Phoenix', 'AZ',
  '["Downtown", "Scottsdale", "Tempe", "Mesa", "Chandler", "Gilbert", "Paradise Valley", "Arcadia", "Biltmore"]'::jsonb,
  '["Chase Field", "Phoenix Zoo", "Desert Botanical Garden", "Camelback Mountain", "ASU"]'::jsonb,
  '["PHX", "the Valley", "Valley of the Sun"]'::jsonb,
  '["East Valley", "West Valley", "North Phoenix", "Central Phoenix"]'::jsonb
)
ON CONFLICT (city, state, country) DO NOTHING;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_location_intelligence_city_state ON public.location_intelligence(city, state);
CREATE INDEX IF NOT EXISTS idx_category_patterns_keywords ON public.category_location_patterns USING GIN(category_keywords);