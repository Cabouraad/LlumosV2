#!/usr/bin/env node

/**
 * Puppeteer Prerendering Script for SEO
 * 
 * This script generates static HTML files for marketing pages by:
 * 1. Serving the built dist folder locally
 * 2. Using Puppeteer to visit each route and wait for content
 * 3. Capturing the fully-rendered HTML
 * 4. Overwriting the dist files with the prerendered content
 */

import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = join(__dirname, '..', 'dist');
const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

// Routes to prerender with their validation selectors/text
const ROUTES = [
  // Core marketing pages
  { path: '/', waitForSelector: 'h1', validateText: null, outputPath: 'index.html' },
  { path: '/resources', waitForSelector: 'h1', validateText: ['Resources', 'Guides', 'Insights'], outputPath: 'resources/index.html' },
  { path: '/pricing', waitForSelector: 'h1', validateText: ['Pricing', 'Plans'], outputPath: 'pricing/index.html' },
  { path: '/features', waitForSelector: 'h1', validateText: ['Features', 'Platform'], outputPath: 'features/index.html' },
  { path: '/demo', waitForSelector: 'h1', validateText: ['Demo', 'Watch'], outputPath: 'demo/index.html' },
  { path: '/terms', waitForSelector: 'h1', validateText: ['Terms'], outputPath: 'terms/index.html' },
  { path: '/privacy', waitForSelector: 'h1', validateText: ['Privacy'], outputPath: 'privacy/index.html' },
  { path: '/security', waitForSelector: 'h1', validateText: ['Security'], outputPath: 'security/index.html' },
  { path: '/sitemap', waitForSelector: 'h1', validateText: ['Sitemap'], outputPath: 'sitemap-page/index.html' },
  { path: '/agencies', waitForSelector: 'h1', validateText: ['Agencies', 'Agency'], outputPath: 'agencies/index.html' },
  { path: '/free-checker', waitForSelector: 'h1', validateText: ['Free', 'Checker', 'Visibility'], outputPath: 'free-checker/index.html' },
  { path: '/vs-competitors', waitForSelector: 'h1', validateText: ['Compare', 'Competitor'], outputPath: 'vs-competitors/index.html' },
  
  // Feature pages
  { path: '/features/content-studio', waitForSelector: 'h1', validateText: ['Content Studio', 'AEO', 'GEO'], outputPath: 'features/content-studio/index.html' },
  { path: '/features/brand-visibility', waitForSelector: 'h1', validateText: ['Visibility', 'Brand'], outputPath: 'features/brand-visibility/index.html' },
  { path: '/features/competitive-analysis', waitForSelector: 'h1', validateText: ['Competitive', 'Analysis'], outputPath: 'features/competitive-analysis/index.html' },
  { path: '/features/actionable-recommendations', waitForSelector: 'h1', validateText: ['Recommendations', 'Actionable'], outputPath: 'features/actionable-recommendations/index.html' },
  { path: '/features/citation-analysis', waitForSelector: 'h1', validateText: ['Citation'], outputPath: 'features/citation-analysis/index.html' },
  { path: '/features/llms-txt', waitForSelector: 'h1', validateText: ['LLMs', 'txt'], outputPath: 'features/llms-txt/index.html' },
  { path: '/features/tier-comparison', waitForSelector: 'h1', validateText: ['Tier', 'Comparison'], outputPath: 'features/tier-comparison/index.html' },
  
  // Plan pages
  { path: '/plans/starter', waitForSelector: 'h1', validateText: ['Starter'], outputPath: 'plans/starter/index.html' },
  { path: '/plans/growth', waitForSelector: 'h1', validateText: ['Growth'], outputPath: 'plans/growth/index.html' },
  { path: '/plans/pro', waitForSelector: 'h1', validateText: ['Pro'], outputPath: 'plans/pro/index.html' },
  { path: '/plans/agency', waitForSelector: 'h1', validateText: ['Agency'], outputPath: 'plans/agency/index.html' },
  { path: '/contact-sales', waitForSelector: 'h1', validateText: ['Contact', 'Sales'], outputPath: 'contact-sales/index.html' },
  
  // Blog posts
  { path: '/blog/how-to-optimize-for-chatgpt-search', waitForSelector: 'h1', validateText: ['ChatGPT'], outputPath: 'blog/how-to-optimize-for-chatgpt-search/index.html' },
  { path: '/blog/profound-ai-alternative-pricing', waitForSelector: 'h1', validateText: ['Profound', 'Alternative'], outputPath: 'blog/profound-ai-alternative-pricing/index.html' },
  { path: '/blog/chatgpt-introducing-ads-how-brands-should-prepare', waitForSelector: 'h1', validateText: ['ChatGPT', 'Ads'], outputPath: 'blog/chatgpt-introducing-ads-how-brands-should-prepare/index.html' },
  
  // Resources/Blog posts
  { path: '/resources/understanding-ai-search-optimization', waitForSelector: 'h1', validateText: ['AI Search'], outputPath: 'resources/understanding-ai-search-optimization/index.html' },
  { path: '/resources/choosing-ai-visibility-tools', waitForSelector: 'h1', validateText: ['Visibility'], outputPath: 'resources/choosing-ai-visibility-tools/index.html' },
  { path: '/resources/ai-search-best-practices', waitForSelector: 'h1', validateText: ['Best Practices'], outputPath: 'resources/ai-search-best-practices/index.html' },
  { path: '/resources/google-ai-overviews-optimization-guide', waitForSelector: 'h1', validateText: ['Google', 'AI'], outputPath: 'resources/google-ai-overviews-optimization-guide/index.html' },
  { path: '/resources/introducing-llumos-free-tier', waitForSelector: 'h1', validateText: ['Free'], outputPath: 'resources/introducing-llumos-free-tier/index.html' },
  { path: '/resources/getting-found-in-ai-search-beginners-guide', waitForSelector: 'h1', validateText: ['Beginner'], outputPath: 'resources/getting-found-in-ai-search-beginners-guide/index.html' },
  { path: '/resources/measuring-ai-search-visibility', waitForSelector: 'h1', validateText: ['Measuring'], outputPath: 'resources/measuring-ai-search-visibility/index.html' },
  { path: '/resources/audit-your-brand-in-ai', waitForSelector: 'h1', validateText: ['Audit'], outputPath: 'resources/audit-your-brand-in-ai/index.html' },
  { path: '/resources/chatgpt-perplexity-claude-visibility-comparison', waitForSelector: 'h1', validateText: ['Comparison'], outputPath: 'resources/chatgpt-perplexity-claude-visibility-comparison/index.html' },
  { path: '/resources/competitor-analysis-ai-search', waitForSelector: 'h1', validateText: ['Competitor'], outputPath: 'resources/competitor-analysis-ai-search/index.html' },
  { path: '/resources/ai-search-content-strategy', waitForSelector: 'h1', validateText: ['Content Strategy'], outputPath: 'resources/ai-search-content-strategy/index.html' },
  { path: '/resources/local-business-ai-search-visibility', waitForSelector: 'h1', validateText: ['Local'], outputPath: 'resources/local-business-ai-search-visibility/index.html' },
  { path: '/resources/content-studio-aeo-geo-guide', waitForSelector: 'h1', validateText: ['Content Studio'], outputPath: 'resources/content-studio-aeo-geo-guide/index.html' },
  
  // Solution pages
  { path: '/solutions/saas', waitForSelector: 'h1', validateText: ['SaaS'], outputPath: 'solutions/saas/index.html' },
  { path: '/solutions/ecommerce', waitForSelector: 'h1', validateText: ['Ecommerce', 'E-commerce'], outputPath: 'solutions/ecommerce/index.html' },
  { path: '/solutions/agencies', waitForSelector: 'h1', validateText: ['Agencies'], outputPath: 'solutions/agencies/index.html' },
  
  // Other pages
  { path: '/compare/chatgpt-vs-perplexity', waitForSelector: 'h1', validateText: ['ChatGPT', 'Perplexity'], outputPath: 'compare/chatgpt-vs-perplexity/index.html' },
  { path: '/knowledge/geo-guide', waitForSelector: 'h1', validateText: ['GEO', 'Generative'], outputPath: 'knowledge/geo-guide/index.html' },
  { path: '/tools/ai-competitor-finder', waitForSelector: 'h1', validateText: ['Competitor', 'Finder'], outputPath: 'tools/ai-competitor-finder/index.html' },
  { path: '/score-results', waitForSelector: 'h1', validateText: ['Score', 'Results', 'Visibility'], outputPath: 'score-results/index.html' },
];

