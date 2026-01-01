/**
 * Domain-to-brand resolver for citation enrichment
 * Maps domains to normalized brand names with competitor detection
 */

export interface ResolvedBrand {
  brand: string;
  canonicalDomain: string;
  type: 'known' | 'heuristic' | 'unknown';
}

// Curated mapping of known industry players and major brands
const KNOWN_DOMAIN_MAPPINGS = new Map<string, string>([
  // === Automotive marketplace ===
  ['cars.com', 'Cars.com'],
  ['cargurus.com', 'CarGurus'],
  ['autotrader.com', 'Autotrader'],
  ['kbb.com', 'Kelley Blue Book'],
  ['edmunds.com', 'Edmunds'],
  ['carvana.com', 'Carvana'],
  ['carmax.com', 'CarMax'],
  ['truecar.com', 'TrueCar'],
  ['carsdirect.com', 'CarsDirect'],
  ['vroom.com', 'Vroom'],
  ['shift.com', 'Shift'],
  ['beepi.com', 'Beepi'],
  ['carfax.com', 'Carfax'],
  ['autoblog.com', 'Autoblog'],
  ['motortrend.com', 'MotorTrend'],
  ['caranddriver.com', 'Car and Driver'],
  ['jalopnik.com', 'Jalopnik'],
  ['thedrive.com', 'The Drive'],
  ['autotempest.com', 'Autotempest'],
  ['iSeeCars.com', 'iSeeCars'],
  
  // === CRM & Sales ===
  ['hubspot.com', 'HubSpot'],
  ['salesforce.com', 'Salesforce'],
  ['pipedrive.com', 'Pipedrive'],
  ['zoho.com', 'Zoho'],
  ['freshworks.com', 'Freshworks'],
  ['freshsales.com', 'Freshsales'],
  ['copper.com', 'Copper'],
  ['insightly.com', 'Insightly'],
  ['nutshell.com', 'Nutshell'],
  ['close.com', 'Close'],
  ['monday.com', 'Monday.com'],
  ['sugarcrm.com', 'SugarCRM'],
  ['nimble.com', 'Nimble'],
  ['streak.com', 'Streak'],
  ['agilecrm.com', 'Agile CRM'],
  ['capsulecrm.com', 'Capsule'],
  ['salesflare.com', 'Salesflare'],
  ['keap.com', 'Keap'],
  ['infusionsoft.com', 'Keap'],
  ['activecampaign.com', 'ActiveCampaign'],
  
  // === Marketing automation ===
  ['marketo.com', 'Marketo'],
  ['pardot.com', 'Pardot'],
  ['mailchimp.com', 'Mailchimp'],
  ['constantcontact.com', 'Constant Contact'],
  ['klaviyo.com', 'Klaviyo'],
  ['sendgrid.com', 'SendGrid'],
  ['sendinblue.com', 'Brevo'],
  ['brevo.com', 'Brevo'],
  ['convertkit.com', 'ConvertKit'],
  ['drip.com', 'Drip'],
  ['omnisend.com', 'Omnisend'],
  ['getresponse.com', 'GetResponse'],
  ['aweber.com', 'AWeber'],
  ['moosend.com', 'Moosend'],
  ['campaignmonitor.com', 'Campaign Monitor'],
  ['emma.com', 'Emma'],
  ['dotdigital.com', 'Dotdigital'],
  
  // === Customer support ===
  ['intercom.com', 'Intercom'],
  ['zendesk.com', 'Zendesk'],
  ['freshdesk.com', 'Freshdesk'],
  ['helpscout.com', 'Help Scout'],
  ['drift.com', 'Drift'],
  ['livechat.com', 'LiveChat'],
  ['crisp.chat', 'Crisp'],
  ['tawk.to', 'Tawk.to'],
  ['gorgias.com', 'Gorgias'],
  ['front.com', 'Front'],
  ['kustomer.com', 'Kustomer'],
  ['kayako.com', 'Kayako'],
  ['happyfox.com', 'HappyFox'],
  ['groove.co', 'Groove'],
  
  // === Major tech companies ===
  ['google.com', 'Google'],
  ['microsoft.com', 'Microsoft'],
  ['apple.com', 'Apple'],
  ['amazon.com', 'Amazon'],
  ['aws.amazon.com', 'AWS'],
  ['meta.com', 'Meta'],
  ['facebook.com', 'Meta'],
  ['twitter.com', 'X'],
  ['x.com', 'X'],
  ['linkedin.com', 'LinkedIn'],
  ['youtube.com', 'YouTube'],
  ['instagram.com', 'Instagram'],
  ['tiktok.com', 'TikTok'],
  ['netflix.com', 'Netflix'],
  ['spotify.com', 'Spotify'],
  ['uber.com', 'Uber'],
  ['airbnb.com', 'Airbnb'],
  ['stripe.com', 'Stripe'],
  ['paypal.com', 'PayPal'],
  ['dropbox.com', 'Dropbox'],
  ['slack.com', 'Slack'],
  ['zoom.us', 'Zoom'],
  ['notion.so', 'Notion'],
  ['figma.com', 'Figma'],
  ['canva.com', 'Canva'],
  ['airtable.com', 'Airtable'],
  ['asana.com', 'Asana'],
  ['trello.com', 'Trello'],
  ['atlassian.com', 'Atlassian'],
  ['jira.com', 'Jira'],
  ['confluence.com', 'Confluence'],
  ['github.com', 'GitHub'],
  ['gitlab.com', 'GitLab'],
  ['bitbucket.org', 'Bitbucket'],
  ['twilio.com', 'Twilio'],
  ['cloudflare.com', 'Cloudflare'],
  ['digitalocean.com', 'DigitalOcean'],
  ['heroku.com', 'Heroku'],
  ['vercel.com', 'Vercel'],
  ['netlify.com', 'Netlify'],
  
  // === News & media ===
  ['cnn.com', 'CNN'],
  ['bbc.com', 'BBC'],
  ['bbc.co.uk', 'BBC'],
  ['reuters.com', 'Reuters'],
  ['bloomberg.com', 'Bloomberg'],
  ['wsj.com', 'Wall Street Journal'],
  ['nytimes.com', 'New York Times'],
  ['washingtonpost.com', 'Washington Post'],
  ['guardian.com', 'The Guardian'],
  ['theguardian.com', 'The Guardian'],
  ['techcrunch.com', 'TechCrunch'],
  ['venturebeat.com', 'VentureBeat'],
  ['wired.com', 'Wired'],
  ['arstechnica.com', 'Ars Technica'],
  ['theverge.com', 'The Verge'],
  ['engadget.com', 'Engadget'],
  ['mashable.com', 'Mashable'],
  ['gizmodo.com', 'Gizmodo'],
  ['cnet.com', 'CNET'],
  ['zdnet.com', 'ZDNet'],
  ['forbes.com', 'Forbes'],
  ['businessinsider.com', 'Business Insider'],
  ['entrepreneur.com', 'Entrepreneur'],
  ['inc.com', 'Inc.'],
  ['fastcompany.com', 'Fast Company'],
  ['hbr.org', 'Harvard Business Review'],
  ['fortune.com', 'Fortune'],
  
  // === E-commerce & retail ===
  ['shopify.com', 'Shopify'],
  ['magento.com', 'Magento'],
  ['woocommerce.com', 'WooCommerce'],
  ['bigcommerce.com', 'BigCommerce'],
  ['squarespace.com', 'Squarespace'],
  ['wix.com', 'Wix'],
  ['wordpress.com', 'WordPress'],
  ['wordpress.org', 'WordPress'],
  ['webflow.com', 'Webflow'],
  ['godaddy.com', 'GoDaddy'],
  ['bluehost.com', 'Bluehost'],
  ['hostinger.com', 'Hostinger'],
  ['etsy.com', 'Etsy'],
  ['ebay.com', 'eBay'],
  ['walmart.com', 'Walmart'],
  ['target.com', 'Target'],
  ['bestbuy.com', 'Best Buy'],
  ['costco.com', 'Costco'],
  ['homedepot.com', 'Home Depot'],
  ['lowes.com', "Lowe's"],
  ['wayfair.com', 'Wayfair'],
  ['overstock.com', 'Overstock'],
  ['aliexpress.com', 'AliExpress'],
  ['alibaba.com', 'Alibaba'],
  
  // === Marketing & analytics ===
  ['analytics.google.com', 'Google Analytics'],
  ['adobe.com', 'Adobe'],
  ['mixpanel.com', 'Mixpanel'],
  ['segment.com', 'Segment'],
  ['amplitude.com', 'Amplitude'],
  ['hotjar.com', 'Hotjar'],
  ['crazyegg.com', 'Crazy Egg'],
  ['optimizely.com', 'Optimizely'],
  ['vwo.com', 'VWO'],
  ['heap.io', 'Heap'],
  ['fullstory.com', 'FullStory'],
  ['logrocket.com', 'LogRocket'],
  ['mouseflow.com', 'Mouseflow'],
  ['luckyorange.com', 'Lucky Orange'],
  ['semrush.com', 'Semrush'],
  ['ahrefs.com', 'Ahrefs'],
  ['moz.com', 'Moz'],
  ['majestic.com', 'Majestic'],
  ['spyfu.com', 'SpyFu'],
  ['similarweb.com', 'SimilarWeb'],
  ['buzzsumo.com', 'BuzzSumo'],
  ['sproutsocial.com', 'Sprout Social'],
  ['hootsuite.com', 'Hootsuite'],
  ['buffer.com', 'Buffer'],
  ['later.com', 'Later'],
  ['socialbee.com', 'SocialBee'],
  ['socialpilot.co', 'SocialPilot'],
  
  // === Project management ===
  ['basecamp.com', 'Basecamp'],
  ['clickup.com', 'ClickUp'],
  ['wrike.com', 'Wrike'],
  ['smartsheet.com', 'Smartsheet'],
  ['teamwork.com', 'Teamwork'],
  ['todoist.com', 'Todoist'],
  ['evernote.com', 'Evernote'],
  ['linear.app', 'Linear'],
  ['height.app', 'Height'],
  ['productboard.com', 'Productboard'],
  ['aha.io', 'Aha!'],
  ['coda.io', 'Coda'],
  
  // === HR & recruiting ===
  ['workday.com', 'Workday'],
  ['adp.com', 'ADP'],
  ['paychex.com', 'Paychex'],
  ['gusto.com', 'Gusto'],
  ['rippling.com', 'Rippling'],
  ['bamboohr.com', 'BambooHR'],
  ['namely.com', 'Namely'],
  ['lattice.com', 'Lattice'],
  ['lever.co', 'Lever'],
  ['greenhouse.io', 'Greenhouse'],
  ['icims.com', 'iCIMS'],
  ['jobvite.com', 'Jobvite'],
  ['recruitee.com', 'Recruitee'],
  ['breezy.hr', 'Breezy HR'],
  ['indeed.com', 'Indeed'],
  ['glassdoor.com', 'Glassdoor'],
  ['ziprecruiter.com', 'ZipRecruiter'],
  
  // === Finance & accounting ===
  ['quickbooks.intuit.com', 'QuickBooks'],
  ['intuit.com', 'Intuit'],
  ['xero.com', 'Xero'],
  ['freshbooks.com', 'FreshBooks'],
  ['wave.com', 'Wave'],
  ['bill.com', 'Bill.com'],
  ['expensify.com', 'Expensify'],
  ['brex.com', 'Brex'],
  ['ramp.com', 'Ramp'],
  ['divvy.com', 'Divvy'],
  ['plaid.com', 'Plaid'],
  ['square.com', 'Square'],
  ['nerdwallet.com', 'NerdWallet'],
  ['mint.com', 'Mint'],
  ['personalcapital.com', 'Personal Capital'],
  ['betterment.com', 'Betterment'],
  ['wealthfront.com', 'Wealthfront'],
  ['robinhood.com', 'Robinhood'],
  ['coinbase.com', 'Coinbase'],
  
  // === Education & learning ===
  ['coursera.org', 'Coursera'],
  ['udemy.com', 'Udemy'],
  ['skillshare.com', 'Skillshare'],
  ['linkedin.com/learning', 'LinkedIn Learning'],
  ['edx.org', 'edX'],
  ['khanacademy.org', 'Khan Academy'],
  ['codecademy.com', 'Codecademy'],
  ['pluralsight.com', 'Pluralsight'],
  ['masterclass.com', 'MasterClass'],
  ['duolingo.com', 'Duolingo'],
  
  // === Healthcare & fitness ===
  ['zocdoc.com', 'Zocdoc'],
  ['healthgrades.com', 'Healthgrades'],
  ['webmd.com', 'WebMD'],
  ['mayoclinic.org', 'Mayo Clinic'],
  ['clevelandclinic.org', 'Cleveland Clinic'],
  ['peloton.com', 'Peloton'],
  ['myfitnesspal.com', 'MyFitnessPal'],
  ['strava.com', 'Strava'],
  ['fitbit.com', 'Fitbit'],
  ['calm.com', 'Calm'],
  ['headspace.com', 'Headspace'],
  
  // === Real estate ===
  ['zillow.com', 'Zillow'],
  ['realtor.com', 'Realtor.com'],
  ['redfin.com', 'Redfin'],
  ['trulia.com', 'Trulia'],
  ['apartments.com', 'Apartments.com'],
  ['rent.com', 'Rent.com'],
  ['hotpads.com', 'HotPads'],
  ['rentcafe.com', 'RentCafe'],
  ['costar.com', 'CoStar'],
  ['loopnet.com', 'LoopNet'],
  ['compass.com', 'Compass'],
  ['opendoor.com', 'Opendoor'],
  ['offerpad.com', 'Offerpad'],
  
  // === Travel & hospitality ===
  ['booking.com', 'Booking.com'],
  ['expedia.com', 'Expedia'],
  ['tripadvisor.com', 'TripAdvisor'],
  ['kayak.com', 'Kayak'],
  ['hotels.com', 'Hotels.com'],
  ['vrbo.com', 'Vrbo'],
  ['priceline.com', 'Priceline'],
  ['hopper.com', 'Hopper'],
  ['skyscanner.com', 'Skyscanner'],
  ['google.com/travel', 'Google Travel'],
  
  // === Food & delivery ===
  ['doordash.com', 'DoorDash'],
  ['grubhub.com', 'Grubhub'],
  ['ubereats.com', 'Uber Eats'],
  ['postmates.com', 'Postmates'],
  ['instacart.com', 'Instacart'],
  ['yelp.com', 'Yelp'],
  ['opentable.com', 'OpenTable'],
  ['resy.com', 'Resy'],
  ['toast.com', 'Toast'],
  ['square.com/restaurants', 'Square for Restaurants'],
  
  // === Legal & compliance ===
  ['docusign.com', 'DocuSign'],
  ['hellosign.com', 'HelloSign'],
  ['pandadoc.com', 'PandaDoc'],
  ['legalzoom.com', 'LegalZoom'],
  ['rocketlawyer.com', 'Rocket Lawyer'],
  ['clio.com', 'Clio'],
  ['lawdepot.com', 'LawDepot'],
  
  // === Communication & collaboration ===
  ['teams.microsoft.com', 'Microsoft Teams'],
  ['discord.com', 'Discord'],
  ['webex.com', 'Webex'],
  ['gotomeeting.com', 'GoTo Meeting'],
  ['loom.com', 'Loom'],
  ['miro.com', 'Miro'],
  ['lucid.app', 'Lucidchart'],
  ['whimsical.com', 'Whimsical'],
  ['invision.com', 'InVision'],
  ['sketch.com', 'Sketch'],
  ['zeplin.io', 'Zeplin'],
  ['abstract.com', 'Abstract'],
  
  // === Cloud & infrastructure ===
  ['azure.microsoft.com', 'Microsoft Azure'],
  ['cloud.google.com', 'Google Cloud'],
  ['oracle.com', 'Oracle'],
  ['ibm.com', 'IBM'],
  ['vmware.com', 'VMware'],
  ['redhat.com', 'Red Hat'],
  ['docker.com', 'Docker'],
  ['kubernetes.io', 'Kubernetes'],
  ['terraform.io', 'Terraform'],
  ['hashicorp.com', 'HashiCorp'],
  ['datadog.com', 'Datadog'],
  ['newrelic.com', 'New Relic'],
  ['splunk.com', 'Splunk'],
  ['sumo.com', 'Sumo Logic'],
  ['elastic.co', 'Elastic'],
  ['mongodb.com', 'MongoDB'],
  ['postgresql.org', 'PostgreSQL'],
  ['mysql.com', 'MySQL'],
  ['redis.io', 'Redis'],
  ['snowflake.com', 'Snowflake'],
  ['databricks.com', 'Databricks'],
  ['tableau.com', 'Tableau'],
  ['looker.com', 'Looker'],
  ['powerbi.microsoft.com', 'Power BI'],
  ['metabase.com', 'Metabase'],
  
  // === AI & ML ===
  ['openai.com', 'OpenAI'],
  ['anthropic.com', 'Anthropic'],
  ['cohere.com', 'Cohere'],
  ['huggingface.co', 'Hugging Face'],
  ['scale.com', 'Scale AI'],
  ['jasper.ai', 'Jasper'],
  ['copy.ai', 'Copy.ai'],
  ['writesonic.com', 'Writesonic'],
  ['grammarly.com', 'Grammarly'],
  ['midjourney.com', 'Midjourney'],
  ['stability.ai', 'Stability AI'],
  ['runway.ml', 'Runway'],
  ['descript.com', 'Descript'],
  
  // === Security ===
  ['okta.com', 'Okta'],
  ['auth0.com', 'Auth0'],
  ['onelogin.com', 'OneLogin'],
  ['duo.com', 'Duo Security'],
  ['crowdstrike.com', 'CrowdStrike'],
  ['sentinelone.com', 'SentinelOne'],
  ['paloaltonetworks.com', 'Palo Alto Networks'],
  ['fortinet.com', 'Fortinet'],
  ['zscaler.com', 'Zscaler'],
  ['proofpoint.com', 'Proofpoint'],
  ['1password.com', '1Password'],
  ['lastpass.com', 'LastPass'],
  ['bitwarden.com', 'Bitwarden'],
  ['dashlane.com', 'Dashlane'],
  ['nordvpn.com', 'NordVPN'],
  ['expressvpn.com', 'ExpressVPN'],
]);

