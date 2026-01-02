/**
 * Weekly Visibility Report PDF Generator - V2 Executive Grade
 * Creates polished, multi-page reports with consistent branding and insights
 * Brand Style Guide: Primary Blue, Secondary Green, Accent Orange
 */

import { PDFDocument, rgb, StandardFonts, PageSizes } from 'https://esm.sh/pdf-lib@1.17.1';
import type { WeeklyReportData, CompetitorData, PromptData } from './types.ts';

// Convert hex colors to RGB for PDF-lib compatibility
function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? rgb(
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255
  ) : rgb(0, 0, 0);
}

// Strip emojis and non-WinAnsi characters to prevent encoding errors
function stripEmojis(text: string | number | null | undefined): string {
  if (text === null || text === undefined) return '';
  const str = String(text);
  return str.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
    .replace(/[^\x00-\xFF]/g, '')
    .trim();
}

// Safe text rendering helper - prevents [object Object] bugs
function safeText(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return stripEmojis(value);
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    // Handle competitor objects
    if ('name' in (value as object)) return stripEmojis((value as { name: string }).name);
    return fallback;
  }
  return stripEmojis(String(value));
}

// Truncate text with ellipsis
function truncateText(text: string, maxLength: number): string {
  const cleaned = stripEmojis(text);
  return cleaned.length > maxLength ? cleaned.substring(0, maxLength - 3) + '...' : cleaned;
}

// Format percentage safely
function formatPercent(value: number | undefined | null, decimals = 1): string {
  if (value === null || value === undefined || isNaN(value)) return '0%';
  return `${value.toFixed(decimals)}%`;
}

// Format number safely
function formatNumber(value: number | undefined | null, decimals = 1): string {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return value.toFixed(decimals);
}

