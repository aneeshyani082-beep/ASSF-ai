import express, { type Request, type Response } from 'express';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';

dotenv.config();

const app = express();
const PORT = Number(process.env.DEFAULT_APP_PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Server-side Gemini AI client lazy initialization
function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// In-memory OTA repository holding available model updates
interface OtaPatch {
  version: string;
  releaseDate: string;
  domain: string;
  description: string;
  sizeBytes: number;
  sha256: string;
  crc32: string;
  deltaWeights: Record<string, number>;
  knowledgeItems: Array<{
    id: string;
    trigger: string;
    category: string;
    response: string;
    urgency?: 'normal' | 'high' | 'critical';
  }>;
}

const otaRepository: OtaPatch[] = [
  {
    version: 'v1.1.0-patch',
    releaseDate: '2026-11-09',
    domain: 'industrial',
    description: 'Added ISO-10816 vibration severity thresholds & emergency pump cavitation protocol',
    sizeBytes: 18432,
    sha256: '9f83a21b34c264a7c88b90e9df25301824ab74238947b1e8470a1e3895e7c823',
    crc32: '4E72B109',
    deltaWeights: { 'w_vib_layer1': 1.14, 'w_temp_thresh': 0.98, 'b_alarm_bias': 0.12 },
    knowledgeItems: [
      {
        id: 'ind-ota-01',
        trigger: 'vibration exceeds 4.5 mm/s or pump cavitation sound',
        category: 'Machinery Safety',
        response: 'ALERT: ISO-10816 Class II vibration severity exceeds allowable limit (4.5 mm/s RMS). Action: Reduce motor RPM by 25% immediately. Inspect impeller inlet for cavitation bubbles and verify suction head pressure > 1.2 bar. If vibration persists > 90 seconds, trigger Emergency Stop Relay via GPIO16.',
        urgency: 'critical',
      },
      {
        id: 'ind-ota-02',
        trigger: 'bearing lubrication cycle or temperature above 75C',
        category: 'Maintenance',
        response: 'Bearing thermal escalation detected (>75°C). Verify automated grease dispenser solenoid activation. Recommended lubricant: Polyurea ISO VG 100. If thermal ramp rate exceeds 1.5°C/minute, execute safe shutdown sequence within 180 seconds.',
        urgency: 'high',
      },
    ],
  },
  {
    version: 'v1.2.0-patch',
    releaseDate: '2026-11-10',
    domain: 'biomedical',
    description: 'Updated ventricular tachycardia QRS duration classifier & hypothermia alert',
    sizeBytes: 24576,
    sha256: 'a127f8302cb4981d77102e88a38c92b5120f8c2e649012a97123bc8917eef901',
    crc32: '7D1A9F43',
    deltaWeights: { 'w_qrs_width': 1.32, 'w_rr_interval': -0.85, 'b_arrhythmia': 0.24 },
    knowledgeItems: [
      {
        id: 'bio-ota-01',
        trigger: 'wide QRS complex > 120ms with heart rate > 140 bpm',
        category: 'Cardiology',
        response: 'CRITICAL DIAGNOSTIC: Electrocardiogram analysis indicates Wide Complex Tachycardia (QRS > 120ms, HR > 140 bpm). High probability of Ventricular Tachycardia (VT). Automated external defibrillator (AED) standby advisory. Prepare patient in supine position; ensure uninterrupted continuous pulse oximetry monitoring.',
        urgency: 'critical',
      },
    ],
  },
  {
    version: 'v1.3.0-patch',
    releaseDate: '2026-11-15',
    domain: 'advanced-tech',
    description: '2026 Edge AI NPU INT4/INT8 kernels, Post-Quantum ML-KEM OTA signatures, Matter 1.4 & Wi-Fi 7 MLO telemetry',
    sizeBytes: 28672,
    sha256: 'c4e9b7108d5a3e12f9b64017ac89e12377d5f00219c8e4b60a214f9032d81e54',
    crc32: '9B4E21F0',
    deltaWeights: { 'w_npu_int4_scale': 1.28, 'w_mlkem_verify': 1.0, 'w_wifi7_mlo': 0.94 },
    knowledgeItems: [
      {
        id: 'tech-ota-01',
        trigger: 'post-quantum ml-kem ota signature or wifi 7 mlo roaming',
        category: 'Advanced Tech',
        response: 'Post-Quantum ML-KEM-768 + ML-DSA firmware verification active. Wi-Fi 7 Multi-Link Operation (MLO) dynamically bonds 5 GHz + 6 GHz links for deterministic sub-2ms industrial telemetry failover.',
        urgency: 'high',
      },
    ],
  },
];

// Helper to compute simple CRC32
function calculateCrc32(data: string): string {
  let crc = ~0;
  for (let i = 0; i < data.length; i++) {
    const byte = data.charCodeAt(i);
    crc ^= byte;
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1));
    }
  }
  return ((~crc) >>> 0).toString(16).toUpperCase().padStart(8, '0');
}

function extractWebSources(response: any): Array<{ title: string; uri: string }> {
  const chunks = response?.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (!Array.isArray(chunks)) return [];
  const seen = new Set<string>();
  return chunks
    .map((c: any) => c?.web)
    .filter((w: any) => w && typeof w.uri === 'string' && w.uri.startsWith('http'))
    .filter((w: any) => {
      if (seen.has(w.uri)) return false;
      seen.add(w.uri);
      return true;
    })
    .slice(0, 6)
    .map((w: any) => ({
      title: String(w.title || w.uri).slice(0, 90),
      uri: String(w.uri),
    }));
}

