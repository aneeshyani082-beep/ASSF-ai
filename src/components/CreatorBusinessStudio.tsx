import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { sound } from '../services/soundEffects';
import { BuiltAppPreview, BuiltVideoProject, GroundingSource, VideoScene, VideoVisualStyle } from '../types/edge';
import { buildOfflineAdaptiveApp, buildOfflineStorefrontHtml } from '../services/appBuilderFallback';
import {
  buildOfflineVideoProject,
  renderProjectToWebmBlob,
  renderVideoSceneFrame,
} from '../services/videoStudioEngine';
import {
  downloadReportPdf,
  printReportHtml,
  downloadAnalyticsPdf,
} from '../services/pdfExport';
import {
  Image as ImageIcon,
  FileText,
  Film,
  BarChart3,
  Globe,
  Sparkles,
  Download,
  Play,
  Pause,
  Monitor,
  Smartphone,
  Code2,
  Eye,
  Volume2,
  VolumeX,
  Video,
  CheckCircle2,
  RefreshCw,
  ShoppingBag,
  ExternalLink,
  Copy,
  Check,
  TrendingUp,
  Printer,
  FileDown,
  Wand2,
} from 'lucide-react';

export type StudioTab = 'poster' | 'report' | 'video' | 'analytics' | 'builder';

interface CreatorBusinessStudioProps {
  isAirGapped: boolean;
  onLogActivity?: (summary: string, category: 'chat' | 'gadget' | 'family' | 'engineering') => void;
  incomingApp?: BuiltAppPreview | null;
  onClearIncomingApp?: () => void;
  incomingVideo?: BuiltVideoProject | null;
  onClearIncomingVideo?: () => void;
  incomingStudioTask?: { tab: StudioTab; prompt: string } | null;
  onClearIncomingTask?: () => void;
}

type PosterThemeKey = 'cyan' | 'indigo' | 'emerald' | 'sunset' | 'ivory';

const POSTER_THEMES: Record<
  PosterThemeKey,
  { label: string; bg1: string; bg2: string; accent: string; text: string; muted: string; badgeBg: string; badgeText: string }
> = {
  cyan: {
    label: 'Cyber Silicon',
    bg1: '#020617',
    bg2: '#083344',
    accent: '#22d3ee',
    text: '#f8fafc',
    muted: '#94a3b8',
    badgeBg: '#22d3ee',
    badgeText: '#020617',
  },
  indigo: {
    label: 'Enterprise Slate',
    bg1: '#0f172a',
    bg2: '#1e1b4b',
    accent: '#818cf8',
    text: '#f8fafc',
    muted: '#cbd5e1',
    badgeBg: '#818cf8',
    badgeText: '#0f172a',
  },
  emerald: {
    label: 'Clean Tech',
    bg1: '#022c22',
    bg2: '#064e3b',
    accent: '#34d399',
    text: '#ecfdf5',
    muted: '#a7f3d0',
    badgeBg: '#34d399',
    badgeText: '#022c22',
  },
  sunset: {
    label: 'Commerce Drop',
    bg1: '#18181b',
    bg2: '#451a03',
    accent: '#fb923c',
    text: '#fff7ed',
    muted: '#fed7aa',
    badgeBg: '#fb923c',
    badgeText: '#18181b',
  },
  ivory: {
    label: 'Minimal Editorial',
    bg1: '#fafaf9',
    bg2: '#e7e5e4',
    accent: '#0f172a',
    text: '#0c0a09',
    muted: '#57534e',
    badgeBg: '#0f172a',
    badgeText: '#fafaf9',
  },
};

interface ReportData {
  title: string;
  subtitle: string;
  executiveSummary: string;
  keyMetrics: { label: string; value: string; trend: string }[];
  sections: { heading: string; analysis: string; points: string[] }[];
  recommendations: string[];
}

interface AnalyticsRow {
  month: string;
  revenue: number;
  cost: number;
  orders: number;
  adSpend: number;
}

interface AnalyticsInsight {
  headline: string;
  executiveSummary: string;
  risks: string[];
  opportunities: string[];
  actionPlan: { action: string; expectedImpact: string; priority: string }[];
}

const SAMPLE_DATASETS: Record<string, { label: string; csv: string }> = {
  ecommerce: {
    label: 'E-Commerce Product Store (6 Months)',
    csv: `Month,Revenue,Cost,Orders,AdSpend
Jun,42000,23500,610,6500
Jul,48500,26100,705,7200
Aug,53200,28000,760,7800
Sep,61000,31200,880,8400
Oct,72400,36800,1040,9500
Nov,89500,44100,1290,11200`,
  },
  saas: {
    label: 'B2B SaaS Subscription Revenue',
    csv: `Month,Revenue,Cost,Orders,AdSpend
Jun,28000,7200,190,4800
Jul,33500,7800,228,5100
Aug,39800,8400,270,5600
Sep,46200,9100,315,6100
Oct,54900,10200,372,6800
Nov,64500,11400,438,7400`,
  },
  hardware: {
    label: 'Smart IoT Hardware Devices',
    csv: `Month,Revenue,Cost,Orders,AdSpend
Jun,55000,34000,420,5200
Jul,59000,35800,450,5500
Aug,67500,40200,518,6200
Sep,74200,43900,570,6600
Oct,86000,49500,665,7500
Nov,98400,55200,760,8300`,
  },
};

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const words = text.split(/\s+/);
  let line = '';
  let currY = y;
  for (let i = 0; i < words.length; i++) {
    const testLine = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, currY);
      line = words[i];
      currY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) {
    ctx.fillText(line, x, currY);
    currY += lineHeight;
  }
  return currY;
}