let serverProcess = null;

function getServeCommand() {
  // Avoid relying on `npx` (often unavailable in cloud build environments).
  // Run the installed dependency directly via Node.
  const serveEntry = join(__dirname, '..', 'node_modules', 'serve', 'build', 'main.js');
  return {
    command: process.execPath,
    args: [serveEntry, DIST_DIR, '-l', PORT.toString(), '-s'],
  };
}

async function startServer() {
  return new Promise((resolve, reject) => {
    console.log(`🚀 Starting local server on port ${PORT}...`);

    let settled = false;
    let timeoutId = null;
    const settle = (value, isError = false) => {
      if (settled) return;
      settled = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (isError) reject(value);
      else resolve(value);
    };

    const { command, args } = getServeCommand();
    serverProcess = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    });

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Accepting connections') || output.includes('Serving')) {
        console.log('✅ Server started successfully');
        settle(true);
      }
    });

    serverProcess.stderr.on('data', (data) => {
      // serve outputs to stderr for some messages, not always errors
      const output = data.toString();
      if (output.includes('Accepting connections') || output.includes('Serving')) {
        console.log('✅ Server started successfully');
        settle(true);
      }
    });

    serverProcess.on('error', (err) => {
      settle(new Error(`Failed to start server: ${err.message}`), true);
    });

    // Fallback timeout - assume server is ready after 3 seconds
    timeoutId = setTimeout(() => {
      console.log('✅ Server assumed ready (timeout fallback)');
      settle(true);
    }, 3000);
  });
}