function detectVideoIntentFallback(promptText: string): boolean {
  const lower = promptText.toLowerCase();
  const verb = /\b(make|create|build|generate|produce|render|animate|design|craft)\b/.test(lower);
  const noun =
    /\b(video|videos|reel|reels|short|shorts|trailer|commercial|promo video|explainer video|animation|storyboard|clip)\b/.test(
      lower
    );
  return verb && noun;
}

function detectBuildIntentFallback(promptText: string): boolean {
  const lower = promptText.toLowerCase();
  if (detectVideoIntentFallback(lower) && !/\b(website|web app|webapp|store|shop|ecommerce|landing page|dashboard)\b/.test(lower)) {
    return false;
  }
  const verb = /\b(build|create|make|design|develop|generate)\b/.test(lower);
  const noun =
    /\b(website|web app|webapp|site|store|shop|ecommerce|e-commerce|landing page|portfolio|app|application|dashboard|calculator|tracker|booking|menu|game|quiz|converter|planner|crm|tool)\b/.test(
      lower
    );
  return verb && noun;
}

async function generateVideoProject(prompt: string): Promise<{
  title: string;
  aspectRatio: '16:9' | '9:16';
  scenes: Array<{
    title: string;
    headline: string;
    caption: string;
    metricBadge: string;
    voiceover: string;
    durationSec: number;
    palette: 'cyan' | 'emerald' | 'amber' | 'violet';
    visualStyle: 'orbits' | 'wave' | 'bars' | 'grid' | 'particles' | 'rocket';
  }>;
}> {
  const ai = getAiClient();
  const todayStr = new Date().toISOString().split('T')[0];
  const defaultAspect: '16:9' | '9:16' = /\b(9:16|vertical|reel|reels|short|shorts|tiktok|portrait)\b/i.test(prompt)
    ? '9:16'
    : '16:9';

  const systemInstruction = `You are ASSF Advanced AI Video Director & Scriptwriter (${todayStr}).
Turn ANY user prompt (product ad, story, explainer, tutorial, space/science reel, business pitch, social short, etc.) into a 4 to 5 scene animated video storyboard tailored strictly to what the consumer asked for.
Return ONLY valid JSON with exact keys:
{
  "title": "Short Catchy Video Title (3-6 words)",
  "aspectRatio": "16:9" | "9:16",
  "scenes": [
    {
      "title": "Scene 01 · Hook",
      "headline": "Bold 3-6 word on-screen headline",
      "caption": "Crisp 8-14 word on-screen visual caption",
      "metricBadge": "Short 2-3 word badge e.g. NEW 2026 or 3X FASTER",
      "voiceover": "Natural 1-2 sentence spoken narration for this scene",
      "durationSec": 4,
      "palette": "cyan" | "emerald" | "amber" | "violet",
      "visualStyle": "orbits" | "wave" | "bars" | "grid" | "particles" | "rocket"
    }
  ]
}`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: `Create a complete engaging motion video for this request: "${prompt}"`,
    config: {
      systemInstruction,
      thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
      responseMimeType: 'application/json',
    },
  });

  const rawText = (response.text || '').trim();
  let parsed: any = null;
  try {
    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();
    parsed = JSON.parse(cleaned);
  } catch {
    const match = rawText.match(/\{[\s\S]*\}/);
    if (match) parsed = JSON.parse(match[0]);
  }

  const validPalettes = new Set(['cyan', 'emerald', 'amber', 'violet']);
  const validStyles = new Set(['orbits', 'wave', 'bars', 'grid', 'particles', 'rocket']);

  const scenes = Array.isArray(parsed?.scenes) && parsed.scenes.length > 0
    ? parsed.scenes.slice(0, 6).map((sc: any, idx: number) => ({
        title: String(sc.title || `Scene 0${idx + 1}`),
        headline: String(sc.headline || `Scene ${idx + 1}`).slice(0, 60),
        caption: String(sc.caption || '').slice(0, 140),
        metricBadge: String(sc.metricBadge || `PART ${idx + 1}`).slice(0, 24),
        voiceover: String(sc.voiceover || sc.caption || sc.headline || ''),
        durationSec: Math.min(8, Math.max(3, Number(sc.durationSec) || 4)),
        palette: validPalettes.has(sc.palette) ? sc.palette : (['cyan', 'violet', 'emerald', 'amber'][idx % 4] as any),
        visualStyle: validStyles.has(sc.visualStyle)
          ? sc.visualStyle
          : (['orbits', 'particles', 'bars', 'rocket', 'wave', 'grid'][idx % 6] as any),
      }))
    : [];

  if (scenes.length === 0) {
    throw new Error('Failed to generate video scenes');
  }

  return {
    title: String(parsed?.title || prompt.slice(0, 48)),
    aspectRatio: parsed?.aspectRatio === '9:16' ? '9:16' : defaultAspect,
    scenes,
  };
}