/**
 * Resolve a domain to a normalized brand name
 */
export function resolveDomainToBrand(domain: string): ResolvedBrand {
  if (!domain || typeof domain !== 'string') {
    return {
      brand: domain || 'Unknown',
      canonicalDomain: domain || 'unknown',
      type: 'unknown'
    };
  }

  // Normalize domain (remove protocol, www, trailing slash)
  const normalizedDomain = normalizeDomain(domain);
  
  // Check known mappings first
  const knownBrand = KNOWN_DOMAIN_MAPPINGS.get(normalizedDomain);
  if (knownBrand) {
    return {
      brand: knownBrand,
      canonicalDomain: normalizedDomain,
      type: 'known'
    };
  }
  
  // Check without www prefix
  const withoutWww = normalizedDomain.replace(/^www\./, '');
  const knownBrandWithoutWww = KNOWN_DOMAIN_MAPPINGS.get(withoutWww);
  if (knownBrandWithoutWww) {
    return {
      brand: knownBrandWithoutWww,
      canonicalDomain: withoutWww,
      type: 'known'
    };
  }
  
  // Apply heuristic mapping
  const heuristicBrand = applyHeuristicMapping(withoutWww);
  if (heuristicBrand !== withoutWww) {
    return {
      brand: heuristicBrand,
      canonicalDomain: withoutWww,
      type: 'heuristic'
    };
  }
  
  // Fallback to unknown
  return {
    brand: normalizedDomain,
    canonicalDomain: normalizedDomain,
    type: 'unknown'
  };
}

