import { jsPDF } from 'jspdf';
import { GroundingSource } from '../types/edge';

function sanitizeForPdf(text: string): string {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/[^\x20-\x7E\n\t\u00A0-\u024F\u2010-\u2027\u20AC\u00B0\u00B1\u00D7\u00F7]/g, ' ')
    .trim();
}

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function printHtmlDocument(title: string, bodyHtml: string): void {
  if (typeof document === 'undefined') return;
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    iframe.remove();
    return;
  }

  doc.open();
  doc.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { margin: 18mm; }
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color: #0f172a; line-height: 1.55; font-size: 13px; margin: 0; }
    .header { border-bottom: 2px solid #0284c7; padding-bottom: 10px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: flex-end; }
    .brand { font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
    .meta { font-size: 11px; color: #475569; }
    h1 { font-size: 21px; margin: 0 0 6px; color: #0f172a; }
    h2 { font-size: 15px; margin: 18px 0 6px; color: #0369a1; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    p { margin: 6px 0; white-space: pre-wrap; }
    .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 14px 0; }
    .card { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; background: #f8fafc; }
    .card-label { font-size: 11px; color: #64748b; }
    .card-val { font-size: 17px; font-weight: 700; color: #0284c7; margin: 2px 0; }
    .card-trend { font-size: 11px; color: #059669; }
    ul { margin: 6px 0 12px 18px; padding: 0; }
    li { margin-bottom: 4px; }
    .footer { margin-top: 28px; padding-top: 8px; border-top: 1px solid #cbd5e1; font-size: 11px; color: #64748b; display: flex; justify-content: space-between; }
    pre { background: #f1f5f9; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px; white-space: pre-wrap; font-family: monospace; font-size: 11.5px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">ASSF Intelligence</div>
      <div class="meta">Created by Fahadsha &amp; ASSF Technology · Powered by Gemini Argon</div>
    </div>
    <div class="meta">${escapeHtml(new Date().toLocaleString())}</div>
  </div>
  ${bodyHtml}
  <div class="footer">
    <span>ASSF Export Document</span>
    <span>Created by Fahadsha &amp; ASSF Technology</span>
  </div>
</body>
</html>`);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      setTimeout(() => iframe.remove(), 1500);
    }
  }, 150);
}

function addPdfHeaderAndFooter(doc: jsPDF, subtitle: string) {
  const pageCount = doc.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageW, 18, 'F');
    doc.setTextColor(34, 211, 238);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('ASSF INTELLIGENCE', 14, 11.5);

    doc.setTextColor(226, 232, 240);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(sanitizeForPdf(subtitle).slice(0, 68), pageW - 14, 11.5, { align: 'right' });

    doc.setDrawColor(203, 213, 225);
    doc.line(14, pageH - 14, pageW - 14, pageH - 14);
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.text('Created by Fahadsha & ASSF Technology · Powered by Gemini Argon', 14, pageH - 8.5);
    doc.text(`Page ${i} of ${pageCount}`, pageW - 14, pageH - 8.5, { align: 'right' });
  }
}

export function downloadAnswerPdf(opts: {
  question?: string;
  answer: string;
  subAiName?: string;
  chipName?: string;
  sources?: GroundingSource[];
}): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const maxW = pageW - marginX * 2;
  let y = 27;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - 20) {
      doc.addPage();
      y = 26;
    }
  };

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('ASSF AI Answer Sheet', marginX, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(
    sanitizeForPdf(
      `Sub-AI: ${opts.subAiName || 'ASSF-Core'}  |  Silicon: ${opts.chipName || 'Edge SoC'}  |  ${new Date().toLocaleString()}`
    ),
    marginX,
    y
  );
  y += 8;

  if (opts.question && opts.question.trim()) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(3, 105, 161);
    doc.text('Prompt', marginX, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    const qLines = doc.splitTextToSize(sanitizeForPdf(opts.question), maxW) as string[];
    for (const line of qLines) {
      ensureSpace(6);
      doc.text(line, marginX, y);
      y += 5;
    }
    y += 4;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(3, 105, 161);
  ensureSpace(10);
  doc.text('Answer', marginX, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  const ansLines = doc.splitTextToSize(sanitizeForPdf(opts.answer), maxW) as string[];
  for (const line of ansLines) {
    ensureSpace(6);
    doc.text(line, marginX, y);
    y += 5.4;
  }

  if (opts.sources && opts.sources.length > 0) {
    y += 5;
    ensureSpace(12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(3, 105, 161);
    doc.text('Verified Web Sources', marginX, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    for (const src of opts.sources) {
      const sLines = doc.splitTextToSize(`• ${sanitizeForPdf(src.title)} — ${src.uri}`, maxW) as string[];
      for (const l of sLines) {
        ensureSpace(5);
        doc.text(l, marginX, y);
        y += 4.5;
      }
    }
  }

  addPdfHeaderAndFooter(doc, `Answer · ${opts.subAiName || 'ASSF'}`);
  doc.save(`assf-answer-${Date.now()}.pdf`);
}

export function printAnswerHtml(opts: {
  question?: string;
  answer: string;
  subAiName?: string;
  chipName?: string;
  sources?: GroundingSource[];
}) {
  const html = `
    <h1>ASSF AI Answer Sheet</h1>
    <div class="meta">Sub-AI: ${escapeHtml(opts.subAiName || 'ASSF-Core')} · Target Silicon: ${escapeHtml(opts.chipName || 'Edge SoC')}</div>
    ${opts.question ? `<h2>Prompt</h2><p>${escapeHtml(opts.question)}</p>` : ''}
    <h2>Answer</h2>
    <p>${escapeHtml(opts.answer)}</p>
    ${
      opts.sources && opts.sources.length > 0
        ? `<h2>Verified Sources</h2><ul>${opts.sources
            .map((s) => `<li><strong>${escapeHtml(s.title)}</strong>: ${escapeHtml(s.uri)}</li>`)
            .join('')}</ul>`
        : ''
    }
  `;
  printHtmlDocument('ASSF AI Answer', html);
}

export function downloadReportPdf(
  report: {
    title: string;
    subtitle: string;
    executiveSummary: string;
    keyMetrics: { label: string; value: string; trend: string }[];
    sections: { heading: string; analysis: string; points: string[] }[];
    recommendations: string[];
  },
  sources?: GroundingSource[]
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const maxW = pageW - marginX * 2;
  let y = 27;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - 20) {
      doc.addPage();
      y = 26;
    }
  };

  // Report Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  const titleLines = doc.splitTextToSize(sanitizeForPdf(report.title), maxW) as string[];
  for (const l of titleLines) {
    ensureSpace(8);
    doc.text(l, marginX, y);
    y += 7;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  const subLines = doc.splitTextToSize(sanitizeForPdf(report.subtitle), maxW) as string[];
  for (const l of subLines) {
    ensureSpace(5);
    doc.text(l, marginX, y);
    y += 5;
  }
  y += 4;

  // Executive Summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(3, 105, 161);
  ensureSpace(10);
  doc.text('Executive Summary', marginX, y);
  y += 5.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  const sumLines = doc.splitTextToSize(sanitizeForPdf(report.executiveSummary), maxW) as string[];
  for (const l of sumLines) {
    ensureSpace(6);
    doc.text(l, marginX, y);
    y += 5.2;
  }
  y += 4;

  // Key Metrics
  if (report.keyMetrics?.length) {
    ensureSpace(22);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(3, 105, 161);
    doc.text('Key Metrics', marginX, y);
    y += 6;

    for (const m of report.keyMetrics) {
      ensureSpace(7);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(`• ${sanitizeForPdf(m.label)}: ${sanitizeForPdf(m.value)}`, marginX + 2, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(5, 150, 105);
      doc.text(`(${sanitizeForPdf(m.trend)})`, pageW - marginX, y, { align: 'right' });
      y += 6;
    }
    y += 3;
  }

  // Analytical Sections
  for (const sec of report.sections || []) {
    ensureSpace(14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(3, 105, 161);
    doc.text(sanitizeForPdf(sec.heading), marginX, y);
    y += 5.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    const aLines = doc.splitTextToSize(sanitizeForPdf(sec.analysis), maxW) as string[];
    for (const l of aLines) {
      ensureSpace(6);
      doc.text(l, marginX, y);
      y += 5;
    }
    y += 2;

    for (const pt of sec.points || []) {
      const pLines = doc.splitTextToSize(`- ${sanitizeForPdf(pt)}`, maxW - 4) as string[];
      for (const l of pLines) {
        ensureSpace(5.5);
        doc.text(l, marginX + 3, y);
        y += 4.8;
      }
    }
    y += 4;
  }

  // Recommendations
  if (report.recommendations?.length) {
    ensureSpace(14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(5, 150, 105);
    doc.text('Strategic Recommendations', marginX, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    report.recommendations.forEach((rec, i) => {
      const rLines = doc.splitTextToSize(`${i + 1}. ${sanitizeForPdf(rec)}`, maxW) as string[];
      for (const l of rLines) {
        ensureSpace(6);
        doc.text(l, marginX, y);
        y += 5;
      }
    });
  }

  if (sources && sources.length > 0) {
    y += 5;
    ensureSpace(12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(3, 105, 161);
    doc.text('Verified Sources', marginX, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    for (const s of sources) {
      const sLines = doc.splitTextToSize(`• ${sanitizeForPdf(s.title)} — ${s.uri}`, maxW) as string[];
      for (const l of sLines) {
        ensureSpace(5);
        doc.text(l, marginX, y);
        y += 4.5;
      }
    }
  }

  addPdfHeaderAndFooter(doc, 'Executive Report');
  doc.save(`assf-report-${Date.now()}.pdf`);
}

export function printReportHtml(report: {
  title: string;
  subtitle: string;
  executiveSummary: string;
  keyMetrics: { label: string; value: string; trend: string }[];
  sections: { heading: string; analysis: string; points: string[] }[];
  recommendations: string[];
}): void {
  const html = `
    <h1>${escapeHtml(report.title)}</h1>
    <div class="meta">${escapeHtml(report.subtitle)}</div>
    <h2>Executive Summary</h2>
    <p>${escapeHtml(report.executiveSummary)}</p>
    <div class="metrics">
      ${(report.keyMetrics || [])
        .map(
          (m) => `<div class="card">
            <div class="card-label">${escapeHtml(m.label)}</div>
            <div class="card-val">${escapeHtml(m.value)}</div>
            <div class="card-trend">${escapeHtml(m.trend)}</div>
          </div>`
        )
        .join('')}
    </div>
    ${(report.sections || [])
      .map(
        (s) => `<h2>${escapeHtml(s.heading)}</h2>
        <p>${escapeHtml(s.analysis)}</p>
        <ul>${(s.points || []).map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ul>`
      )
      .join('')}
    <h2>Strategic Recommendations</h2>
    <ul>${(report.recommendations || []).map((r) => `<li>${escapeHtml(r)}</li>`).join('')}</ul>
  `;
  printHtmlDocument(report.title, html);
}

export function downloadAnalyticsPdf(opts: {
  kpis: {
    totalRev: number;
    netProfit: number;
    grossMargin: number;
    aov: number;
    roas: number;
    growthPct: number;
    totalOrders: number;
  };
  insight: {
    headline: string;
    executiveSummary: string;
    risks: string[];
    opportunities: string[];
    actionPlan: { action: string; expectedImpact: string; priority: string }[];
  };
}): void {
  const { kpis, insight } = opts;
  downloadReportPdf({
    title: 'ASSF Business Intelligence & Financial Analytics Report',
    subtitle: `Period Growth: +${kpis.growthPct.toFixed(1)}% · Total Orders: ${kpis.totalOrders.toLocaleString()}`,
    executiveSummary: `${insight.headline} ${insight.executiveSummary}`,
    keyMetrics: [
      { label: 'Total Revenue', value: `$${kpis.totalRev.toLocaleString()}`, trend: `+${kpis.growthPct.toFixed(1)}%` },
      { label: 'Net Profit', value: `$${kpis.netProfit.toLocaleString()}`, trend: `${kpis.grossMargin.toFixed(1)}% Gross Margin` },
      { label: 'Blended ROAS / AOV', value: `${kpis.roas.toFixed(2)}x ROAS`, trend: `$${kpis.aov.toFixed(2)} AOV` },
    ],
    sections: [
      {
        heading: 'Growth Opportunities',
        analysis: 'High-leverage initiatives identified from unit economics and channel performance.',
        points: insight.opportunities || [],
      },
      {
        heading: 'Key Risks to Monitor',
        analysis: 'Cost and margin thresholds requiring active operational oversight.',
        points: insight.risks || [],
      },
    ],
    recommendations: (insight.actionPlan || []).map(
      (a) => `[${a.priority}] ${a.action} — Expected Impact: ${a.expectedImpact}`
    ),
  });
}