async function generateInteractiveWebApp(
  prompt: string,
  existingHtml?: string
): Promise<{ appTitle: string; summary: string; htmlCode: string }> {
  const ai = getAiClient();
  const todayStr = new Date().toISOString().split('T')[0];
  const systemInstruction = `You are an expert full-stack frontend, e-commerce, and interactive web application developer (${todayStr}).
Build a COMPLETE, responsive, polished, self-contained single-file HTML5 web application for the user's request (product-selling store, SaaS dashboard, calculator, booking app, game, portfolio, tracker, or any custom tool).
Requirements:
- Use <script src="https://cdn.tailwindcss.com"></script> for styling.
- Make all interactive controls genuinely work in client-side JS (search, filters, calculations, charts/SVG, forms, local state). For e-commerce stores include a working Shopping Cart drawer (add, +/- quantity, remove, subtotal, simulated checkout confirmation — NEVER use window.alert or window.open).
- Use crisp inline SVG icons/illustrations (do not rely on broken external image URLs).
- Return ONLY valid JSON with exact keys:
{
  "appTitle": "Short App or Store Name",
  "summary": "1-sentence summary of implemented features",
  "htmlCode": "<!DOCTYPE html>...complete runnable HTML document..."
}`;

  const userContent = existingHtml
    ? `Modify and upgrade the existing HTML5 web application according to this instruction: "${prompt}".\n\nExisting HTML:\n${existingHtml.slice(0, 24000)}`
    : prompt;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: userContent,
    config: {
      systemInstruction,
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
      responseMimeType: 'application/json',
    },
  });

  const rawText = (response.text || '').trim();
  let parsed: any = null;
  try {
    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();
    parsed = JSON.parse(cleaned);
  } catch {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    }
  }

  if (!parsed || typeof parsed.htmlCode !== 'string' || !parsed.htmlCode.includes('<html')) {
    throw new Error('Failed to generate valid HTML application');
  }

  return {
    appTitle: String(parsed.appTitle || prompt.slice(0, 48)),
    summary: String(parsed.summary || 'Interactive self-contained web application built by ASSF.'),
    htmlCode: parsed.htmlCode,
  };
}

interface LivePulseCachePayload {
  fetchedAtMs: number;
  updatedAt: string;
  nextRefreshSec: number;
  versionTag: string;
  items: Array<{
    id: string;
    category: 'AI & Tech' | 'Silicon & Hardware' | 'Science & Space' | 'World & Economy';
    title: string;
    summary: string;
    triggerKeywords: string;
    importance: 'breaking' | 'high' | 'normal';
    timestamp: string;
  }>;
  sources: Array<{ title: string; uri: string }>;
  otaPatch: OtaPatch;
}

const LIVE_PULSE_TTL_MS = 55_000;
let livePulseCache: LivePulseCachePayload | null = null;
let inFlightPulsePromise: Promise<LivePulseCachePayload> | null = null;
let pulseSeq = 1;