export async function renderReportPDF(dto: WeeklyReportData, sections?: Record<string, boolean> | null): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Brand Style Guide Color Palette
  const colors = {
    primaryBlue: hexToRgb('#1E3A8A'),
    neutralLight: hexToRgb('#F9FAFB'),
    neutralDark: hexToRgb('#111827'),
    neutralGray: hexToRgb('#6B7280'),
    successGreen: hexToRgb('#10B981'),
    errorRed: hexToRgb('#EF4444'),
    accentOrange: hexToRgb('#F97316'),
    warningYellow: hexToRgb('#FBBF24'),
  };

  // Page dimensions (A4)
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 40;
  let pageNumber = 0;

  // Helper function to add headers with page number
  function addHeader(page: any, title: string): number {
    pageNumber++;
    const headerY = pageHeight - 60;
    
    page.drawRectangle({
      x: 0,
      y: headerY,
      width: pageWidth,
      height: 60,
      color: colors.neutralLight,
    });
    
    page.drawText(stripEmojis(title), {
      x: margin,
      y: headerY + 25,
      size: 18,
      font: boldFont,
      color: colors.neutralDark,
    });
    
    page.drawText(`Page ${pageNumber}`, {
      x: pageWidth - 100,
      y: headerY + 25,
      size: 12,
      font: font,
      color: colors.neutralGray,
    });
    
    return headerY - 40;
  }

  // Helper function to add footer with methodology
  function addFooter(page: any) {
    const footerY = 30;
    
    page.drawLine({
      start: { x: margin, y: footerY + 20 },
      end: { x: pageWidth - margin, y: footerY + 20 },
      thickness: 0.5,
      color: colors.neutralGray,
    });
    
    const providers = dto.methodology?.providersIncluded?.join(', ') || 'OpenAI, Anthropic, Google, Perplexity';
    page.drawText(`Data sources: ${stripEmojis(providers)} | Generated: ${new Date().toISOString().split('T')[0]}`, {
      x: margin,
      y: footerY,
      size: 8,
      font: font,
      color: colors.neutralGray,
    });
  }

  // Helper function to draw branded card with delta indicator
  function drawBrandedCard(page: any, x: number, y: number, width: number, height: number, title: string, value: string, delta?: number, subtitle?: string) {
    page.drawRectangle({ x, y, width, height, color: colors.neutralLight });
    page.drawRectangle({ x, y, width: 4, height, color: colors.primaryBlue });
    
    page.drawText(stripEmojis(title), {
      x: x + 20,
      y: y + height - 30,
      size: 12,
      font: font,
      color: colors.neutralGray,
    });
    
    page.drawText(stripEmojis(value), {
      x: x + 20,
      y: y + height - 55,
      size: 24,
      font: boldFont,
      color: colors.neutralDark,
    });
    
    if (delta !== undefined && !isNaN(delta)) {
      const deltaColor = delta >= 0 ? colors.successGreen : colors.errorRed;
      const deltaText = delta >= 0 ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`;
      
      page.drawRectangle({
        x: x + width - 80,
        y: y + height - 35,
        width: 60,
        height: 20,
        color: deltaColor,
      });
      
      page.drawText(deltaText, {
        x: x + width - 70,
        y: y + height - 30,
        size: 10,
        font: font,
        color: colors.neutralLight,
      });
    }
    
    if (subtitle) {
      page.drawText(stripEmojis(subtitle), {
        x: x + 20,
        y: y + 15,
        size: 10,
        font: font,
        color: colors.neutralGray,
      });
    }
  }

  // Helper: Draw section box with accent
  function drawSectionBox(page: any, x: number, y: number, width: number, height: number, accentColor = colors.accentOrange) {
    page.drawRectangle({ x, y, width, height, color: colors.neutralLight });
    page.drawRectangle({ x, y, width: 4, height, color: accentColor });
  }

  // Format period text
  const periodText = stripEmojis(`${dto.header.periodStart} to ${dto.header.periodEnd}`);

  // ========== PAGE 1: COVER PAGE ==========
  const coverPage = pdfDoc.addPage([pageWidth, pageHeight]);
  pageNumber++;

  // Brand header bar
  coverPage.drawRectangle({
    x: 0,
    y: pageHeight - 100,
    width: pageWidth,
    height: 100,
    color: colors.primaryBlue,
  });

  // Logo placeholder (square)
  coverPage.drawRectangle({
    x: margin,
    y: pageHeight - 90,
    width: 70,
    height: 70,
    color: colors.neutralLight,
  });
  coverPage.drawText('LOGO', {
    x: margin + 15,
    y: pageHeight - 60,
    size: 14,
    font: boldFont,
    color: colors.primaryBlue,
  });

  // Main title
  coverPage.drawText('Weekly AI Brand Visibility Report', {
    x: 130,
    y: pageHeight - 45,
    size: 22,
    font: boldFont,
    color: colors.neutralLight,
  });

  // Organization name
  coverPage.drawText(truncateText(dto.header.orgName, 50), {
    x: 130,
    y: pageHeight - 70,
    size: 14,
    font: font,
    color: colors.neutralLight,
  });

  // Subscription tier badge
  const tierBadge = dto.header.subscriptionTier || 'Pro';
  coverPage.drawRectangle({
    x: pageWidth - 120,
    y: pageHeight - 80,
    width: 80,
    height: 24,
    color: colors.accentOrange,
  });
  coverPage.drawText(tierBadge.toUpperCase(), {
    x: pageWidth - 105,
    y: pageHeight - 73,
    size: 11,
    font: boldFont,
    color: colors.neutralLight,
  });

  // Period
  coverPage.drawText(`Report Period: ${periodText}`, {
    x: margin,
    y: pageHeight - 140,
    size: 14,
    font: font,
    color: colors.neutralDark,
  });

  // Report Version
  coverPage.drawText(`Generated: ${new Date().toISOString().split('T')[0]} | Version 2.0`, {
    x: margin,
    y: pageHeight - 160,
    size: 10,
    font: font,
    color: colors.neutralGray,
  });

  // Executive Summary Metrics (2x2 grid)
  const cardWidth = 240;
  const cardHeight = 100;
  const cardSpacing = 35;
  const startX = margin;
  const startY = pageHeight - 300;

  drawBrandedCard(
    coverPage, startX, startY, cardWidth, cardHeight,
    'Overall Brand Score',
    formatNumber(dto.kpis.overallScore),
    dto.kpis.scoreTrend,
    'Weekly average across all prompts'
  );

  drawBrandedCard(
    coverPage, startX + cardWidth + cardSpacing, startY, cardWidth, cardHeight,
    'Brand Presence Rate',
    formatPercent(dto.kpis.brandPresentRate),
    dto.kpis.deltaVsPriorWeek?.brandPresentRate,
    'Prompts where brand was mentioned'
  );

  drawBrandedCard(
    coverPage, startX, startY - cardHeight - 20, cardWidth, cardHeight,
    'Active Prompts Monitored',
    dto.prompts.totalActive.toString(),
    undefined,
    'Tracked across AI platforms'
  );

  drawBrandedCard(
    coverPage, startX + cardWidth + cardSpacing, startY - cardHeight - 20, cardWidth, cardHeight,
    'Total AI Responses',
    dto.kpis.totalRuns.toString(),
    dto.kpis.deltaVsPriorWeek?.totalRuns ? ((dto.kpis.deltaVsPriorWeek.totalRuns / dto.kpis.totalRuns) * 100) : undefined,
    'Analyzed this period'
  );

  // ========== EXECUTIVE SUMMARY SECTION ==========
  const summaryY = startY - 280;
  const summaryHeight = 200;
  
  drawSectionBox(coverPage, startX, summaryY, pageWidth - (margin * 2), summaryHeight, colors.primaryBlue);
  
  coverPage.drawText('Executive Summary', {
    x: startX + 20,
    y: summaryY + summaryHeight - 30,
    size: 16,
    font: boldFont,
    color: colors.neutralDark,
  });

  // Generate executive summary content
  const scoreTrend = dto.kpis.scoreTrend ?? 0;
  const presenceDelta = dto.kpis.deltaVsPriorWeek?.brandPresentRate ?? 0;
  
  // What Changed This Week
  let whatChanged = '';
  if (scoreTrend > 0) {
    whatChanged = `Visibility increased +${formatNumber(scoreTrend)} points this week`;
  } else if (scoreTrend < 0) {
    whatChanged = `Visibility decreased ${formatNumber(scoreTrend)} points this week`;
  } else {
    whatChanged = 'Visibility remained stable compared to last week';
  }
  
  if (presenceDelta !== 0) {
    whatChanged += `, brand presence ${presenceDelta > 0 ? 'up' : 'down'} ${formatPercent(Math.abs(presenceDelta))}`;
  }

  coverPage.drawText('What Changed:', {
    x: startX + 20,
    y: summaryY + summaryHeight - 60,
    size: 11,
    font: boldFont,
    color: colors.neutralDark,
  });
  
  coverPage.drawText(truncateText(whatChanged, 80), {
    x: startX + 20,
    y: summaryY + summaryHeight - 80,
    size: 10,
    font: font,
    color: colors.neutralDark,
  });

  // Why It Matters
  const topCompetitor = dto.competitors?.topCompetitors?.[0];
  let whyItMatters = 'Your AI discoverability affects how often users find your brand via AI assistants.';
  if (topCompetitor && topCompetitor.sharePercent > dto.kpis.brandPresentRate) {
    whyItMatters = `${safeText(topCompetitor.name, 'Top competitor')} leads share of voice at ${formatPercent(topCompetitor.sharePercent)}, limiting your visibility.`;
  }

  coverPage.drawText('Why It Matters:', {
    x: startX + 20,
    y: summaryY + summaryHeight - 105,
    size: 11,
    font: boldFont,
    color: colors.neutralDark,
  });
  
  coverPage.drawText(truncateText(whyItMatters, 80), {
    x: startX + 20,
    y: summaryY + summaryHeight - 125,
    size: 10,
    font: font,
    color: colors.neutralDark,
  });

  // What To Do Next
  const primaryAction = dto.insights?.recommendations?.[0] || 'Focus on content that directly answers AI-targeted queries';
  
  coverPage.drawText('What To Do Next:', {
    x: startX + 20,
    y: summaryY + summaryHeight - 150,
    size: 11,
    font: boldFont,
    color: colors.neutralDark,
  });
  
  coverPage.drawText(`1. ${truncateText(primaryAction, 75)}`, {
    x: startX + 20,
    y: summaryY + summaryHeight - 170,
    size: 10,
    font: font,
    color: colors.neutralDark,
  });

  if (dto.insights?.recommendations?.[1]) {
    coverPage.drawText(`2. ${truncateText(dto.insights.recommendations[1], 75)}`, {
      x: startX + 20,
      y: summaryY + summaryHeight - 185,
      size: 10,
      font: font,
      color: colors.neutralDark,
    });
  }

  addFooter(coverPage);

  // ========== PAGE 2: KPI DASHBOARD ==========
  const kpiPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let currentY = addHeader(kpiPage, 'Performance Dashboard');

  // Performance summary text
  currentY -= 30;
  kpiPage.drawText('Weekly Performance Summary', {
    x: margin,
    y: currentY,
    size: 16,
    font: boldFont,
    color: colors.neutralDark,
  });

  currentY -= 25;
  kpiPage.drawText(`Your brand was mentioned in ${formatPercent(dto.kpis.brandPresentRate)} of AI responses this week.`, {
    x: margin,
    y: currentY,
    size: 12,
    font: font,
    color: colors.neutralDark,
  });

  currentY -= 18;
  kpiPage.drawText(`Average visibility score: ${formatNumber(dto.kpis.overallScore)}/10`, {
    x: margin,
    y: currentY,
    size: 12,
    font: font,
    color: colors.neutralDark,
  });

  // Week-over-week trend visualization
  currentY -= 50;
  kpiPage.drawText('Week-over-Week Trend', {
    x: margin,
    y: currentY,
    size: 14,
    font: boldFont,
    color: colors.neutralDark,
  });

  currentY -= 30;
  const trendColor = scoreTrend >= 0 ? colors.successGreen : colors.errorRed;
  const trendText = scoreTrend >= 0 
    ? `Trending up: +${formatNumber(scoreTrend)} points improvement`
    : `Trending down: ${formatNumber(scoreTrend)} points decline`;

  kpiPage.drawText(trendText, {
    x: margin,
    y: currentY,
    size: 12,
    font: font,
    color: trendColor,
  });

  // Historical trend mini chart (bar representation)
  if (dto.historicalTrend?.weeklyScores?.length > 0) {
    currentY -= 50;
    kpiPage.drawText('Historical Visibility (Last 8 Weeks)', {
      x: margin,
      y: currentY,
      size: 14,
      font: boldFont,
      color: colors.neutralDark,
    });

    currentY -= 25;
    const maxScore = 10; // Max visibility score
    const barMaxHeight = 60;
    const barWidth = 50;
    const barSpacing = 10;

    dto.historicalTrend.weeklyScores.slice(-8).forEach((week, index) => {
      const barHeight = (week.avgScore / maxScore) * barMaxHeight;
      const barX = margin + (index * (barWidth + barSpacing));
      
      // Bar background
      kpiPage.drawRectangle({
        x: barX,
        y: currentY - barMaxHeight,
        width: barWidth,
        height: barMaxHeight,
        color: colors.neutralLight,
      });
      
      // Bar fill
      kpiPage.drawRectangle({
        x: barX,
        y: currentY - barMaxHeight,
        width: barWidth,
        height: barHeight,
        color: colors.primaryBlue,
      });
      
      // Week label
      kpiPage.drawText(week.weekStart.substring(5), {
        x: barX + 5,
        y: currentY - barMaxHeight - 15,
        size: 8,
        font: font,
        color: colors.neutralGray,
      });
      
      // Score label
      kpiPage.drawText(formatNumber(week.avgScore), {
        x: barX + 15,
        y: currentY - barMaxHeight + barHeight + 5,
        size: 8,
        font: font,
        color: colors.neutralDark,
      });
    });
    
    currentY -= barMaxHeight + 40;
  }

  // Provider performance breakdown
  currentY -= 30;
  if (dto.volume?.providersUsed?.length > 0) {
    kpiPage.drawText('Performance by AI Provider', {
      x: margin,
      y: currentY,
      size: 14,
      font: boldFont,
      color: colors.neutralDark,
    });

    currentY -= 25;
    const headers = ['Provider', 'Responses', 'Avg Score', 'Brand Mentions'];
    const colWidths = [120, 100, 100, 120];
    let headerX = margin;

    headers.forEach((header, i) => {
      kpiPage.drawText(header, {
        x: headerX,
        y: currentY,
        size: 10,
        font: boldFont,
        color: colors.neutralDark,
      });
      headerX += colWidths[i];
    });

    dto.volume.providersUsed.slice(0, 5).forEach((provider, index) => {
      currentY -= 20;
      let rowX = margin;

      if (index % 2 === 0) {
        kpiPage.drawRectangle({
          x: margin - 5,
          y: currentY - 5,
          width: 500,
          height: 18,
          color: colors.neutralLight,
        });
      }

      kpiPage.drawText(safeText(provider.provider), {
        x: rowX,
        y: currentY,
        size: 10,
        font: font,
        color: colors.neutralDark,
      });
      rowX += colWidths[0];

      kpiPage.drawText(String(provider.responseCount), {
        x: rowX,
        y: currentY,
        size: 10,
        font: font,
        color: colors.neutralDark,
      });
      rowX += colWidths[1];

      kpiPage.drawText(formatNumber(provider.avgScore), {
        x: rowX,
        y: currentY,
        size: 10,
        font: font,
        color: colors.neutralDark,
      });
      rowX += colWidths[2];

      kpiPage.drawText(String(provider.brandMentions), {
        x: rowX,
        y: currentY,
        size: 10,
        font: font,
        color: colors.neutralDark,
      });
    });
  }

  addFooter(kpiPage);

  // ========== PAGE 3: PROMPT PERFORMANCE ==========
  const promptsPage = pdfDoc.addPage([pageWidth, pageHeight]);
  currentY = addHeader(promptsPage, 'Prompt Performance Analysis');

  // Top Performers Table
  currentY -= 30;
  if (dto.prompts?.topPerformers?.length > 0) {
    promptsPage.drawText('Top Performing Prompts', {
      x: margin,
      y: currentY,
      size: 14,
      font: boldFont,
      color: colors.neutralDark,
    });

    currentY -= 25;
    const headers = ['Prompt', 'Score', 'Presence', 'Category'];
    const colWidths = [280, 60, 80, 80];
    let headerX = margin;

    headers.forEach((header, i) => {
      promptsPage.drawText(header, {
        x: headerX,
        y: currentY,
        size: 10,
        font: boldFont,
        color: colors.neutralDark,
      });
      headerX += colWidths[i];
    });

    dto.prompts.topPerformers.slice(0, 8).forEach((prompt, index) => {
      currentY -= 22;
      let rowX = margin;

      if (index % 2 === 0) {
        promptsPage.drawRectangle({
          x: margin - 5,
          y: currentY - 5,
          width: 500,
          height: 20,
          color: colors.neutralLight,
        });
      }

      promptsPage.drawText(truncateText(prompt.text || '', 50), {
        x: rowX,
        y: currentY,
        size: 9,
        font: font,
        color: colors.neutralDark,
      });
      rowX += colWidths[0];

      promptsPage.drawText(formatNumber(prompt.avgScore), {
        x: rowX,
        y: currentY,
        size: 9,
        font: font,
        color: colors.neutralDark,
      });
      rowX += colWidths[1];

      promptsPage.drawText(formatPercent(prompt.brandPresentRate), {
        x: rowX,
        y: currentY,
        size: 9,
        font: font,
        color: colors.neutralDark,
      });
      rowX += colWidths[2];

      promptsPage.drawText(safeText(prompt.category, 'General'), {
        x: rowX,
        y: currentY,
        size: 9,
        font: font,
        color: colors.neutralDark,
      });
    });
  }

  // High Opportunity Prompts (new V2 section)
  currentY -= 50;
  promptsPage.drawText('High Opportunity Prompts', {
    x: margin,
    y: currentY,
    size: 14,
    font: boldFont,
    color: colors.accentOrange,
  });

  currentY -= 18;
  promptsPage.drawText('Prompts with high activity but low brand presence - prioritize content creation', {
    x: margin,
    y: currentY,
    size: 10,
    font: font,
    color: colors.neutralGray,
  });

  // Find high opportunity prompts (high runs, low presence)
  const allPrompts = [
    ...(dto.prompts.categories?.crm || []),
    ...(dto.prompts.categories?.competitorTools || []),
    ...(dto.prompts.categories?.aiFeatures || []),
    ...(dto.prompts.categories?.other || []),
  ];
  
  const highOpportunity = allPrompts
    .filter(p => p.totalRuns >= 3 && p.brandPresentRate < 30)
    .sort((a, b) => a.brandPresentRate - b.brandPresentRate)
    .slice(0, 5);

  if (highOpportunity.length > 0) {
    currentY -= 20;
    highOpportunity.forEach((prompt, index) => {
      currentY -= 18;
      promptsPage.drawText(`${index + 1}. ${truncateText(prompt.text, 60)} - ${formatPercent(prompt.brandPresentRate)} presence`, {
        x: margin + 10,
        y: currentY,
        size: 9,
        font: font,
        color: colors.neutralDark,
      });
    });
  } else {
    currentY -= 20;
    promptsPage.drawText('No high-opportunity prompts identified this period', {
      x: margin + 10,
      y: currentY,
      size: 10,
      font: font,
      color: colors.neutralGray,
    });
  }

  // Zero Presence Prompts
  currentY -= 40;
  if (dto.prompts?.zeroPresence?.length > 0) {
    promptsPage.drawText('Zero Presence Prompts - Immediate Attention Needed', {
      x: margin,
      y: currentY,
      size: 14,
      font: boldFont,
      color: colors.errorRed,
    });

    currentY -= 20;
    dto.prompts.zeroPresence.slice(0, 5).forEach((prompt, index) => {
      currentY -= 18;
      promptsPage.drawText(`${index + 1}. ${truncateText(prompt.text, 70)}`, {
        x: margin + 10,
        y: currentY,
        size: 9,
        font: font,
        color: colors.neutralDark,
      });
    });
  }

  addFooter(promptsPage);

  // ========== PAGE 4: COMPETITIVE INTELLIGENCE ==========
  const competitorsPage = pdfDoc.addPage([pageWidth, pageHeight]);
  currentY = addHeader(competitorsPage, 'Competitive Intelligence');

  // New competitors alert
  if (dto.competitors?.newThisWeek?.length > 0) {
    drawSectionBox(competitorsPage, margin, currentY - 60, pageWidth - (margin * 2), 50, colors.warningYellow);
    
    competitorsPage.drawText(`${dto.competitors.newThisWeek.length} New Competitors Detected This Week`, {
      x: margin + 20,
      y: currentY - 35,
      size: 14,
      font: boldFont,
      color: colors.neutralDark,
    });

    // Fix: Properly extract competitor names from objects
    const newCompNames = dto.competitors.newThisWeek
      .slice(0, 5)
      .map(comp => safeText(comp.name || comp, 'Unknown'))
      .join(', ');
    
    competitorsPage.drawText(truncateText(newCompNames, 80), {
      x: margin + 20,
      y: currentY - 55,
      size: 10,
      font: font,
      color: colors.neutralDark,
    });

    currentY -= 80;
  }

  // Primary Threat Competitor (V2)
  if (dto.competitors?.topCompetitors?.[0]) {
    const primaryThreat = dto.competitors.topCompetitors[0];
    
    currentY -= 20;
    drawSectionBox(competitorsPage, margin, currentY - 80, (pageWidth - (margin * 2)) / 2 - 10, 80, colors.errorRed);
    
    competitorsPage.drawText('Primary Threat', {
      x: margin + 20,
      y: currentY - 25,
      size: 12,
      font: boldFont,
      color: colors.errorRed,
    });
    
    competitorsPage.drawText(safeText(primaryThreat.name, 'Unknown Competitor'), {
      x: margin + 20,
      y: currentY - 45,
      size: 14,
      font: boldFont,
      color: colors.neutralDark,
    });
    
    competitorsPage.drawText(`${formatPercent(primaryThreat.sharePercent)} share | ${primaryThreat.appearances} mentions`, {
      x: margin + 20,
      y: currentY - 65,
      size: 10,
      font: font,
      color: colors.neutralGray,
    });
  }

  // Emerging Competitor (new this week with highest share)
  const emergingComp = dto.competitors?.newThisWeek?.[0];
  if (emergingComp) {
    drawSectionBox(competitorsPage, margin + (pageWidth - (margin * 2)) / 2 + 10, currentY - 80, (pageWidth - (margin * 2)) / 2 - 10, 80, colors.warningYellow);
    
    competitorsPage.drawText('Emerging Competitor', {
      x: margin + (pageWidth - (margin * 2)) / 2 + 30,
      y: currentY - 25,
      size: 12,
      font: boldFont,
      color: colors.warningYellow,
    });
    
    competitorsPage.drawText(safeText(emergingComp.name, 'New Competitor'), {
      x: margin + (pageWidth - (margin * 2)) / 2 + 30,
      y: currentY - 45,
      size: 14,
      font: boldFont,
      color: colors.neutralDark,
    });
    
    competitorsPage.drawText(`${formatPercent(emergingComp.sharePercent)} share | New this week`, {
      x: margin + (pageWidth - (margin * 2)) / 2 + 30,
      y: currentY - 65,
      size: 10,
      font: font,
      color: colors.neutralGray,
    });
  }

  currentY -= 100;

  // Top 5 Competitors table
  currentY -= 30;
  competitorsPage.drawText('Top Competitors by AI Mention Share', {
    x: margin,
    y: currentY,
    size: 14,
    font: boldFont,
    color: colors.neutralDark,
  });

  if (dto.competitors?.topCompetitors?.length > 0) {
    currentY -= 25;
    const headers = ['Rank', 'Competitor', 'Share', 'Mentions', 'Trend'];
    const colWidths = [50, 180, 80, 80, 80];
    let headerX = margin;

    headers.forEach((header, i) => {
      competitorsPage.drawText(header, {
        x: headerX,
        y: currentY,
        size: 10,
        font: boldFont,
        color: colors.neutralDark,
      });
      headerX += colWidths[i];
    });

    dto.competitors.topCompetitors.slice(0, 8).forEach((comp, index) => {
      currentY -= 22;
      let rowX = margin;

      if (index % 2 === 0) {
        competitorsPage.drawRectangle({
          x: margin - 5,
          y: currentY - 5,
          width: 500,
          height: 20,
          color: colors.neutralLight,
        });
      }

      competitorsPage.drawText(`#${index + 1}`, {
        x: rowX,
        y: currentY,
        size: 10,
        font: font,
        color: colors.neutralDark,
      });
      rowX += colWidths[0];

      // Fix: Properly render competitor name
      competitorsPage.drawText(truncateText(safeText(comp.name, 'Unknown'), 30), {
        x: rowX,
        y: currentY,
        size: 10,
        font: font,
        color: colors.neutralDark,
      });
      rowX += colWidths[1];

      competitorsPage.drawText(formatPercent(comp.sharePercent), {
        x: rowX,
        y: currentY,
        size: 10,
        font: font,
        color: colors.neutralDark,
      });
      rowX += colWidths[2];

      competitorsPage.drawText(String(comp.appearances || 0), {
        x: rowX,
        y: currentY,
        size: 10,
        font: font,
        color: colors.neutralDark,
      });
      rowX += colWidths[3];

      // Trend indicator
      const trendLabel = comp.isNew ? 'NEW' : (comp.deltaVsPriorWeek && comp.deltaVsPriorWeek > 0 ? 'Rising' : 'Stable');
      const trendCol = comp.isNew ? colors.warningYellow : (comp.deltaVsPriorWeek && comp.deltaVsPriorWeek > 0 ? colors.errorRed : colors.neutralGray);
      
      competitorsPage.drawText(trendLabel, {
        x: rowX,
        y: currentY,
        size: 10,
        font: font,
        color: trendCol,
      });
    });
  }

  addFooter(competitorsPage);

  // ========== PAGE 5: CITATION ANALYTICS ==========
  if (dto.citations && dto.citations.totalCitations > 0) {
    const citationsPage = pdfDoc.addPage([pageWidth, pageHeight]);
    currentY = addHeader(citationsPage, 'Where AI Gets Its Information');

    // Citation summary cards
    currentY -= 30;
    const citationCardWidth = 150;
    const citationCardHeight = 80;

    drawBrandedCard(
      citationsPage, margin, currentY - citationCardHeight, citationCardWidth, citationCardHeight,
      'Total Citations', String(dto.citations.totalCitations), undefined, 'Sources referenced'
    );

    drawBrandedCard(
      citationsPage, margin + citationCardWidth + 20, currentY - citationCardHeight, citationCardWidth, citationCardHeight,
      'Validation Rate', formatPercent(dto.citations.validationRate), undefined, 'Verified sources'
    );

    drawBrandedCard(
      citationsPage, margin + (citationCardWidth + 20) * 2, currentY - citationCardHeight, citationCardWidth, citationCardHeight,
      'Unique Domains', String(dto.citations.topSources.length), undefined, 'Distinct sources'
    );

    currentY -= citationCardHeight + 50;

    // Top Citation Sources with bar visualization
    if (dto.citations.topSources.length > 0) {
      citationsPage.drawText('Top Citation Sources', {
        x: margin,
        y: currentY,
        size: 14,
        font: boldFont,
        color: colors.neutralDark,
      });

      currentY -= 25;
      const maxMentions = Math.max(...dto.citations.topSources.map(s => s.mentions));
      const barMaxWidth = 280;

      dto.citations.topSources.slice(0, 8).forEach((source, index) => {
        const barWidth = maxMentions > 0 ? (source.mentions / maxMentions) * barMaxWidth : 0;
        
        // Domain name
        citationsPage.drawText(truncateText(safeText(source.domain), 25), {
          x: margin,
          y: currentY,
          size: 10,
          font: font,
          color: colors.neutralDark,
        });

        // Bar background
        citationsPage.drawRectangle({
          x: 180,
          y: currentY - 3,
          width: barMaxWidth,
          height: 14,
          color: colors.neutralLight,
        });

        // Bar fill
        citationsPage.drawRectangle({
          x: 180,
          y: currentY - 3,
          width: barWidth,
          height: 14,
          color: colors.primaryBlue,
        });

        // Count
        citationsPage.drawText(String(source.mentions), {
          x: 470,
          y: currentY,
          size: 10,
          font: font,
          color: colors.neutralGray,
        });

        currentY -= 22;
      });
    }

    // Insight about brand presence in sources
    currentY -= 30;
    drawSectionBox(citationsPage, margin, currentY - 60, pageWidth - (margin * 2), 60, colors.accentOrange);
    
    citationsPage.drawText('Citation Insight', {
      x: margin + 20,
      y: currentY - 25,
      size: 12,
      font: boldFont,
      color: colors.neutralDark,
    });

    const citationInsight = dto.citations.sourceInsight || 
      `AI models cite ${dto.citations.topSources.length} unique domains. Ensure your brand is present in these authoritative sources.`;
    
    citationsPage.drawText(truncateText(citationInsight, 90), {
      x: margin + 20,
      y: currentY - 45,
      size: 10,
      font: font,
      color: colors.neutralDark,
    });

    addFooter(citationsPage);
  }

  // ========== PAGE 6: STRATEGIC RECOMMENDATIONS ==========
  const recoPage = pdfDoc.addPage([pageWidth, pageHeight]);
  currentY = addHeader(recoPage, 'Strategic Recommendations');

  // Key Findings
  currentY -= 30;
  recoPage.drawText('Key Findings', {
    x: margin,
    y: currentY,
    size: 16,
    font: boldFont,
    color: colors.neutralDark,
  });

  const findings = dto.insights?.keyFindings || ['No specific findings available'];
  findings.slice(0, 4).forEach((finding, index) => {
    currentY -= 22;
    recoPage.drawText(`${index + 1}. ${truncateText(safeText(finding), 80)}`, {
      x: margin + 10,
      y: currentY,
      size: 11,
      font: font,
      color: colors.neutralDark,
    });
  });

  // Action Items with references
  currentY -= 50;
  recoPage.drawText('Prioritized Action Items', {
    x: margin,
    y: currentY,
    size: 16,
    font: boldFont,
    color: colors.primaryBlue,
  });

  const actionItems = dto.insights?.recommendations || ['Focus on content addressing zero-visibility prompts'];
  
  actionItems.slice(0, 5).forEach((rec, index) => {
    currentY -= 25;
    
    // Priority badge
    const priority = index < 2 ? 'HIGH' : 'MEDIUM';
    const priorityColor = index < 2 ? colors.errorRed : colors.accentOrange;
    
    recoPage.drawRectangle({
      x: margin,
      y: currentY - 3,
      width: 45,
      height: 16,
      color: priorityColor,
    });
    
    recoPage.drawText(priority, {
      x: margin + 5,
      y: currentY,
      size: 8,
      font: boldFont,
      color: colors.neutralLight,
    });

    recoPage.drawText(truncateText(safeText(rec), 70), {
      x: margin + 55,
      y: currentY,
      size: 11,
      font: font,
      color: colors.neutralDark,
    });
  });

  // Content recommendations based on data
  currentY -= 50;
  recoPage.drawText('Content Strategy Recommendations', {
    x: margin,
    y: currentY,
    size: 14,
    font: boldFont,
    color: colors.neutralDark,
  });

  currentY -= 25;
  
  // Generate context-aware recommendations
  if (dto.prompts?.zeroPresence?.length > 0) {
    recoPage.drawText(`• Create content targeting: "${truncateText(dto.prompts.zeroPresence[0].text, 50)}"`, {
      x: margin + 10,
      y: currentY,
      size: 10,
      font: font,
      color: colors.neutralDark,
    });
    currentY -= 18;
  }

  if (dto.competitors?.topCompetitors?.[0]) {
    const topComp = dto.competitors.topCompetitors[0];
    recoPage.drawText(`• Create comparison content: "Your Brand vs ${safeText(topComp.name)}"`, {
      x: margin + 10,
      y: currentY,
      size: 10,
      font: font,
      color: colors.neutralDark,
    });
    currentY -= 18;
  }

  if (dto.citations?.topSources?.[0]) {
    recoPage.drawText(`• Pursue citations from: ${safeText(dto.citations.topSources[0].domain)}`, {
      x: margin + 10,
      y: currentY,
      size: 10,
      font: font,
      color: colors.neutralDark,
    });
  }

  addFooter(recoPage);

  // ========== PAGE 7: METHODOLOGY & TRUST SIGNALS ==========
  const methodPage = pdfDoc.addPage([pageWidth, pageHeight]);
  currentY = addHeader(methodPage, 'Methodology & Data Quality');

  currentY -= 30;
  methodPage.drawText('How This Report Was Generated', {
    x: margin,
    y: currentY,
    size: 14,
    font: boldFont,
    color: colors.neutralDark,
  });

  currentY -= 25;
  methodPage.drawText('Data Collection Method:', {
    x: margin,
    y: currentY,
    size: 11,
    font: boldFont,
    color: colors.neutralDark,
  });
  
  currentY -= 18;
  methodPage.drawText('We query major AI platforms with your tracked prompts and analyze responses for brand mentions,', {
    x: margin,
    y: currentY,
    size: 10,
    font: font,
    color: colors.neutralDark,
  });
  
  currentY -= 15;
  methodPage.drawText('competitor presence, and citation sources. Each response is scored for brand visibility.', {
    x: margin,
    y: currentY,
    size: 10,
    font: font,
    color: colors.neutralDark,
  });

  currentY -= 35;
  methodPage.drawText('AI Providers Analyzed:', {
    x: margin,
    y: currentY,
    size: 11,
    font: boldFont,
    color: colors.neutralDark,
  });

  currentY -= 18;
  const providers = dto.volume?.providersUsed?.map(p => safeText(p.provider)).join(', ') || 'OpenAI, Anthropic, Google, Perplexity';
  methodPage.drawText(providers, {
    x: margin,
    y: currentY,
    size: 10,
    font: font,
    color: colors.neutralDark,
  });

  currentY -= 35;
  methodPage.drawText('Data Summary:', {
    x: margin,
    y: currentY,
    size: 11,
    font: boldFont,
    color: colors.neutralDark,
  });

  currentY -= 18;
  methodPage.drawText(`• ${dto.prompts.totalActive} prompts monitored`, {
    x: margin + 10,
    y: currentY,
    size: 10,
    font: font,
    color: colors.neutralDark,
  });
  
  currentY -= 15;
  methodPage.drawText(`• ${dto.kpis.totalRuns} AI responses analyzed`, {
    x: margin + 10,
    y: currentY,
    size: 10,
    font: font,
    color: colors.neutralDark,
  });
  
  currentY -= 15;
  methodPage.drawText(`• ${dto.competitors?.totalDetected || 0} competitors detected`, {
    x: margin + 10,
    y: currentY,
    size: 10,
    font: font,
    color: colors.neutralDark,
  });

  // Disclaimer
  currentY -= 50;
  drawSectionBox(methodPage, margin, currentY - 80, pageWidth - (margin * 2), 80, colors.neutralGray);
  
  methodPage.drawText('Important Disclaimer', {
    x: margin + 20,
    y: currentY - 25,
    size: 11,
    font: boldFont,
    color: colors.neutralDark,
  });

  methodPage.drawText('AI responses can vary between queries and over time. This report represents a snapshot of AI behavior', {
    x: margin + 20,
    y: currentY - 45,
    size: 9,
    font: font,
    color: colors.neutralGray,
  });
  
  methodPage.drawText('during the reporting period. Results should be used as directional guidance, not absolute metrics.', {
    x: margin + 20,
    y: currentY - 60,
    size: 9,
    font: font,
    color: colors.neutralGray,
  });

  addFooter(methodPage);

  return await pdfDoc.save();
}