export const CreatorBusinessStudio: React.FC<CreatorBusinessStudioProps> = ({
  isAirGapped,
  onLogActivity,
  incomingApp,
  onClearIncomingApp,
  incomingVideo,
  onClearIncomingVideo,
  incomingStudioTask,
  onClearIncomingTask,
}) => {
  const [studioTab, setStudioTab] = useState<StudioTab>('poster');

  // ==================== 1. POSTER STUDIO STATE ====================
  const [posterPrompt, setPosterPrompt] = useState(
    'Product launch poster for Nova Smart Home Hub with 25% early-bird launch discount'
  );
  const [posterBrand, setPosterBrand] = useState('ASSF Enterprise');
  const [posterHeadline, setPosterHeadline] = useState('Smart Living Reimagined');
  const [posterSubheadline, setPosterSubheadline] = useState(
    'Next-gen voice automation, zero-latency sensors, and real-time energy optimization.'
  );
  const [posterBadge, setPosterBadge] = useState('LAUNCH OFFER · 25% OFF');
  const [posterCta, setPosterCta] = useState('Order Online Today');
  const [posterFooter, setPosterFooter] = useState('assf-tech.com · Worldwide Shipping Available');
  const [posterTheme, setPosterTheme] = useState<PosterThemeKey>('cyan');
  const [posterAspect, setPosterAspect] = useState<'portrait' | 'square' | 'landscape'>('portrait');
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);
  const posterCanvasRef = useRef<HTMLCanvasElement>(null);

  const renderPosterCanvas = useCallback(() => {
    const canvas = posterCanvasRef.current;
    if (!canvas) return;
    const dims =
      posterAspect === 'portrait'
        ? { w: 960, h: 1200 }
        : posterAspect === 'square'
        ? { w: 1080, h: 1080 }
        : { w: 1280, h: 720 };
    canvas.width = dims.w;
    canvas.height = dims.h;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const theme = POSTER_THEMES[posterTheme];
    const grad = ctx.createLinearGradient(0, 0, dims.w, dims.h);
    grad.addColorStop(0, theme.bg1);
    grad.addColorStop(1, theme.bg2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, dims.w, dims.h);

    // Subtle geometric engineering grid
    ctx.strokeStyle = posterTheme === 'ivory' ? 'rgba(15,23,42,0.06)' : 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= dims.w; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, dims.h);
      ctx.stroke();
    }
    for (let y = 0; y <= dims.h; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(dims.w, y);
      ctx.stroke();
    }

    // Accent halo
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = theme.accent;
    ctx.beginPath();
    ctx.arc(dims.w * 0.82, dims.h * 0.22, dims.w * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Outer frame border
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(36, 36, dims.w - 72, dims.h - 72);

    const padX = 84;
    let cursorY = 110;

    // Brand name
    ctx.fillStyle = theme.accent;
    ctx.font = '700 26px system-ui, -apple-system, sans-serif';
    ctx.fillText(posterBrand.toUpperCase(), padX, cursorY);

    // Badge
    cursorY += 58;
    ctx.font = '700 22px system-ui, -apple-system, sans-serif';
    const badgeW = Math.min(dims.w - padX * 2, ctx.measureText(posterBadge).width + 44);
    ctx.fillStyle = theme.badgeBg;
    ctx.beginPath();
    ctx.roundRect(padX, cursorY - 30, badgeW, 44, 8);
    ctx.fill();
    ctx.fillStyle = theme.badgeText;
    ctx.fillText(posterBadge, padX + 22, cursorY);

    // Main Headline
    cursorY += posterAspect === 'landscape' ? 92 : 120;
    ctx.fillStyle = theme.text;
    const headFontSize = posterAspect === 'landscape' ? 64 : 74;
    ctx.font = `800 ${headFontSize}px system-ui, -apple-system, sans-serif`;
    cursorY = wrapCanvasText(ctx, posterHeadline, padX, cursorY, dims.w - padX * 2, headFontSize * 1.15);

    // Divider line
    cursorY += 16;
    ctx.fillStyle = theme.accent;
    ctx.fillRect(padX, cursorY, 120, 6);
    cursorY += 54;

    // Subheadline
    ctx.fillStyle = theme.muted;
    ctx.font = '500 32px system-ui, -apple-system, sans-serif';
    wrapCanvasText(ctx, posterSubheadline, padX, cursorY, dims.w - padX * 2, 46);

    // CTA Bar near bottom
    const ctaY = dims.h - 190;
    ctx.font = '800 30px system-ui, -apple-system, sans-serif';
    const ctaWidth = Math.min(dims.w - padX * 2, ctx.measureText(posterCta).width + 72);
    ctx.fillStyle = theme.accent;
    ctx.beginPath();
    ctx.roundRect(padX, ctaY, ctaWidth, 68, 12);
    ctx.fill();
    ctx.fillStyle = posterTheme === 'ivory' ? '#ffffff' : '#020617';
    ctx.fillText(posterCta, padX + 36, ctaY + 44);

    // Footer Note
    ctx.fillStyle = theme.muted;
    ctx.font = '500 22px monospace';
    ctx.fillText(posterFooter, padX, dims.h - 74);
  }, [posterBrand, posterHeadline, posterSubheadline, posterBadge, posterCta, posterFooter, posterTheme, posterAspect]);

  useEffect(() => {
    if (studioTab === 'poster') {
      renderPosterCanvas();
    }
  }, [studioTab, renderPosterCanvas]);

  const handleGenerateAiPoster = async () => {
    if (!posterPrompt.trim() || isGeneratingPoster) return;
    setIsGeneratingPoster(true);
    sound.playFlashTick();
    try {
      if (!isAirGapped) {
        const res = await fetch('/api/assf/studio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'poster', prompt: posterPrompt }),
        });
        if (res.ok) {
          const json = await res.json();
          const d = json.data || {};
          if (d.brand) setPosterBrand(d.brand);
          if (d.headline) setPosterHeadline(d.headline);
          if (d.subheadline) setPosterSubheadline(d.subheadline);
          if (d.badge) setPosterBadge(d.badge);
          if (d.cta) setPosterCta(d.cta);
          if (d.footerNote) setPosterFooter(d.footerNote);
          if (d.theme && POSTER_THEMES[d.theme as PosterThemeKey]) {
            setPosterTheme(d.theme as PosterThemeKey);
          }
          sound.playOtaSuccess();
          onLogActivity?.(`Designed poster: "${d.headline || posterPrompt.slice(0, 40)}"`, 'engineering');
          return;
        }
      }
      setPosterHeadline(posterPrompt.slice(0, 40));
      setPosterSubheadline('Crafted directly on ASSF Studio with export-ready PNG canvas layout.');
      sound.playOtaSuccess();
    } finally {
      setIsGeneratingPoster(false);
    }
  };

  const handleDownloadPosterPng = () => {
    const canvas = posterCanvasRef.current;
    if (!canvas) return;
    sound.playOtaSuccess();
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `assf-poster-${Date.now()}.png`;
    a.click();
  };

  // ==================== 2. REPORT BUILDER STATE ====================
  const [reportPrompt, setReportPrompt] = useState(
    '2026 Market & Technology Report: Edge AI Microcontrollers, Matter 1.4 Smart Devices & Industrial Automation ROI'
  );
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportSources, setReportSources] = useState<GroundingSource[]>([]);
  const [reportData, setReportData] = useState<ReportData>({
    title: '2026 Edge AI & Smart Automation Executive Report',
    subtitle: 'Market Intelligence, Operational ROI & Deployment Blueprint',
    executiveSummary:
      'On-device edge AI paired with Matter 1.4 and Wi-Fi 7 reduces cloud inference latency by 78% while cutting recurring bandwidth costs by 62% across smart home and industrial deployments.',
    keyMetrics: [
      { label: 'Edge Inference Latency', value: '< 12 ms', trend: '-78% vs Cloud' },
      { label: 'Annual Bandwidth Savings', value: '62%', trend: '+18% YoY Efficiency' },
      { label: 'Industrial Downtime Drop', value: '44%', trend: 'Predictive TSN' },
    ],
    sections: [
      {
        heading: 'Technology Adoption Drivers',
        analysis:
          'Modern NPUs and low-bit INT4/INT8 quantization now allow vision and anomaly detection models to execute inside milliwatt power envelopes.',
        points: [
          'Dedicated RISC-V & Neural-ART NPUs run 600 GOPS directly at the sensor node',
          'Post-Quantum ML-KEM / ML-DSA signatures secure A/B OTA firmware swaps',
          'Wi-Fi 7 Multi-Link Operation delivers deterministic <2ms failover',
        ],
      },
      {
        heading: 'Commercial & Household Impact',
        analysis:
          'Unified local device meshes eliminate vendor lock-in while enabling automated HVAC, energy management, and factory motor protection.',
        points: [
          'Matter 1.4 adds native solar inverter, EVSE, and battery energy clusters',
          'Digital twins detect bearing wear and thermal spikes before equipment failure',
        ],
      },
    ],
    recommendations: [
      'Adopt dual-partition A/B OTA architecture with SHA-256 / ML-DSA rollback guards',
      'Deploy quantized INT8 models on local gateways to preserve user privacy offline',
      'Track per-zone energy consumption (kWh) and predictive maintenance ROI monthly',
    ],
  });

  const handleGenerateReport = async () => {
    if (!reportPrompt.trim() || isGeneratingReport) return;
    setIsGeneratingReport(true);
    sound.playFlashTick();
    try {
      if (!isAirGapped) {
        const res = await fetch('/api/assf/studio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'report', prompt: reportPrompt }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setReportData(json.data);
            setReportSources(Array.isArray(json.sources) ? json.sources : []);
            sound.playOtaSuccess();
            onLogActivity?.(`Generated report: "${json.data.title || reportPrompt.slice(0, 40)}"`, 'engineering');
          }
        }
      }
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleDownloadReportHtml = () => {
    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>${reportData.title}</title>
<style>body{font-family:system-ui,sans-serif;max-width:860px;margin:40px auto;padding:0 24px;color:#0f172a;line-height:1.6}
h1{font-size:28px;margin-bottom:4px} .sub{color:#64748b;margin-bottom:24px}
.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:20px 0}
.card{border:1px solid #e2e8f0;border-radius:8px;padding:12px}
.val{font-size:22px;font-weight:700;color:#0284c7} h2{margin-top:28px;border-bottom:1px solid #e2e8f0;padding-bottom:6px}</style>
</head><body>
<h1>${reportData.title}</h1><div class="sub">${reportData.subtitle} · Prepared by ASSF</div>
<p><strong>Executive Summary:</strong> ${reportData.executiveSummary}</p>
<div class="metrics">${(reportData.keyMetrics || []).map((m) => `<div class="card"><div>${m.label}</div><div class="val">${m.value}</div><small>${m.trend}</small></div>`).join('')}</div>
${(reportData.sections || []).map((s) => `<h2>${s.heading}</h2><p>${s.analysis}</p><ul>${(s.points || []).map((p) => `<li>${p}</li>`).join('')}</ul>`).join('')}
<h2>Strategic Recommendations</h2><ul>${(reportData.recommendations || []).map((r) => `<li>${r}</li>`).join('')}</ul>
</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assf-report-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
    sound.playOtaSuccess();
  };

  const handleDownloadReportMarkdown = () => {
    const md = [
      `# ${reportData.title}`,
      `*${reportData.subtitle}*`,
      ``,
      `## Executive Summary`,
      reportData.executiveSummary,
      ``,
      `## Key Metrics`,
      ...(reportData.keyMetrics || []).map((m) => `- **${m.label}**: ${m.value} (${m.trend})`),
      ``,
      ...(reportData.sections || []).flatMap((s) => [
        `## ${s.heading}`,
        s.analysis,
        ...(s.points || []).map((p) => `- ${p}`),
        ``,
      ]),
      `## Recommendations`,
      ...(reportData.recommendations || []).map((r, i) => `${i + 1}. ${r}`),
    ].join('\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assf-report-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    sound.playOtaSuccess();
  };

  // ==================== 3. VIDEO CREATOR STUDIO STATE ====================
  const [videoPrompt, setVideoPrompt] = useState(
    '30-second product promo video for smart wireless earbuds with 48-hour battery and AI noise cancellation'
  );
  const [videoTitle, setVideoTitle] = useState('NovaBuds Pro · 2026 Product Launch');
  const [videoScenes, setVideoScenes] = useState<VideoScene[]>([
    {
      title: 'Scene 01 · Hook',
      headline: 'Pure Sound. Zero Distraction.',
      caption: 'Adaptive AI Noise Cancellation tuned 4,000 times per second.',
      metricBadge: '48dB ANC',
      voiceover: 'Meet NovaBuds Pro. Pure studio sound with zero outside noise.',
      durationSec: 4,
      palette: 'cyan',
    },
    {
      title: 'Scene 02 · Performance',
      headline: '48 Hours Non-Stop Battery',
      caption: '10-minute GaN fast charge powers 8 full hours of playback.',
      metricBadge: '48H BATTERY',
      voiceover: 'Enjoy up to 48 hours of battery life and ultra-fast USB-C charging.',
      durationSec: 4,
      palette: 'emerald',
    },
    {
      title: 'Scene 03 · Smart Audio',
      headline: 'Live Translation In Your Ear',
      caption: 'Speak naturally across 24+ languages with sub-second voice AI.',
      metricBadge: '24+ LANGUAGES',
      voiceover: 'Converse across twenty-four languages with real-time on-chip translation.',
      durationSec: 4,
      palette: 'violet',
    },
    {
      title: 'Scene 04 · Call to Action',
      headline: 'Pre-Order Launch Edition',
      caption: 'Save 25% today with free 2-year warranty.',
      metricBadge: 'SAVE 25%',
      voiceover: 'Order today and unlock our twenty-five percent launch discount.',
      durationSec: 4,
      palette: 'amber',
    },
  ]);
  const [videoAspect, setVideoAspect] = useState<'16:9' | '9:16'>('16:9');
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [isRecordingWebm, setIsRecordingWebm] = useState(false);
  const [recordPct, setRecordPct] = useState(0);
  const [voiceOverEnabled, setVoiceOverEnabled] = useState(true);
  const [activeSceneIdx, setActiveSceneIdx] = useState(0);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const videoCanvasRef = useRef<HTMLCanvasElement>(null);
  const animProgressRef = useRef(0);
  const lastSpokenSceneRef = useRef(-1);

  // Hand-off from AI Console Video Card
  useEffect(() => {
    if (incomingVideo) {
      setStudioTab('video');
      setVideoTitle(incomingVideo.title);
      setVideoScenes(incomingVideo.scenes);
      if (incomingVideo.aspectRatio) setVideoAspect(incomingVideo.aspectRatio);
      setRecordedVideoUrl(null);
      animProgressRef.current = 0;
      lastSpokenSceneRef.current = -1;
      setActiveSceneIdx(0);
      onClearIncomingVideo?.();
    }
  }, [incomingVideo, onClearIncomingVideo]);

  const totalVideoSec = useMemo(
    () => videoScenes.reduce((acc, s) => acc + Math.max(2, s.durationSec || 4), 0),
    [videoScenes]
  );

  const drawVideoFrame = useCallback(
    (elapsedSec: number) => {
      const canvas = videoCanvasRef.current;
      if (!canvas || videoScenes.length === 0) return;

      const w = videoAspect === '16:9' ? 960 : 540;
      const h = videoAspect === '16:9' ? 540 : 960;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const sceneIdx = renderVideoSceneFrame(
        ctx,
        w,
        h,
        { title: videoTitle, aspectRatio: videoAspect, scenes: videoScenes },
        elapsedSec,
        videoAspect
      );

      if (sceneIdx !== activeSceneIdx) {
        setActiveSceneIdx(sceneIdx);
      }

      if (isPlayingVideo && voiceOverEnabled && lastSpokenSceneRef.current !== sceneIdx) {
        lastSpokenSceneRef.current = sceneIdx;
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utter = new SpeechSynthesisUtterance(videoScenes[sceneIdx].voiceover);
          utter.rate = 1.05;
          window.speechSynthesis.speak(utter);
        }
      }
    },
    [videoScenes, videoAspect, videoTitle, activeSceneIdx, isPlayingVideo, voiceOverEnabled]
  );

  useEffect(() => {
    if (studioTab === 'video' && !isPlayingVideo) {
      drawVideoFrame(animProgressRef.current);
    }
  }, [studioTab, isPlayingVideo, drawVideoFrame]);

  useEffect(() => {
    if (!isPlayingVideo) return;
    let rafId = 0;
    let prevTime = performance.now();

    const tick = (now: number) => {
      const dt = (now - prevTime) / 1000;
      prevTime = now;
      animProgressRef.current += dt;
      if (animProgressRef.current >= totalVideoSec) {
        animProgressRef.current = 0;
        lastSpokenSceneRef.current = -1;
        setIsPlayingVideo(false);
        drawVideoFrame(0);
        return;
      }
      drawVideoFrame(animProgressRef.current);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlayingVideo, totalVideoSec, drawVideoFrame]);

  const handleGenerateVideoScript = async (customPrompt?: string) => {
    const targetPrompt = (customPrompt ?? videoPrompt).trim();
    if (!targetPrompt || isGeneratingVideo) return;
    setIsGeneratingVideo(true);
    setRecordedVideoUrl(null);
    sound.playFlashTick();
    try {
      if (!isAirGapped) {
        const res = await fetch('/api/assf/studio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'video', prompt: targetPrompt }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data?.title) setVideoTitle(json.data.title);
          if (json.data?.aspectRatio) setVideoAspect(json.data.aspectRatio);
          if (Array.isArray(json.data?.scenes) && json.data.scenes.length > 0) {
            setVideoScenes(json.data.scenes);
            animProgressRef.current = 0;
            lastSpokenSceneRef.current = -1;
            setActiveSceneIdx(0);
            setIsPlayingVideo(true);
            sound.playOtaSuccess();
            onLogActivity?.(`Generated video: "${json.data.title || targetPrompt.slice(0, 40)}"`, 'engineering');
            return;
          }
        }
      }
      const offlineProj = buildOfflineVideoProject(targetPrompt);
      setVideoTitle(offlineProj.title);
      if (offlineProj.aspectRatio) setVideoAspect(offlineProj.aspectRatio);
      setVideoScenes(offlineProj.scenes);
      animProgressRef.current = 0;
      lastSpokenSceneRef.current = -1;
      setActiveSceneIdx(0);
      setIsPlayingVideo(true);
      sound.playOtaSuccess();
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const handleRecordAndExportVideo = async () => {
    if (isRecordingWebm) return;
    setIsPlayingVideo(false);
    setRecordedVideoUrl(null);
    setIsRecordingWebm(true);
    setRecordPct(0);
    sound.playFlashTick();
    try {
      const url = await renderProjectToWebmBlob(
        { title: videoTitle, aspectRatio: videoAspect, scenes: videoScenes },
        videoAspect,
        setRecordPct
      );
      if (url) {
        setRecordedVideoUrl(url);
        sound.playOtaSuccess();
      }
    } finally {
      setIsRecordingWebm(false);
    }
  };

  // ==================== 4. BUSINESS ANALYTICS HUB STATE ====================
  const [csvInput, setCsvInput] = useState(SAMPLE_DATASETS.ecommerce.csv);
  const [analyticsGoal, setAnalyticsGoal] = useState(
    'Identify profit bottlenecks, improve ROAS, and forecast Q1 growth strategy'
  );
  const [isAnalyzingBiz, setIsAnalyzingBiz] = useState(false);
  const [analyticsSources, setAnalyticsSources] = useState<GroundingSource[]>([]);
  const [analyticsInsight, setAnalyticsInsight] = useState<AnalyticsInsight>({
    headline: 'Strong 113% 6-month revenue expansion with improving 50.7% gross margin in Nov.',
    executiveSummary:
      'Monthly revenue scaled from $42,000 in Jun to $89,500 in Nov while gross margin expanded from 44.0% to 50.7%. Ad ROAS reached 7.99x, indicating capacity to scale winning acquisition channels.',
    risks: [
      'Ad spend rose 72% over 6 months; monitor diminishing marginal ROAS above $12k/month.',
      'Fulfillment costs must stay below 49% of revenue during peak holiday discounts.',
    ],
    opportunities: [
      'Bundle high-margin accessories at checkout to lift Average Order Value (AOV) by 14%',
      'Launch automated post-purchase retention flows to convert repeat buyers at zero ad cost',
      'Shift 20% of ad budget toward top-margin SKUs',
    ],
    actionPlan: [
      { action: 'Introduce tiered volume bundles on top 3 products', expectedImpact: '+$9,500/mo revenue', priority: 'HIGH' },
      { action: 'Audit underperforming ad sets with ROAS < 3.5x', expectedImpact: '+4.2% net margin', priority: 'HIGH' },
    ],
  });

  const parsedRows: AnalyticsRow[] = useMemo(() => {
    const lines = csvInput
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const out: AnalyticsRow[] = [];
    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].split(',').map((p) => p.trim());
      if (parts.length < 3) continue;
      const rev = Number(parts[1]);
      const cost = Number(parts[2]);
      if (Number.isNaN(rev) || Number.isNaN(cost)) continue;
      out.push({
        month: parts[0],
        revenue: rev,
        cost,
        orders: Number(parts[3]) || 0,
        adSpend: Number(parts[4]) || 0,
      });
    }
    return out;
  }, [csvInput]);

  const bizKpis = useMemo(() => {
    const totalRev = parsedRows.reduce((s, r) => s + r.revenue, 0);
    const totalCost = parsedRows.reduce((s, r) => s + r.cost, 0);
    const totalOrders = parsedRows.reduce((s, r) => s + r.orders, 0);
    const totalAd = parsedRows.reduce((s, r) => s + r.adSpend, 0);
    const netProfit = totalRev - totalCost - totalAd;
    const grossMargin = totalRev > 0 ? ((totalRev - totalCost) / totalRev) * 100 : 0;
    const aov = totalOrders > 0 ? totalRev / totalOrders : 0;
    const roas = totalAd > 0 ? totalRev / totalAd : 0;
    const growthPct =
      parsedRows.length >= 2 && parsedRows[0].revenue > 0
        ? ((parsedRows[parsedRows.length - 1].revenue - parsedRows[0].revenue) / parsedRows[0].revenue) * 100
        : 0;
    return { totalRev, totalCost, totalOrders, totalAd, netProfit, grossMargin, aov, roas, growthPct };
  }, [parsedRows]);

  const handleRunBizInsights = async () => {
    if (isAnalyzingBiz || parsedRows.length === 0) return;
    setIsAnalyzingBiz(true);
    sound.playFlashTick();
    try {
      if (!isAirGapped) {
        const res = await fetch('/api/assf/studio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'analytics',
            prompt: analyticsGoal,
            context: { kpis: bizKpis, rows: parsedRows },
          }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setAnalyticsInsight(json.data);
            setAnalyticsSources(Array.isArray(json.sources) ? json.sources : []);
            sound.playOtaSuccess();
            onLogActivity?.(`Completed Business Analytics review ($${bizKpis.totalRev.toLocaleString()} rev)`, 'engineering');
          }
        }
      }
    } finally {
      setIsAnalyzingBiz(false);
    }
  };

  // ==================== 5. WEBSITE & APP BUILDER STATE ====================
  const [builderPrompt, setBuilderPrompt] = useState(
    'Smart Electronics & AI Gadgets Store with product cards, category filters, shopping cart drawer, and checkout confirmation'
  );
  const [modifyPrompt, setModifyPrompt] = useState('');
  const [builtAppTitle, setBuiltAppTitle] = useState('NovaGear Electronics Store');
  const [builtSummary, setBuiltSummary] = useState(
    'Responsive e-commerce storefront with live search, category filters, working shopping cart drawer, and order confirmation.'
  );
  const [builtHtml, setBuiltHtml] = useState(() =>
    buildOfflineStorefrontHtml('NovaGear Electronics & AI Gadgets Store')
  );
  const [isBuildingApp, setIsBuildingApp] = useState(false);
  const [builderViewport, setBuilderViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [builderViewMode, setBuilderViewMode] = useState<'preview' | 'code'>('preview');
  const [copiedCode, setCopiedCode] = useState(false);

  // Hand-off from AI Console or Live 60s World & Tech Feed
  useEffect(() => {
    if (incomingApp) {
      setStudioTab('builder');
      setBuiltAppTitle(incomingApp.appTitle);
      setBuiltSummary(incomingApp.summary);
      setBuiltHtml(incomingApp.htmlCode);
      setBuilderViewMode('preview');
      onClearIncomingApp?.();
    }
  }, [incomingApp, onClearIncomingApp]);

  useEffect(() => {
    if (incomingStudioTask) {
      setStudioTab(incomingStudioTask.tab);
      if (incomingStudioTask.tab === 'report') {
        setReportPrompt(incomingStudioTask.prompt);
      } else if (incomingStudioTask.tab === 'builder') {
        setBuilderPrompt(incomingStudioTask.prompt);
      } else if (incomingStudioTask.tab === 'poster') {
        setPosterPrompt(incomingStudioTask.prompt);
      } else if (incomingStudioTask.tab === 'video') {
        setVideoPrompt(incomingStudioTask.prompt);
      }
      onClearIncomingTask?.();
    }
  }, [incomingStudioTask, onClearIncomingTask]);

  const handleBuildWebsiteOrApp = async (isModification = false) => {
    const activePrompt = isModification ? modifyPrompt.trim() : builderPrompt.trim();
    if (!activePrompt || isBuildingApp) return;
    setIsBuildingApp(true);
    sound.playFlashTick();
    try {
      if (!isAirGapped) {
        const res = await fetch('/api/assf/studio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'website',
            prompt: activePrompt,
            context: isModification ? { existingHtml: builtHtml } : undefined,
          }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data?.htmlCode) {
            setBuiltAppTitle(json.data.appTitle || 'ASSF Generated Web App');
            setBuiltSummary(json.data.summary || 'Interactive responsive application ready to preview or download.');
            setBuiltHtml(json.data.htmlCode);
            setBuilderViewMode('preview');
            if (isModification) setModifyPrompt('');
            sound.playOtaSuccess();
            onLogActivity?.(
              `${isModification ? 'Upgraded' : 'Built'} web app: "${json.data.appTitle || activePrompt.slice(0, 40)}"`,
              'engineering'
            );
            return;
          }
        }
      }
      const fallback = buildOfflineAdaptiveApp(activePrompt);
      setBuiltAppTitle(fallback.appTitle);
      setBuiltSummary(fallback.summary);
      setBuiltHtml(fallback.htmlCode);
      sound.playOtaSuccess();
    } finally {
      setIsBuildingApp(false);
    }
  };

  const handleDownloadBuiltHtml = () => {
    const blob = new Blob([builtHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${builtAppTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'assf-app'}.html`;
    a.click();
    URL.revokeObjectURL(url);
    sound.playOtaSuccess();
  };

  const tabs: { id: StudioTab; label: string; icon: React.ReactNode }[] = [
    { id: 'poster', label: 'Poster Designer', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'report', label: 'Report Builder', icon: <FileText className="w-4 h-4" /> },
    { id: 'video', label: 'Video Studio', icon: <Film className="w-4 h-4" /> },
    { id: 'analytics', label: 'Business Analytics', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'builder', label: 'Store & App Builder', icon: <ShoppingBag className="w-4 h-4" /> },
  ];

  const maxRev = Math.max(1, ...parsedRows.map((r) => r.revenue));

  return (
    <div className="space-y-6">
      {/* Studio Mode Selector */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-900/80 border border-slate-800 rounded-xl">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              sound.playFlashTick();
              setStudioTab(t.id);
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap ${
              studioTab === t.id
                ? 'bg-cyan-400 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ==================== TAB 1: POSTER DESIGNER ==================== */}
      {studioTab === 'poster' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white">AI Poster & Campaign Designer</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Describe any product launch, sale, or event poster. Customize copy and export high-res PNG.
              </p>
            </div>

            <div className="space-y-2">
              <textarea
                rows={2}
                value={posterPrompt}
                onChange={(e) => setPosterPrompt(e.target.value)}
                placeholder="Describe your poster (e.g. Weekend Flash Sale 40% off Smart Watches)..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="button"
                onClick={handleGenerateAiPoster}
                disabled={isGeneratingPoster || !posterPrompt.trim()}
                className="w-full py-2 px-4 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-lg flex items-center justify-center gap-2"
              >
                {isGeneratingPoster ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{isGeneratingPoster ? 'Designing Poster Copy...' : 'Generate AI Poster Copy'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800 text-xs">
              <label className="space-y-1 col-span-2">
                <span className="text-slate-400">Brand / Header</span>
                <input
                  value={posterBrand}
                  onChange={(e) => setPosterBrand(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                />
              </label>
              <label className="space-y-1 col-span-2">
                <span className="text-slate-400">Main Headline</span>
                <input
                  value={posterHeadline}
                  onChange={(e) => setPosterHeadline(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                />
              </label>
              <label className="space-y-1 col-span-2">
                <span className="text-slate-400">Subheadline</span>
                <textarea
                  rows={2}
                  value={posterSubheadline}
                  onChange={(e) => setPosterSubheadline(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                />
              </label>
              <label className="space-y-1">
                <span className="text-slate-400">Offer Tag</span>
                <input
                  value={posterBadge}
                  onChange={(e) => setPosterBadge(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                />
              </label>
              <label className="space-y-1">
                <span className="text-slate-400">Call to Action</span>
                <input
                  value={posterCta}
                  onChange={(e) => setPosterCta(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                />
              </label>
              <label className="space-y-1 col-span-2">
                <span className="text-slate-400">Footer / Website</span>
                <input
                  value={posterFooter}
                  onChange={(e) => setPosterFooter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                />
              </label>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Theme Palette</span>
                <div className="flex gap-1.5">
                  {(Object.keys(POSTER_THEMES) as PosterThemeKey[]).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setPosterTheme(k)}
                      className={`px-2 py-1 rounded text-[11px] border ${
                        posterTheme === k
                          ? 'border-cyan-400 text-cyan-300 bg-cyan-950/50'
                          : 'border-slate-700 text-slate-400 bg-slate-950'
                      }`}
                    >
                      {POSTER_THEMES[k].label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Poster Size</span>
                <div className="flex gap-1.5">
                  {(['portrait', 'square', 'landscape'] as const).map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setPosterAspect(a)}
                      className={`px-2.5 py-1 rounded text-[11px] capitalize border ${
                        posterAspect === a
                          ? 'border-cyan-400 text-cyan-300 bg-cyan-950/50'
                          : 'border-slate-700 text-slate-400 bg-slate-950'
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-slate-900/40 border border-slate-800 rounded-xl p-5 flex flex-col items-center space-y-4">
            <div className="w-full flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400">Live Print-Ready Canvas Preview</span>
              <button
                type="button"
                onClick={handleDownloadPosterPng}
                className="px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download Poster (PNG)</span>
              </button>
            </div>
            <div className="w-full flex justify-center bg-slate-950 rounded-xl p-4 border border-slate-800">
              <canvas
                ref={posterCanvasRef}
                className="max-h-[540px] w-auto rounded-lg shadow-2xl border border-slate-800"
              />
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 2: REPORT BUILDER ==================== */}
      {studioTab === 'report' && (
        <div className="space-y-5">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Executive & Technical Report Generator</h3>
                <p className="text-xs text-slate-400">
                  Synthesizes live-grounded market, engineering, or sales reports ready to export as HTML or Markdown.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    sound.playOtaSuccess();
                    downloadReportPdf(reportData, reportSources);
                  }}
                  className="px-3.5 py-1.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sound.playFlashTick();
                    printReportHtml(reportData);
                  }}
                  className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-xs flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-400" />
                  <span>Print Report</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadReportHtml}
                  className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-xs flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Export HTML</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadReportMarkdown}
                  className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-xs flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Export .MD</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={reportPrompt}
                onChange={(e) => setReportPrompt(e.target.value)}
                placeholder="Enter report topic (e.g. Q4 E-Commerce Expansion Strategy, AI Chip Market Report)..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="button"
                onClick={handleGenerateReport}
                disabled={isGeneratingReport || !reportPrompt.trim() || isAirGapped}
                className="px-5 py-2 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-lg flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {isGeneratingReport ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{isGeneratingReport ? 'Researching & Writing...' : 'Generate Grounded Report'}</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-white">{reportData.title}</h2>
              <p className="text-xs text-slate-400 mt-1">{reportData.subtitle}</p>
            </div>

            <div className="text-sm text-slate-200 leading-relaxed">{reportData.executiveSummary}</div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(reportData.keyMetrics || []).map((m, idx) => (
                <div key={idx} className="bg-slate-900/80 border border-slate-800 rounded-lg p-4">
                  <div className="text-xs text-slate-400">{m.label}</div>
                  <div className="text-2xl font-bold text-cyan-400 mt-1">{m.value}</div>
                  <div className="text-[11px] text-emerald-400 mt-1 font-mono">{m.trend}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(reportData.sections || []).map((s, idx) => (
                <div key={idx} className="space-y-2 border-t border-slate-800/80 pt-4">
                  <h4 className="text-sm font-semibold text-white">{s.heading}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{s.analysis}</p>
                  <ul className="space-y-1.5 text-xs text-slate-400 list-disc pl-4">
                    {(s.points || []).map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-800 pt-4 space-y-2">
              <h4 className="text-sm font-semibold text-emerald-300">Actionable Recommendations</h4>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {(reportData.recommendations || []).map((r, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>

            {reportSources.length > 0 && (
              <div className="border-t border-slate-800 pt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                <span className="font-semibold text-slate-300">Verified Sources:</span>
                {reportSources.map((src, i) => (
                  <a
                    key={i}
                    href={src.uri}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 underline"
                  >
                    <span>{src.title}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB 3: VIDEO CREATOR STUDIO ==================== */}
      {studioTab === 'video' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white">AI Promo & Explainer Video Studio</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Generate multi-scene motion videos with voiceover narration and export real playable .webm files.
              </p>
            </div>

            <textarea
              rows={2}
              value={videoPrompt}
              onChange={(e) => setVideoPrompt(e.target.value)}
              placeholder="Describe your product promo or explainer video..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleGenerateVideoScript()}
                disabled={isGeneratingVideo || !videoPrompt.trim()}
                className="flex-1 py-2 px-4 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-lg flex items-center justify-center gap-2"
              >
                {isGeneratingVideo ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{isGeneratingVideo ? 'Directing Video...' : 'Make AI Video from Prompt'}</span>
              </button>

              <button
                type="button"
                onClick={() => setVideoAspect(videoAspect === '16:9' ? '9:16' : '16:9')}
                className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-300"
              >
                Ratio: {videoAspect}
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 text-[11px]">
              {[
                'Product launch video for smart AI glasses with 4K camera',
                '9:16 vertical short reel about 2026 Mars colonization rockets',
                'Restaurant grand opening promo video with 30% discount',
                'Educational explainer video: How Quantum Computers work',
              ].map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setVideoPrompt(preset);
                    handleGenerateVideoScript(preset);
                  }}
                  className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-cyan-300 text-left"
                >
                  + {preset}
                </button>
              ))}
            </div>

            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1 pt-2 border-t border-slate-800">
              {videoScenes.map((scene, i) => (
                <div
                  key={i}
                  onClick={() => {
                    setActiveSceneIdx(i);
                    const startSec = videoScenes
                      .slice(0, i)
                      .reduce((s, sc) => s + Math.max(2, sc.durationSec || 4), 0);
                    animProgressRef.current = startSec;
                    drawVideoFrame(startSec);
                  }}
                  className={`p-3 rounded-lg border cursor-pointer space-y-1.5 text-xs ${
                    activeSceneIdx === i
                      ? 'bg-cyan-950/30 border-cyan-500/60'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-cyan-400">
                    <span>{scene.title}</span>
                    <select
                      value={scene.visualStyle || 'orbits'}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        setVideoScenes((prev) =>
                          prev.map((sc, idx) =>
                            idx === i ? { ...sc, visualStyle: e.target.value as VideoVisualStyle } : sc
                          )
                        )
                      }
                      className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-slate-200"
                    >
                      <option value="orbits">Orbits</option>
                      <option value="particles">Particles</option>
                      <option value="bars">Data Bars</option>
                      <option value="wave">Audio Wave</option>
                      <option value="rocket">Rocket Arc</option>
                      <option value="grid">Cyber Grid</option>
                    </select>
                  </div>
                  <input
                    value={scene.headline}
                    onChange={(e) =>
                      setVideoScenes((prev) =>
                        prev.map((sc, idx) => (idx === i ? { ...sc, headline: e.target.value } : sc))
                      )
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white font-semibold"
                  />
                  <input
                    value={scene.voiceover}
                    onChange={(e) =>
                      setVideoScenes((prev) =>
                        prev.map((sc, idx) => (idx === i ? { ...sc, voiceover: e.target.value } : sc))
                      )
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-300 text-[11px]"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-7 bg-slate-900/40 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (isPlayingVideo) {
                      setIsPlayingVideo(false);
                      window.speechSynthesis?.cancel();
                    } else {
                      setRecordedVideoUrl(null);
                      lastSpokenSceneRef.current = -1;
                      setIsPlayingVideo(true);
                    }
                  }}
                  className="px-4 py-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-2"
                >
                  {isPlayingVideo ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{isPlayingVideo ? 'Pause' : 'Play Video'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVoiceOverEnabled(!voiceOverEnabled)}
                  className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-300 flex items-center gap-1.5"
                >
                  {voiceOverEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5" />}
                  <span>Voiceover</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRecordAndExportVideo}
                  disabled={isRecordingWebm}
                  className="px-4 py-2 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-2"
                >
                  <Video className="w-4 h-4" />
                  <span>{isRecordingWebm ? `Rendering (${recordPct}%)...` : 'Render & Export .WebM'}</span>
                </button>

                {recordedVideoUrl && (
                  <a
                    href={recordedVideoUrl}
                    download={`assf-video-${Date.now()}.webm`}
                    className="px-3 py-2 bg-slate-950 border border-emerald-500/60 text-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Save Video</span>
                  </a>
                )}
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex justify-center">
              {recordedVideoUrl ? (
                <video
                  src={recordedVideoUrl}
                  controls
                  autoPlay
                  className="max-h-[460px] w-auto rounded-lg border border-emerald-500/40 shadow-2xl"
                />
              ) : (
                <canvas
                  ref={videoCanvasRef}
                  className="max-h-[460px] w-auto rounded-lg border border-slate-800 shadow-2xl"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 4: BUSINESS ANALYTICS HUB ==================== */}
      {studioTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400">Total Revenue</div>
              <div className="text-xl font-bold text-white mt-1">${bizKpis.totalRev.toLocaleString()}</div>
              <div className="text-[11px] text-emerald-400 font-mono mt-0.5">+{bizKpis.growthPct.toFixed(1)}% period</div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400">Net Profit</div>
              <div className="text-xl font-bold text-emerald-400 mt-1">${bizKpis.netProfit.toLocaleString()}</div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">After COGS & Ads</div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400">Gross Margin</div>
              <div className="text-xl font-bold text-cyan-400 mt-1">{bizKpis.grossMargin.toFixed(1)}%</div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">Unit economics</div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400">Avg Order Value</div>
              <div className="text-xl font-bold text-white mt-1">${bizKpis.aov.toFixed(2)}</div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">{bizKpis.totalOrders.toLocaleString()} orders</div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 col-span-2 lg:col-span-1">
              <div className="text-xs text-slate-400">Blended ROAS</div>
              <div className="text-xl font-bold text-amber-400 mt-1">{bizKpis.roas.toFixed(2)}x</div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">${bizKpis.totalAd.toLocaleString()} ad spend</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Business Data (CSV)</h3>
                <div className="flex gap-1.5">
                  {Object.entries(SAMPLE_DATASETS).map(([key, ds]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCsvInput(ds.csv)}
                      className="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-[11px] text-slate-300 hover:border-cyan-400 uppercase"
                    >
                      {key}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                rows={7}
                value={csvInput}
                onChange={(e) => setCsvInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
              />

              <input
                value={analyticsGoal}
                onChange={(e) => setAnalyticsGoal(e.target.value)}
                placeholder="Ask a business question about this dataset..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleRunBizInsights}
                  disabled={isAnalyzingBiz || parsedRows.length === 0 || isAirGapped}
                  className="flex-1 py-2.5 px-4 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-lg flex items-center justify-center gap-2"
                >
                  {isAnalyzingBiz ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                  <span>{isAnalyzingBiz ? 'Running BI Analysis...' : 'Run AI Business Insights'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sound.playOtaSuccess();
                    downloadAnalyticsPdf({ kpis: bizKpis, insight: analyticsInsight });
                  }}
                  className="py-2.5 px-3.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 shrink-0"
                  title="Download Business Analytics Summary as PDF"
                >
                  <FileDown className="w-4 h-4" />
                  <span>PDF</span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-5">
              {/* Visual Revenue vs Cost Chart */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">Revenue vs. Cost Trend</span>
                  <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400"></span> Revenue
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-amber-400"></span> Cost
                    </span>
                  </div>
                </div>

                <div className="h-44 flex items-end gap-3 pt-4 border-b border-slate-800 pb-2">
                  {parsedRows.map((row, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                      <div className="w-full flex items-end justify-center gap-1 h-full">
                        <div
                          className="w-5 bg-cyan-400 rounded-t transition-all"
                          style={{ height: `${Math.max(6, (row.revenue / maxRev) * 100)}%` }}
                          title={`${row.month} Revenue: $${row.revenue.toLocaleString()}`}
                        />
                        <div
                          className="w-5 bg-amber-400/80 rounded-t transition-all"
                          style={{ height: `${Math.max(4, (row.cost / maxRev) * 100)}%` }}
                          title={`${row.month} Cost: $${row.cost.toLocaleString()}`}
                        />
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">{row.month}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Strategic Insights */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-white">{analyticsInsight.headline}</h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{analyticsInsight.executiveSummary}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <div className="font-semibold text-emerald-400">Growth Opportunities</div>
                    <ul className="list-disc pl-4 space-y-1 text-slate-300">
                      {(analyticsInsight.opportunities || []).map((o, i) => (
                        <li key={i}>{o}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-1.5">
                    <div className="font-semibold text-amber-400">Risks to Watch</div>
                    <ul className="list-disc pl-4 space-y-1 text-slate-300">
                      {(analyticsInsight.risks || []).map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-3 space-y-2">
                  <div className="text-xs font-semibold text-cyan-400">Recommended Action Plan</div>
                  {(analyticsInsight.actionPlan || []).map((step, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-slate-900 rounded-lg px-3 py-2">
                      <span className="text-slate-200">{step.action}</span>
                      <span className="text-emerald-400 font-mono text-[11px] shrink-0 ml-3">{step.expectedImpact}</span>
                    </div>
                  ))}
                </div>

                {analyticsSources.length > 0 && (
                  <div className="flex flex-wrap gap-3 text-[11px] text-slate-400 pt-1">
                    {analyticsSources.map((s, i) => (
                      <a key={i} href={s.uri} target="_blank" rel="noreferrer" className="text-cyan-400 underline">
                        {s.title}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 5: STOREFRONT & APP BUILDER ==================== */}
      {studioTab === 'builder' && (
        <div className="space-y-5">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Product Selling Website & Custom App Builder</h3>
                <p className="text-xs text-slate-400">
                  Describe any e-commerce store or web app. ASSF generates interactive UI + working cart/logic with live preview and HTML export.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBuilderViewport('desktop')}
                  className={`p-2 rounded-lg border ${
                    builderViewport === 'desktop'
                      ? 'border-cyan-400 text-cyan-400 bg-cyan-950/40'
                      : 'border-slate-700 text-slate-400'
                  }`}
                  title="Desktop View"
                >
                  <Monitor className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setBuilderViewport('mobile')}
                  className={`p-2 rounded-lg border ${
                    builderViewport === 'mobile'
                      ? 'border-cyan-400 text-cyan-400 bg-cyan-950/40'
                      : 'border-slate-700 text-slate-400'
                  }`}
                  title="Mobile View"
                >
                  <Smartphone className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setBuilderViewMode(builderViewMode === 'preview' ? 'code' : 'preview')}
                  className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 flex items-center gap-1.5"
                >
                  {builderViewMode === 'preview' ? <Code2 className="w-3.5 h-3.5 text-cyan-400" /> : <Eye className="w-3.5 h-3.5 text-cyan-400" />}
                  <span>{builderViewMode === 'preview' ? 'View HTML Code' : 'Live Preview'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadBuiltHtml}
                  className="px-3.5 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .HTML</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={builderPrompt}
                onChange={(e) => setBuilderPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleBuildWebsiteOrApp(false);
                }}
                placeholder="Describe anything to build (e.g. Organic Skincare Store, Clinic Booking App, Budget Tracker, Quiz Game)..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="button"
                onClick={() => handleBuildWebsiteOrApp(false)}
                disabled={isBuildingApp || !builderPrompt.trim()}
                className="px-5 py-2 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-lg flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {isBuildingApp ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                <span>{isBuildingApp ? 'Building App...' : 'Build New Website / App'}</span>
              </button>
            </div>

            {!isAirGapped && (
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <input
                  value={modifyPrompt}
                  onChange={(e) => setModifyPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleBuildWebsiteOrApp(true);
                  }}
                  placeholder="Modify or upgrade current app (e.g. 'Add promo code SAVE20, customer reviews, and dark/light theme toggle')..."
                  className="flex-1 bg-slate-950 border border-emerald-500/40 rounded-lg px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                />
                <button
                  type="button"
                  onClick={() => handleBuildWebsiteOrApp(true)}
                  disabled={isBuildingApp || !modifyPrompt.trim()}
                  className="px-4 py-2 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Upgrade Current App</span>
                </button>
              </div>
            )}

            <div className="flex flex-wrap gap-1.5 text-[11px]">
              {[
                'Luxury Watch & Jewelry E-Commerce Store with Cart',
                'Organic Skincare Product Store with Routine Quiz',
                'Interactive EMI, Loan & Investment ROI Calculator App',
                'Restaurant Online Ordering App with Menu & Cart',
                'Doctor Clinic Appointment Booking & Slot Manager App',
              ].map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setBuilderPrompt(preset)}
                  className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-cyan-300"
                >
                  + {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-white">{builtAppTitle}</span>
                <span className="text-slate-500 mx-2">·</span>
                <span className="text-slate-400">{builtSummary}</span>
              </div>
              {builderViewMode === 'code' && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(builtHtml);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  }}
                  className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded text-[11px] text-slate-300 flex items-center gap-1"
                >
                  {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                </button>
              )}
            </div>

            {builderViewMode === 'preview' ? (
              <div className="p-4 bg-slate-900/40 flex justify-center">
                <iframe
                  title={builtAppTitle}
                  srcDoc={builtHtml}
                  sandbox="allow-scripts allow-forms"
                  className={`bg-white rounded-lg border border-slate-700 transition-all ${
                    builderViewport === 'mobile' ? 'w-[390px] h-[640px]' : 'w-full h-[640px]'
                  }`}
                />
              </div>
            ) : (
              <pre className="p-4 text-[11px] font-mono text-cyan-200 overflow-auto max-h-[640px]">
                {builtHtml}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