async function fetchOrRefreshLivePulse(force = false): Promise<LivePulseCachePayload> {
  const now = Date.now();
  if (!force && livePulseCache && now - livePulseCache.fetchedAtMs < LIVE_PULSE_TTL_MS) {
    return livePulseCache;
  }
  if (inFlightPulsePromise) {
    return inFlightPulsePromise;
  }

  inFlightPulsePromise = (async (): Promise<LivePulseCachePayload> => {
    const nowIso = new Date().toISOString();
    const todayDate = nowIso.split('T')[0];
    const timeLabel = new Date().toLocaleTimeString();

    let items: LivePulseCachePayload['items'] = [];
    let sources: Array<{ title: string; uri: string }> = [];

    try {
      const ai = getAiClient();
      const systemInstruction = `You are ASSF Live World & Technology Radar (${nowIso}).
Using real-time web search, gather the 6 most recent and important real-world updates right now across:
1. AI & Tech (frontier AI models, agentic protocols, software frameworks)
2. Silicon & Hardware (chips, GPUs, NPUs, robotics, embedded microcontrollers)
3. Science & Space (physics, clean energy, biotech, aerospace missions)
4. World & Economy (major global developments, markets, tech policy)

Return ONLY valid JSON with exact structure (no markdown commentary):
{
  "items": [
    {
      "category": "AI & Tech" | "Silicon & Hardware" | "Science & Space" | "World & Economy",
      "title": "Concise 5-9 word headline",
      "summary": "Direct 1-2 sentence factual update with real specifics.",
      "triggerKeywords": "4-6 comma-separated lowercase keywords",
      "importance": "breaking" | "high" | "normal"
    }
  ]
}`;

      let response: any;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `Fetch the latest verified advanced AI breakthroughs, frontier models, robotics/silicon, and world news updates for ${todayDate} (continuous AI evolution cycle #${pulseSeq}). Focus on concrete real-world developments happening now.`,
          config: {
            systemInstruction,
            thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
            tools: [{ googleSearch: {} }],
          },
        });
      } catch {
        response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `Provide 6 important current technology, silicon, science, and world developments as of ${todayDate}.`,
          config: {
            systemInstruction,
            thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
            responseMimeType: 'application/json',
          },
        });
      }

      sources = extractWebSources(response);
      const rawText = (response.text || '').trim();
      const cleaned = rawText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```$/i, '')
        .trim();
      let parsed: any = null;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        const match = rawText.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
      }

      if (parsed && Array.isArray(parsed.items)) {
        const validCats = new Set([
          'AI & Tech',
          'Silicon & Hardware',
          'Science & Space',
          'World & Economy',
        ]);
        items = parsed.items.slice(0, 6).map((it: any, idx: number) => ({
          id: `pulse-${Date.now()}-${idx}`,
          category: validCats.has(it.category) ? it.category : 'AI & Tech',
          title: String(it.title || 'Live Technology Update').slice(0, 90),
          summary: String(it.summary || '').slice(0, 320),
          triggerKeywords: String(it.triggerKeywords || it.title || 'latest tech world news').toLowerCase(),
          importance:
            it.importance === 'breaking' || it.importance === 'high' ? it.importance : 'normal',
          timestamp: timeLabel,
        }));
      }
    } catch (err) {
      console.warn('Live pulse fallback triggered:', err instanceof Error ? err.message : String(err));
    }

    if (items.length === 0) {
      items = [
        {
          id: `pulse-fb-1-${Date.now()}`,
          category: 'AI & Tech',
          title: 'Agentic MCP & Multimodal Tool Systems Scaling',
          summary:
            'Autonomous tool-calling AI pipelines with real-time web grounding and structured code generation are accelerating enterprise workflows.',
          triggerKeywords: 'agentic ai, mcp, multimodal, autonomous systems, latest tech',
          importance: 'high',
          timestamp: timeLabel,
        },
        {
          id: `pulse-fb-2-${Date.now()}`,
          category: 'Silicon & Hardware',
          title: 'Edge NPU INT4/INT8 Microcontrollers Reaching 600 GOPS',
          summary:
            'Embedded RISC-V and Cortex-M55 silicon with dedicated NPUs execute vision and voice inference directly inside milliwatt budgets.',
          triggerKeywords: 'edge npu, stm32n6, esp32-p4, risc-v, tinyml, silicon',
          importance: 'high',
          timestamp: timeLabel,
        },
        {
          id: `pulse-fb-3-${Date.now()}`,
          category: 'Science & Space',
          title: 'Grid-Scale Clean Energy & Solid-State Battery Rollouts',
          summary:
            'High-density solid-state storage and bidirectional V2G smart inverters continue expanding industrial microgrid resilience.',
          triggerKeywords: 'solid state battery, clean energy, v2g, grid storage, science',
          importance: 'normal',
          timestamp: timeLabel,
        },
        {
          id: `pulse-fb-4-${Date.now()}`,
          category: 'World & Economy',
          title: 'Global Post-Quantum Cybersecurity & Digital Infrastructure',
          summary:
            'Organizations worldwide are migrating critical firmware and communications to NIST FIPS 203/204 ML-KEM and ML-DSA standards.',
          triggerKeywords: 'post-quantum, ml-kem, global tech, cybersecurity, world update',
          importance: 'normal',
          timestamp: timeLabel,
        },
      ];
    }

    const versionTag = `v1.${otaRepository.length + 1}.0-pulse-${pulseSeq}`;
    pulseSeq += 1;

    const knowledgeItems = items.map((it) => ({
      id: it.id,
      trigger: it.triggerKeywords,
      category: it.category === 'World & Economy' ? 'World' : 'Science',
      response: `[LIVE ${it.category.toUpperCase()} UPDATE · ${it.timestamp}] ${it.title}: ${it.summary}`,
      urgency: it.importance === 'breaking' ? ('high' as const) : ('normal' as const),
    }));

    const payloadString = JSON.stringify(knowledgeItems);
    const otaPatch: OtaPatch = {
      version: versionTag,
      releaseDate: todayDate,
      domain: 'world-tech-pulse',
      description: `Every-minute Live Tech & World Delta (${items.length} updates)`,
      sizeBytes: payloadString.length + 512,
      sha256: crypto.createHash('sha256').update(payloadString).digest('hex'),
      crc32: calculateCrc32(payloadString),
      deltaWeights: { [`w_pulse_${Date.now()}`]: 1.08 },
      knowledgeItems,
    };

    otaRepository.push(otaPatch);
    if (otaRepository.length > 40) {
      otaRepository.splice(3, otaRepository.length - 40);
    }

    const result: LivePulseCachePayload = {
      fetchedAtMs: Date.now(),
      updatedAt: nowIso,
      nextRefreshSec: 60,
      versionTag,
      items,
      sources,
      otaPatch,
    };
    livePulseCache = result;
    return result;
  })();

  try {
    return await inFlightPulsePromise;
  } finally {
    inFlightPulsePromise = null;
  }
}

// Every-Minute Live World & Technology Auto-Updater Endpoint
app.get('/api/assf/live-pulse', async (req: Request, res: Response) => {
  const force = req.query.force === 'true' || req.query.force === '1';
  try {
    const pulse = await fetchOrRefreshLivePulse(force);
    res.json({
      status: 'success',
      updatedAt: pulse.updatedAt,
      nextRefreshSec: pulse.nextRefreshSec,
      versionTag: pulse.versionTag,
      items: pulse.items,
      sources: pulse.sources,
      otaPatch: pulse.otaPatch,
    });
  } catch (err: unknown) {
    console.error('Live pulse error:', err);
    res.status(500).json({
      error: 'Failed to sync live world & technology updates',
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

// Check for available OTA updates
app.get('/api/ota/check-updates', (_req: Request, res: Response) => {
  const currentVersion = _req.query.currentVersion as string || 'v1.0.0';
  const domain = _req.query.domain as string || 'all';

  const available = otaRepository.filter(patch => {
    if (patch.version === currentVersion) return false;
    if (domain !== 'all' && patch.domain !== domain && patch.domain !== 'general') return false;
    return true;
  });

  const latest = available.length > 0 ? available[available.length - 1] : null;

  res.json({
    hasUpdate: !!latest,
    currentVersion,
    latestPatch: latest,
    totalAvailablePatches: available.length,
    timestamp: new Date().toISOString(),
  });
});

// Download a specific OTA patch package
app.get('/api/ota/download-patch/:version', (req: Request, res: Response) => {
  const { version } = req.params;
  const patch = otaRepository.find(p => p.version === version);

  if (!patch) {
    return res.status(404).json({ error: 'OTA Patch version not found' });
  }

  res.json({
    status: 'success',
    patch,
    downloadedAt: new Date().toISOString(),
  });
});

// Publish a new custom OTA patch to the server registry
app.post('/api/ota/publish-patch', (req: Request, res: Response) => {
  const { version, domain, description, knowledgeItems } = req.body;

  if (!version || !knowledgeItems || !Array.isArray(knowledgeItems)) {
    return res.status(400).json({ error: 'Invalid patch payload. Version and knowledgeItems array required.' });
  }

  const payloadString = JSON.stringify(knowledgeItems);
  const sha256 = crypto.createHash('sha256').update(payloadString).digest('hex');
  const crc32 = calculateCrc32(payloadString);

  const newPatch: OtaPatch = {
    version,
    releaseDate: new Date().toISOString().split('T')[0],
    domain: domain || 'custom',
    description: description || `User-generated knowledge patch ${version}`,
    sizeBytes: payloadString.length * 2 + 1024,
    sha256,
    crc32,
    deltaWeights: { [`w_${Date.now()}`]: Math.random() * 2 - 1 },
    knowledgeItems,
  };

  otaRepository.push(newPatch);

  res.json({
    status: 'published',
    patch: newPatch,
    registrySize: otaRepository.length,
  });
});

// AI Edge Knowledge Compiler: Uses Gemini to synthesize optimized edge knowledge and OTA deltas
app.post('/api/edge/compile-update', async (req: Request, res: Response) => {
  const { prompt, topic, domain, currentVersion, existingVersion, targetChip } = req.body;
  const requirement = (prompt || topic || '').trim();
  const baseVersion = currentVersion || existingVersion || 'v1.0.0';

  if (!requirement) {
    return res.status(400).json({ error: 'Prompt or topic is required' });
  }

  try {
    const systemInstruction = `You are an advanced 2026 embedded edge AI firmware compiler and microcontroller systems engineer.