function stopServer() {
  if (serverProcess) {
    console.log('🛑 Stopping local server...');
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
}

async function prerenderRoute(browser, route) {
  const { path, waitForSelector, validateText, outputPath } = route;
  const url = `${BASE_URL}${path}`;
  
  console.log(`\n📄 Prerendering: ${path}`);
  console.log(`   URL: ${url}`);
  
  const page = await browser.newPage();
  
  try {
    // Set viewport for consistent rendering
    await page.setViewport({ width: 1280, height: 800 });
    
    // Navigate and wait for network to be idle
    console.log(`   ⏳ Navigating and waiting for network idle...`);
    await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // Wait for the specific selector
    console.log(`   ⏳ Waiting for selector: ${waitForSelector}`);
    await page.waitForSelector(waitForSelector, { timeout: 10000 });
    
    // Wait for React hydration and snapSaveState signal
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check for snapSaveState (react-snap compatibility)
    await page.evaluate(() => {
      if (typeof window.snapSaveState === 'function') {
        window.snapSaveState();
      }
    });
    
    // Validate content if required
    if (validateText && validateText.length > 0) {
      console.log(`   🔍 Validating content contains: ${validateText.join(' or ')}`);
      
      const pageContent = await page.content();
      const hasValidContent = validateText.some(text => 
        pageContent.toLowerCase().includes(text.toLowerCase())
      );
      
      if (!hasValidContent) {
        console.warn(`   ⚠️ Warning: Page may not contain expected content`);
        // Continue anyway but log the warning
      } else {
        console.log(`   ✅ Content validation passed`);
      }
    }
    
    // Capture the fully rendered HTML
    let html = await page.content();
    
    // Ensure proper doctype
    if (!html.startsWith('<!DOCTYPE')) {
      html = '<!DOCTYPE html>' + html;
    }
    
    // Write to the output file
    const outputFilePath = join(DIST_DIR, outputPath);
    const outputDir = dirname(outputFilePath);
    
    // Ensure directory exists
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    
    writeFileSync(outputFilePath, html, 'utf-8');
    console.log(`   ✅ Saved: ${outputPath} (${(html.length / 1024).toFixed(1)} KB)`);
    
    return { success: true, path, outputPath };
    
  } catch (error) {
    console.error(`   ❌ Error prerendering ${path}: ${error.message}`);
    return { success: false, path, error: error.message };
    
  } finally {
    await page.close();
  }
}

async function verifyPrerender() {
  console.log('\n🔍 Verifying prerendered files...\n');
  
  const resourcesPath = join(DIST_DIR, 'resources', 'index.html');
  const homePath = join(DIST_DIR, 'index.html');
  
  if (!existsSync(resourcesPath)) {
    console.error('❌ resources/index.html does not exist!');
    return false;
  }
  
  const resourcesContent = readFileSync(resourcesPath, 'utf-8');
  const homeContent = readFileSync(homePath, 'utf-8');
  
  // Check that resources page has unique content
  const hasResourcesContent = 
    resourcesContent.toLowerCase().includes('resources') ||
    resourcesContent.toLowerCase().includes('guides') ||
    resourcesContent.toLowerCase().includes('blog');
  
  // Check that it's not identical to home page
  const isDifferentFromHome = resourcesContent !== homeContent;
  
  if (hasResourcesContent && isDifferentFromHome) {
    console.log('✅ Verification PASSED:');
    console.log('   - resources/index.html contains resources-specific content');
    console.log('   - resources/index.html is different from index.html');
    return true;
  } else {
    console.error('❌ Verification FAILED:');
    if (!hasResourcesContent) {
      console.error('   - resources/index.html does not contain expected content');
    }
    if (!isDifferentFromHome) {
      console.error('   - resources/index.html is identical to index.html');
    }
    return false;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('        🔧 Puppeteer Prerendering for SEO                  ');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  let browser = null;
  
  try {
    // Check if dist folder exists
    if (!existsSync(DIST_DIR)) {
      throw new Error('dist folder not found. Run vite build first.');
    }
    
    // Try to launch Puppeteer - skip gracefully if Chrome not available
    console.log('\n🌐 Launching Puppeteer browser...');
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    } catch (launchError) {
      console.log('⚠️  Puppeteer could not launch (Chrome not available in this environment)');
      console.log('   Skipping prerendering - build will complete without static HTML generation');
      console.log('   Run this script locally to generate prerendered pages.\n');
      process.exit(0); // Exit successfully to not block the build
    }
    console.log('✅ Browser launched');
    
    // Start local server
    try {
      await startServer();
    } catch (serverError) {
      console.log('⚠️  Local server could not start in this environment');
      console.log('   Skipping prerendering - build will complete without static HTML generation');
      console.log(`   Reason: ${serverError?.message || String(serverError)}\n`);
      process.exit(0);
    }
    
    // Prerender each route
    const results = [];
    for (const route of ROUTES) {
      const result = await prerenderRoute(browser, route);
      results.push(result);
    }
    
    // Summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('                      Summary                              ');
    console.log('═══════════════════════════════════════════════════════════');
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    
    if (failed > 0) {
      console.log('\nFailed routes:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`  - ${r.path}: ${r.error}`);
      });
    }
    
    // Verify the prerender worked correctly
    const verified = await verifyPrerender();
    
    if (!verified) {
      process.exit(1);
    }
    
    console.log('\n✨ Prerendering complete!\n');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
    
  } finally {
    // Cleanup
    if (browser) {
      console.log('🧹 Closing browser...');
      await browser.close();
    }
    stopServer();
  }
}

// Run the script
main();