/**
 * Normalize domain string for consistent matching
 */
function normalizeDomain(domain: string): string {
  return domain
    .toLowerCase()
    .replace(/^https?:\/\//, '') // Remove protocol
    .replace(/^www\./, '')       // Remove www prefix  
    .replace(/\/.*$/, '')        // Remove path
    .replace(/\?.*$/, '')        // Remove query params
    .replace(/#.*$/, '')         // Remove hash
    .trim();
}

/**
 * Apply heuristic rules to generate brand name from domain
 */
function applyHeuristicMapping(domain: string): string {
  try {
    // Skip if domain is too short or doesn't look like a domain
    if (!domain || domain.length < 4 || !domain.includes('.')) {
      return domain;
    }
    
    // Extract main part before first dot
    const parts = domain.split('.');
    const mainPart = parts[0];
    
    // Skip if main part is too short
    if (mainPart.length < 2) {
      return domain;
    }
    
    // Skip common subdomains
    const skipSubdomains = ['blog', 'news', 'shop', 'store', 'api', 'app', 'mobile', 'm', 'support', 'help', 'docs'];
    if (skipSubdomains.includes(mainPart)) {
      return domain;
    }
    
    // Convert to title case with some cleanup
    let brand = mainPart
      .replace(/[-_]/g, ' ')     // Replace hyphens/underscores with spaces
      .replace(/([a-z])([A-Z])/g, '$1 $2')  // Add space before capital letters
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    // Handle special cases
    brand = brand
      .replace(/\bAi\b/g, 'AI')
      .replace(/\bApi\b/g, 'API')
      .replace(/\bUi\b/g, 'UI')
      .replace(/\bIo\b/g, 'IO')
      .replace(/\bSeo\b/g, 'SEO')
      .replace(/\bCrm\b/g, 'CRM')
      .replace(/\bSaas\b/g, 'SaaS');
    
    return brand;
  } catch (error) {
    console.warn('Heuristic mapping failed for domain:', domain, error);
    return domain;
  }
}

/**
 * Check if a resolved brand matches any competitor in the catalog
 */
export function checkCompetitorMatch(
  resolvedBrand: ResolvedBrand, 
  competitorCatalog: Array<{ name: string; variants_json?: any }>
): boolean {
  if (!competitorCatalog || competitorCatalog.length === 0) {
    return false;
  }
  
  const brandLower = resolvedBrand.brand.toLowerCase();
  const domainLower = resolvedBrand.canonicalDomain.toLowerCase();
  
  return competitorCatalog.some(competitor => {
    // Check main name
    if (competitor.name.toLowerCase() === brandLower) {
      return true;
    }
    
    // Check variants if available
    if (competitor.variants_json && Array.isArray(competitor.variants_json)) {
      return competitor.variants_json.some((variant: string) => 
        variant.toLowerCase() === brandLower || 
        variant.toLowerCase() === domainLower
      );
    }
    
    return false;
  });
}

/**
 * Enrich a citation with resolved brand and competitor information
 */
export function enrichCitation(
  citation: any,
  competitorCatalog: Array<{ name: string; variants_json?: any }>
): any {
  if (!citation || !citation.domain) {
    return citation;
  }
  
  const resolvedBrand = resolveDomainToBrand(citation.domain);
  const isCompetitor = checkCompetitorMatch(resolvedBrand, competitorCatalog);
  
  return {
    ...citation,
    resolved_brand: resolvedBrand,
    is_competitor: isCompetitor
  };
}

/**
 * Export the known mappings for admin diagnostics
 */
export function getKnownMappings(): Array<{ domain: string; brand: string }> {
  return Array.from(KNOWN_DOMAIN_MAPPINGS.entries()).map(([domain, brand]) => ({
    domain,
    brand
  }));
}

/**
 * Test the resolver with sample domains (for debugging)
 */
export function testResolver(): Array<{ domain: string; resolved: ResolvedBrand }> {
  const testDomains = [
    'cars.com',
    'www.cargurus.com',
    'https://autotrader.com/listings',
    'example-startup.com',
    'tech-blog.org',
    'unknown-domain',
    'very-long-domain-name.co.uk'
  ];
  
  return testDomains.map(domain => ({
    domain,
    resolved: resolveDomainToBrand(domain)
  }));
}