Convert the user's new technology requirement or equipment protocol into a compact, structured edge knowledge delta suitable for offline execution on modern microcontrollers (${targetChip || 'ESP32-S3, ESP32-P4, STM32N6, RP2350, nRF5340'}).
Format the output as clean JSON with these fields:
- newVersion: (string, e.g. "v1.4.0-patch", newer than ${baseVersion})
- summary: (concise description under 15 words)
- triggerKeywords: (array of 3-6 lowercase trigger phrases or sensor tokens that the offline tokenizer will match)
- responseText: (authoritative, direct, up-to-date edge response without repeating the question or outputting unrequested code)
- hardwareAction: (optional hardware GPIO action, e.g. "GPIO16_HIGH", "SERVO_30_DEG", "RELAY_SHUTOFF", or null)
- quantizedWeightDelta: (object with 2-3 synthetic float weights between -2.0 and 2.0 simulating neural weight updates)`;

    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Synthesize an up-to-date edge knowledge update for domain "${domain || 'advanced-tech'}" on ${targetChip || 'edge MCU'}. Requirement: ${requirement}`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const version = parsed.newVersion || `v1.${otaRepository.length + 1}.0-patch`;
    const payloadStr = JSON.stringify(parsed);
    const triggerStr = (parsed.triggerKeywords || []).join('|') || requirement.toLowerCase();

    const knowledgeItem = {
      id: `compiled-${Date.now()}`,
      trigger: (parsed.triggerKeywords || []).join(' or ') || requirement,
      category: 'AI Synthesized Rule',
      response: parsed.responseText || 'Edge protocol updated successfully.',
      urgency: 'high' as const,
    };

    const compiledPatch: OtaPatch = {
      version,
      releaseDate: new Date().toISOString().split('T')[0],
      domain: domain || 'advanced-tech',
      description: parsed.summary || 'AI-compiled edge delta update',
      sizeBytes: payloadStr.length + 2048,
      sha256: crypto.createHash('sha256').update(payloadStr).digest('hex'),
      crc32: calculateCrc32(payloadStr),
      deltaWeights: parsed.quantizedWeightDelta || { 'w_delta_compiled': 1.05 },
      knowledgeItems: [knowledgeItem],
    };

    otaRepository.push(compiledPatch);

    // Also include normalized fields expected by AutoOtaPipeline
    const patch = {
      version,
      title: parsed.summary || requirement.slice(0, 48),
      deltaSizeBytes: compiledPatch.sizeBytes,
      knowledgeDelta: [
        {
          triggerPattern: triggerStr,
          intent: 'AI_COMPILED_TECH_RULE',
          responseTemplate: knowledgeItem.response,
          actionCode: parsed.hardwareAction || undefined,
          category: 'Engineering',
        },
      ],
    };

    res.json({
      status: 'success',
      compiledPatch,
      patch,
      message: 'New delta update compiled and published to OTA registry. Connected edge devices will auto-sync on next interval.',
    });
  } catch (err: unknown) {
    console.error('Gemini compilation error:', err);
    res.status(500).json({
      error: 'Failed to compile edge model update',
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

// ASSF Frontier Solver Endpoint: Multilingual universal reasoning, personal Family Sub-AI,
// AI gadget automation, Python/B.Tech engineering verification, and automatic flash distillation.
app.post('/api/assf/solve', async (req: Request, res: Response) => {
  const {
    prompt,
    image,
    chipName = 'ESP32-S3',
    currentVersion = 'v1.0.0',
    language = 'auto',
    familyName = 'ASSF Live Family Network',
    activeMember,
    gadgets = [],
    conversationHistory = [],
    useLiveSearch = true,
    reasoningDepth = 'deep',
  } = req.body;

  if ((!prompt || typeof prompt !== 'string') && !image) {
    return res.status(400).json({ error: 'Prompt or image is required' });
  }

  try {
    const memberCtx = activeMember
      ? `Active Family Network: "${familyName}" | Active User: "${activeMember.name}" (${activeMember.role}) | Personal Sub-AI Name: "${activeMember.subAiName}" | Focus: "${activeMember.specialty}" | Gadget Permission Scope: "${activeMember.gadgetScope}"`
      : `Active Family Network: "${familyName}" | Personal Sub-AI: "ASSF-Core"`;

    const languageRule =
      language && language !== 'auto'
        ? `MANDATORY LANGUAGE RULE: You MUST write your entire human-facing response fluently, naturally, and accurately in "${language}". (Keep code blocks and the final JSON metadata block in standard syntax/English keys.)`
        : `MANDATORY LANGUAGE RULE: Automatically detect the language (and script, if applicable) of the user's message and respond fluently and accurately in that exact same language. If the user writes in Hinglish/romanized regional language or asks to speak in a specific language, honor it naturally.`;

    const gadgetListText = Array.isArray(gadgets) && gadgets.length > 0
      ? gadgets
          .map(
            (g: any) =>
              `- id="${g.id}" | name="${g.name}" | domain=${g.domain} | zone="${g.zone}" | power=${g.isOn ? 'ON' : 'OFF'} | ${g.metricLabel}=${g.metricValue}${g.unit} (range ${g.minVal}-${g.maxVal})`
          )
          .join('\n')
      : 'None connected.';

    const todayStr = new Date().toISOString().split('T')[0];

    const systemInstruction = `You are ASSF (Autonomous Silicon Self-Updating Framework), an advanced, up-to-date universal AI assistant (${todayStr}).

${memberCtx}
${languageRule}

DIRECT RESPONSE & ACCURACY RULES (MANDATORY):
1. Direct Answer First: Give the exact, direct answer immediately in the very first sentence. Keep answers clear, concise, and helpful.
2. NEVER Repeat the Question: Do NOT echo, quote, or restate the user's question (never write "You asked...", "Question:", "Problem Analysis:", or repeat their prompt).
3. NO Unrequested Code: Do NOT include code blocks, code syntax, or boilerplate templates unless the user explicitly asks for code, a program, a script, or a code example (asking conceptually about Python/Java/C++/Rust should be answered in plain prose without code unless code is requested).
4. Current & Advanced Technology: Stay current through ${todayStr}. When live search grounding is active, use up-to-date specs, modern frameworks (AI agents/MCP, edge NPUs, RISC-V RVV, Matter 1.4, Wi-Fi 7, Post-Quantum ML-KEM/ML-DSA, modern Rust/Python/C++23/Java 21+, SiC/GaN power electronics, solid-state BMS), and verified facts.
5. Personal Sub-AI Identity: Respond naturally as "${activeMember?.subAiName || 'ASSF-Core'}" helping ${activeMember?.name || 'the user'} (only mention your name if asked).
6. Visual Photo Inspection: If an image/photo is attached, state directly what is shown and give the exact answer or diagnosis without filler.
7. Household & Industrial AI Gadget Control: Connected AI Gadgets:
${gadgetListText}
If the user explicitly asks to turn on/off or adjust any gadget(s) AND their gadgetScope ("${activeMember?.gadgetScope || 'all'}") permits that domain, include a "gadgetCommands" array in the final JSON block. Otherwise leave "gadgetCommands" as [].
8. Creator & Attribution Rule: Whenever asked who created, built, made, owns, developed, or powers ASSF (or you), answer directly in the user's language: "ASSF was created by Fahadsha and ASSF Technology, powered by Gemini Argon."
9. Universal Build-Anything Capability: If the user asks you to BUILD, CREATE, MAKE, or DESIGN any website, online store, landing page, dashboard, calculator, booking tool, game, or interactive web app, confirm briefly in 1-2 direct sentences what you built and set "buildIntent.shouldBuild" to true with a clear "appTitle" and detailed "appPrompt" in the JSON block below so the interactive app renders immediately for them.
10. Prompt-to-Video Creation Capability: If the user asks you to MAKE, CREATE, GENERATE, or PRODUCE a VIDEO, reel, commercial, promo clip, explainer animation, or trailer about any topic, confirm concisely in 1-2 direct sentences what video you created and set "videoIntent.shouldCreateVideo" to true with a clear "videoPrompt" in the JSON block below so the interactive playable & downloadable .WebM video renders immediately inside the chat.

At the very end of your response, append this strict JSON block (hidden from the user by the app):
<<<ASSF_EDGE_DIFF>>>
{
  "trigger": "3-6 comma-separated lowercase keywords/phrases",
  "intent": "SHORT_UPPERCASE_INTENT",
  "compactSummary": "Concise 1-2 sentence direct answer for offline flash cache",
  "category": "B.Tech | Python | Java | C++ | Coding | Math | Physics | Science | World | Hardware | General",
  "gadgetCommands": [],
  "buildIntent": {
    "shouldBuild": false,
    "appTitle": "",
    "appPrompt": ""
  },
  "videoIntent": {
    "shouldCreateVideo": false,
    "videoPrompt": ""
  }
}
<<<END_ASSF_EDGE_DIFF>>>`;

    // Construct multimodal parts
    const userParts: any[] = [];
    if (image && typeof image === 'string') {
      let mimeType = 'image/jpeg';
      let data = image;
      const match = image.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        data = match[2];
      }
      userParts.push({
        inlineData: {
          mimeType,
          data,
        },
      });
    }

    const queryPrompt =
      prompt && prompt.trim()
        ? prompt.trim()
        : image
        ? 'Inspect this photo, identify any components/circuits/text/equations/objects depicted, and provide an accurate, complete solution.'
        : 'Provide system status.';

    const historyContext =
      Array.isArray(conversationHistory) && conversationHistory.length > 0
        ? `Recent conversation context:\n${conversationHistory
            .slice(-4)
            .map((m: any) => `${m.sender === 'user' ? 'User' : 'Sub-AI'}: ${String(m.text || '').slice(0, 260)}`)
            .join('\n')}\n\n`
        : '';

    userParts.push({
      text: `${historyContext}Current User Message: "${queryPrompt}". Target Silicon: ${chipName} (${currentVersion}).`,
    });

    let fullText = '';
    let sources: Array<{ title: string; uri: string }> = [];
    let retryCount = 0;
    const maxRetries = 2;
    let enableSearchTool = Boolean(useLiveSearch);

    const ai = getAiClient();
    const thinkingLevel = reasoningDepth === 'deep' ? ThinkingLevel.HIGH : ThinkingLevel.MEDIUM;

    while (retryCount <= maxRetries) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: [{ role: 'user', parts: userParts }],
          config: {
            systemInstruction,
            thinkingConfig: { thinkingLevel },
            ...(enableSearchTool ? { tools: [{ googleSearch: {} }] } : {}),
          },
        });
        fullText = response.text || '';

        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (Array.isArray(chunks)) {
          const seen = new Set<string>();
          sources = chunks
            .map((c: any) => c?.web)
            .filter((w: any) => w && typeof w.uri === 'string' && w.uri.startsWith('http'))
            .filter((w: any) => {
              if (seen.has(w.uri)) return false;
              seen.add(w.uri);
              return true;
            })
            .slice(0, 6)
            .map((w: any) => ({
              title: String(w.title || w.uri).slice(0, 90),
              uri: String(w.uri),
            }));
        }

        if (fullText) break;
      } catch (callErr: any) {
        retryCount++;
        // If search grounding failed on a call (e.g. quota or multimodal restriction), retry cleanly without search tool
        if (enableSearchTool && retryCount === 1) {
          enableSearchTool = false;
        }
        if (retryCount > maxRetries) {
          throw callErr;
        }
        await new Promise((r) => setTimeout(r, 600 * retryCount));
      }
    }

    // Extract distilled edge diff block
    let distilledDiff: any = null;
    let cleanSolution = fullText;

    const diffMatch = fullText.match(/<<<ASSF_EDGE_DIFF>>>([\s\S]*?)<<<END_ASSF_EDGE_DIFF>>>/);
    if (diffMatch && diffMatch[1]) {
      try {
        distilledDiff = JSON.parse(diffMatch[1].trim());
        cleanSolution = fullText.replace(/<<<ASSF_EDGE_DIFF>>>[\s\S]*?<<<END_ASSF_EDGE_DIFF>>>/, '').trim();
      } catch {
        // Fallback if parsing fails
      }
    }

    if (!distilledDiff) {
      distilledDiff = {
        trigger: queryPrompt.slice(0, 40).toLowerCase(),
        intent: 'GENERAL_SOLVE',
        compactSummary: cleanSolution.slice(0, 200),
        category: 'General',
        gadgetCommands: [],
        buildIntent: { shouldBuild: false, appTitle: '', appPrompt: '' },
        videoIntent: { shouldCreateVideo: false, videoPrompt: '' },
      };
    }

    // If the consumer asked ASSF to make/generate a video from a prompt, create the animated video project!
    let builtVideo: Awaited<ReturnType<typeof generateVideoProject>> | undefined;
    const shouldMakeVideoFromAi = Boolean(distilledDiff?.videoIntent?.shouldCreateVideo);
    const shouldMakeVideoFromPrompt = !image && detectVideoIntentFallback(queryPrompt);
    if (shouldMakeVideoFromAi || shouldMakeVideoFromPrompt) {
      try {
        const targetVideoPrompt =
          (distilledDiff?.videoIntent?.videoPrompt && String(distilledDiff.videoIntent.videoPrompt).trim()) ||
          queryPrompt;
        builtVideo = await generateVideoProject(targetVideoPrompt);
      } catch (vidErr) {
        console.warn('In-chat video build skipped due to error:', vidErr instanceof Error ? vidErr.message : String(vidErr));
      }
    }

    // If the consumer asked ASSF to build a website, store, calculator, dashboard, or app, generate it live!
    let builtApp: { appTitle: string; summary: string; htmlCode: string } | undefined;
    const shouldBuildFromAi = Boolean(distilledDiff?.buildIntent?.shouldBuild);
    const shouldBuildFromPrompt = !image && !builtVideo && detectBuildIntentFallback(queryPrompt);
    if (shouldBuildFromAi || shouldBuildFromPrompt) {
      try {
        const targetBuildPrompt =
          (distilledDiff?.buildIntent?.appPrompt && String(distilledDiff.buildIntent.appPrompt).trim()) ||
          queryPrompt;
        builtApp = await generateInteractiveWebApp(targetBuildPrompt);
      } catch (buildErr) {
        console.warn('In-chat app build skipped due to error:', buildErr instanceof Error ? buildErr.message : String(buildErr));
      }
    }

    // Auto-package into an OTA differential patch so chip can auto-sync it!
    const patchVersion = `v${currentVersion.replace('v', '')}.${otaRepository.length + 1}-diff`;
    const newKnowledgeId = `assf-diff-${Date.now()}`;
    const newKnowledgeItem = {
      id: newKnowledgeId,
      trigger: distilledDiff.trigger || queryPrompt.slice(0, 30),
      category: distilledDiff.category || 'General',
      response: `[ASSF OFFLINE FLASH CACHE]: ${distilledDiff.compactSummary || cleanSolution.slice(0, 180)}`,
      urgency: 'normal' as const,
    };

    const payloadStr = JSON.stringify(newKnowledgeItem);
    const autoPatch: OtaPatch = {
      version: patchVersion,
      releaseDate: new Date().toISOString().split('T')[0],
      domain: (distilledDiff.category || 'general').toLowerCase(),
      description: `Auto-distilled solution for: "${queryPrompt.slice(0, 30)}..."`,
      sizeBytes: payloadStr.length + 512,
      sha256: crypto.createHash('sha256').update(payloadStr).digest('hex'),
      crc32: calculateCrc32(payloadStr),
      deltaWeights: { [`w_solve_${Date.now()}`]: 0.95 },
      knowledgeItems: [newKnowledgeItem],
    };

    otaRepository.push(autoPatch);

    res.json({
      status: 'success',
      solution: cleanSolution,
      sources,
      liveGrounded: enableSearchTool,
      reasoningDepth,
      distilledDiff,
      autoPatch,
      builtApp,
      builtVideo,
      message: 'Frontier solution computed. Incremental knowledge delta generated for offline on-chip flash auto-update.',
    });
  } catch (err: unknown) {
    console.error('ASSF Solve error:', err);
    res.status(500).json({
      error: 'Failed to compute solution via ASSF engine',
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

// ASSF Creator, Analytics & App Builder Studio Endpoint
app.post('/api/assf/studio', async (req: Request, res: Response) => {
  const { mode, prompt, context } = req.body;

  if (!mode || !prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'mode and prompt are required' });
  }

  try {
    const ai = getAiClient();
    const todayStr = new Date().toISOString().split('T')[0];

    let systemInstruction = '';
    let userPrompt = prompt.trim();
    let useSearch = false;

    if (mode === 'poster') {
      systemInstruction = `You are a commercial graphic designer and conversion copywriter (${todayStr}).
Generate crisp, punchy poster copy for the user's request. Return ONLY valid JSON with exact keys:
{
  "brand": "short brand or organizer name (2-3 words)",
  "headline": "bold 3-6 word main headline",
  "subheadline": "concise 8-14 word value proposition",
  "badge": "short offer or category tag (e.g. NEW 2026, 30% OFF, LIVE DEMO)",
  "cta": "short 2-4 word call to action button/strip",
  "footerNote": "short venue, website, or date note",
  "theme": "cyan | indigo | emerald | sunset | ivory"
}`;
    } else if (mode === 'report') {
      useSearch = true;
      systemInstruction = `You are an executive business & technology analyst (${todayStr}).
Produce a clear, accurate, data-grounded report based on the user's request. Do not repeat the prompt.
Return ONLY valid JSON with exact keys:
{
  "title": "Report Title",
  "subtitle": "Concise 1-line scope & date",
  "executiveSummary": "2-3 sentence direct executive summary",
  "keyMetrics": [
    { "label": "Metric Name", "value": "Concrete Value", "trend": "+12% YoY or Stable" }
  ],
  "sections": [
    {
      "heading": "Section Heading",
      "analysis": "Direct 2-3 sentence analytical paragraph",
      "points": ["Specific finding 1", "Specific finding 2", "Specific finding 3"]
    }
  ],
  "recommendations": ["Actionable recommendation 1", "Actionable recommendation 2", "Actionable recommendation 3"]
}`;
    } else if (mode === 'video') {
      const videoData = await generateVideoProject(prompt.trim());
      return res.json({
        status: 'success',
        mode,
        data: videoData,
        sources: [],
      });
    } else if (mode === 'analytics') {
      useSearch = true;
      systemInstruction = `You are a senior Business Intelligence & Revenue Operations analyst (${todayStr}).
Analyze the provided business metrics and CSV summary to deliver concrete, actionable recommendations.
Return ONLY valid JSON with exact keys:
{
  "headline": "1-sentence core diagnosis",
  "executiveSummary": "2-3 sentence breakdown of revenue, margin, ROAS, and growth drivers",
  "risks": ["Specific operational/financial risk 1", "Specific risk 2"],
  "opportunities": ["High-ROI growth lever 1", "High-ROI growth lever 2", "Retention/pricing lever 3"],
  "actionPlan": [
    { "action": "Concrete step", "expectedImpact": "Quantified target outcome", "priority": "HIGH | MEDIUM" }
  ]
}`;
      userPrompt = `Business Request: ${prompt}\n\nComputed Dataset Summary:\n${JSON.stringify(context || {}, null, 2)}`;
    } else if (mode === 'website') {
      const existingHtml =
        context && typeof context.existingHtml === 'string' ? context.existingHtml : undefined;
      const appData = await generateInteractiveWebApp(prompt.trim(), existingHtml);
      return res.json({
        status: 'success',
        mode,
        data: appData,
        sources: [],
      });
    } else {
      return res.status(400).json({ error: `Unsupported studio mode: ${mode}` });
    }

    const runCall = async (withSearch: boolean) => {
      const studioThinking =
        mode === 'report' || mode === 'analytics' || mode === 'website'
          ? ThinkingLevel.HIGH
          : ThinkingLevel.MEDIUM;
      return await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: userPrompt,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: studioThinking },
          ...(!withSearch ? { responseMimeType: 'application/json' } : {}),
          ...(withSearch ? { tools: [{ googleSearch: {} }] } : {}),
        },
      });
    };

    let response;
    try {
      response = await runCall(useSearch);
    } catch (err) {
      if (useSearch) {
        useSearch = false;
        response = await runCall(false);
      } else {
        throw err;
      }
    }

    const rawText = (response.text || '').trim();
    let parsed: any = null;
    try {
      const cleaned = rawText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```$/i, '')
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Model did not return structured JSON output');
      }
    }

    let sources: Array<{ title: string; uri: string }> = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (Array.isArray(chunks)) {
      const seen = new Set<string>();
      sources = chunks
        .map((c: any) => c?.web)
        .filter((w: any) => w && typeof w.uri === 'string' && w.uri.startsWith('http'))
        .filter((w: any) => {
          if (seen.has(w.uri)) return false;
          seen.add(w.uri);
          return true;
        })
        .slice(0, 6)
        .map((w: any) => ({
          title: String(w.title || w.uri).slice(0, 90),
          uri: String(w.uri),
        }));
    }

    res.json({
      status: 'success',
      mode,
      data: parsed,
      sources,
    });
  } catch (err: unknown) {
    console.error('ASSF Studio error:', err);
    res.status(500).json({
      error: 'Failed to generate studio deliverable',
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

// Vite & Static Asset Setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ASSF AI Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
