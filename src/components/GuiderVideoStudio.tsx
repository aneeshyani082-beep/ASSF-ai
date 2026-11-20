import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MainTab } from './Header';
import { sound } from '../services/soundEffects';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
  ArrowRight,
  Compass,
  Send,
  Film,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export interface GuideChapter {
  id: string;
  number: string;
  title: string;
  targetTab: MainTab;
  durationSec: number;
  summary: string;
  narration: string;
  keyTakeaways: string[];
  accentColor: string;
}

export const GUIDE_CHAPTERS: GuideChapter[] = [
  {
    id: 'console',
    number: '01',
    title: 'AI Console · Any Language, Voice & Photo Vision',
    targetTab: 'console',
    durationSec: 8,
    summary: 'Talk or type in any language, snap photos with your camera, and get verified answers aloud.',
    narration:
      'Welcome to ASSF. In the AI Console, anyone can type, speak using the microphone, or snap a photo of homework, math, or a circuit board. Pick any world language and ASSF replies accurately in text and voice.',
    keyTakeaways: [
      'Select any language (English, Hindi, Tamil, Spanish, Arabic & more)',
      'Click Camera or Upload Photo to inspect circuits, equations, or objects',
      'Toggle Voice Reply ON for natural spoken conversations',
    ],
    accentColor: '#22d3ee',
  },
  {
    id: 'family',
    number: '02',
    title: 'Live Family AI · Personal Sub-AI for Every Person',
    targetTab: 'family',
    durationSec: 8,
    summary: 'Name your Family AI Network and create a personal Sub-AI for each family member or operator.',
    narration:
      'In Family and Sub-AI, name your Live Family Network and add members like parents, students, or engineers. Each person gets their own named Sub-AI with their preferred language, voice tone, and gadget permissions.',
    keyTakeaways: [
      'Give your Live Family AI Network a custom name',
      'Add members with unique Sub-AI names like Aura-Home or Sigma-Tutor',
      'Each Sub-AI keeps its own private chat history and language profile',
    ],
    accentColor: '#34d399',
  },
  {
    id: 'gadgets',
    number: '03',
    title: 'AI Gadgets · Household Work & Industrial Machines',
    targetTab: 'gadgets',
    durationSec: 8,
    summary: 'Control home appliances and factory equipment manually or with plain voice/text commands.',
    narration:
      'ASSF connects to both household gadgets like vacuum bots, air conditioners, and kitchen induction stoves, and industrial machines like CNC spindles and boilers. Tell ASSF what to do in everyday words and watch devices respond.',
    keyTakeaways: [
      'Switch between Household Work and Industrial Work equipment',
      'Adjust power, temperature, suction, or RPM with live sliders',
      'Role-based permission scopes keep industrial machines safe',
    ],
    accentColor: '#fbbf24',
  },
  {
    id: 'python',
    number: '04',
    title: 'Python Tools · Verified Engineering Workbench',
    targetTab: 'python',
    durationSec: 8,
    summary: 'Solve Circuits, PID Control, Fluids, Beam Stress & DSP math with downloadable Python scripts.',
    narration:
      'The Python Tools section helps engineers and B.Tech students compute exact answers for RLC circuits, PID control loops, pipe fluid flow, beam deflection, and Modbus CRC-16 frames, with clean Python 3 scripts ready to download.',
    keyTakeaways: [
      'Enter real engineering inputs for instant exact formulas and results',
      'Copy or download clean, PEP-8 runnable Python 3 (.py) scripts',
      'Send any problem to ASSF for custom Python tool generation',
    ],
    accentColor: '#a78bfa',
  },
  {
    id: 'telemetry',
    number: '05',
    title: 'Telemetry Ribbon · Live CPU & Power Oscilloscope',
    targetTab: 'console',
    durationSec: 8,
    summary: 'See real-time chip CPU load (%) and electrical power (mW) impact during every AI task.',
    narration:
      'Look at the Telemetry Ribbon at the top. The live CPU and Power graph pulses whenever ASSF thinks or inspects a photo. Click the mini graph to open the full oscilloscope and check milliwatts, current, and energy per task.',
    keyTakeaways: [
      'Cyan line tracks CPU utilization %; Amber line tracks Power draw in mW',
      'Click the sparkline graph in the top ribbon to expand full oscilloscope',
      'Hover over the waveform to inspect historical samples and energy (mJ)',
    ],
    accentColor: '#38bdf8',
  },
  {
    id: 'hardware',
    number: '06',
    title: 'Silicon & OTA · On-Chip Pinout, Auto-Update & C++ Export',
    targetTab: 'hardware',
    durationSec: 8,
    summary: 'Inspect microcontroller pins, run A/B OTA flash updates, and export C++ / Knowledge files.',
    narration:
      'Finally, Silicon and OTA lets you choose chips like ESP32-S3 or STM32H7, inspect GPIO pins, test safe dual-partition OTA updates that never brick your chip, and export C++ firmware or JSON and CSV knowledge datasets.',
    keyTakeaways: [
      'Switch between ESP32-S3, ESP32-P4, STM32N6, RP2350, and K210 chips',
      'Safe A/B dual-bank OTA updates with SHA-256 verification and rollback',
      'Download turnkey C++ firmware ZIPs and standalone Knowledge files',
    ],
    accentColor: '#f472b6',
  },
  {
    id: 'studio',
    number: '07',
    title: 'Creator & Biz · Posters, Reports, Video, Analytics & Store Builder',
    targetTab: 'studio',
    durationSec: 8,
    summary: 'Create marketing posters, reports, promo videos, business analytics, and product-selling websites.',
    narration:
      'In Creator and Biz Studio, design export-ready posters in PNG, build executive reports with live web citations, render animated promo videos, analyze business profit and ROAS, and generate working online stores and web apps.',
    keyTakeaways: [
      'Poster Designer exports crisp PNG flyers in multiple sizes',
      'Video Studio records animated multi-scene .webm promo videos',
      'Store & App Builder previews live e-commerce websites with working carts',
    ],
    accentColor: '#38bdf8',
  },
];

const GUIDER_FAQ: { question: string; answer: string; actionTab?: MainTab; actionLabel?: string }[] = [
  {
    question: 'How do I talk in my own language (Hindi, Tamil, Spanish, etc.)?',
    answer:
      'Go to AI Console → look at the Language dropdown at the top bar → pick any of the 24 languages (or type a custom one). Click the Microphone button to speak, and toggle "Voice Reply: ON" so ASSF speaks back to you in that language!',
    actionTab: 'console',
    actionLabel: 'Open AI Console',
  },
  {
    question: 'How do I create a Live Family AI and add members?',
    answer:
      'Open "Family & Sub-AI" from the top menu. Click the pencil icon next to the Family Name to name your family network. Then fill out the "Add Family Member & Personal Sub-AI" form on the left with their name, Sub-AI name, language, and gadget access.',
    actionTab: 'family',
    actionLabel: 'Open Family & Sub-AI',
  },
  {
    question: 'How do I control home or factory AI gadgets?',
    answer:
      'Open "AI Gadgets" to toggle devices manually or adjust sliders. You can also just tell ASSF in the AI Console (e.g., "Turn on vacuum bot and set AC to 22°C" or "Set CNC spindle to 2400 RPM") and ASSF executes it automatically!',
    actionTab: 'gadgets',
    actionLabel: 'Open AI Gadgets',
  },
  {
    question: 'How do I get help with a photo, circuit, or handwritten math?',
    answer:
      'In the AI Console, click the Camera icon to snap a live photo or the Image icon to upload one from your device. Type your question (or leave blank to auto-inspect) and press Send.',
    actionTab: 'console',
    actionLabel: 'Try Camera / Photo',
  },
  {
    question: 'Where are the Python tools for engineers?',
    answer:
      'Open "Python Tools" in the top menu. Pick a module (Circuits & Buck, Control & PID, Fluid Mechanics, Beam Mechanics, or Embedded DSP & Modbus), enter your numbers, view exact results immediately, and download the verified .py file.',
    actionTab: 'python',
    actionLabel: 'Open Python Tools',
  },
  {
    question: 'Does ASSF work offline on a real chip?',
    answer:
      'Yes! Toggle "AIR-GAPPED OFFLINE" in the top bar anytime. ASSF runs math, local flash knowledge, and gadget commands 100% offline. You can also export ready-to-flash C++ firmware in "Silicon & OTA".',
    actionTab: 'hardware',
    actionLabel: 'Open Silicon & OTA',
  },
  {
    question: 'How do I create posters, reports, videos, analytics, or a shopping website?',
    answer:
      'Open "Creator & Biz" in the top bar. Pick Poster Designer (PNG), Report Builder (HTML/Markdown), Video Studio (.WebM video), Business Analytics (CSV + AI insights), or Store & App Builder (live product website with cart).',
    actionTab: 'studio',
    actionLabel: 'Open Creator & Biz',
  },
];

interface GuiderVideoStudioProps {
  isOpen: boolean;
  initialChapterId?: string;
  onClose: () => void;
  onNavigateTab: (tab: MainTab) => void;
}

export const GuiderVideoStudio: React.FC<GuiderVideoStudioProps> = ({
  isOpen,
  initialChapterId,
  onClose,
  onNavigateTab,
}) => {
  const [chapterIndex, setChapterIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [chapterElapsed, setChapterElapsed] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 1.25 | 1.5>(1);
  const [narrationEnabled, setNarrationEnabled] = useState(false);

  // Interactive Guider Q&A state
  const [guiderInput, setGuiderInput] = useState('');
  const [guiderMessages, setGuiderMessages] = useState<
    { id: string; sender: 'user' | 'guider'; text: string; actionTab?: MainTab; actionLabel?: string }[]
  >([
    {
      id: 'g-welcome',
      sender: 'guider',
      text: 'Hi! I am the ASSF Guider Assistant. Watch the animated video demonstration on the left to see every section in action, or ask me any question below in plain words.',
    },
  ]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeChapter = GUIDE_CHAPTERS[chapterIndex] || GUIDE_CHAPTERS[0];

  // Jump to requested chapter whenever opened with initialChapterId
  useEffect(() => {
    if (!isOpen) return;
    if (initialChapterId) {
      const idx = GUIDE_CHAPTERS.findIndex((c) => c.id === initialChapterId);
      if (idx >= 0) {
        setChapterIndex(idx);
        setChapterElapsed(0);
        setIsPlaying(true);
      }
    }
  }, [isOpen, initialChapterId]);

  // Narration SpeechSynthesis when enabled and chapter changes
  const speakNarration = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.03;
    utter.pitch = 1.0;
    window.speechSynthesis.speak(utter);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      return;
    }
    if (narrationEnabled && isPlaying) {
      speakNarration(activeChapter.narration);
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, [isOpen, chapterIndex, narrationEnabled, isPlaying, activeChapter.narration, speakNarration]);

  // Playback timer advancing timeline smoothly
  useEffect(() => {
    if (!isOpen || !isPlaying) return;

    const tickMs = 50;
    const timer = setInterval(() => {
      setChapterElapsed((prev) => {
        const next = prev + (tickMs / 1000) * playbackSpeed;
        if (next >= activeChapter.durationSec) {
          if (chapterIndex < GUIDE_CHAPTERS.length - 1) {
            setChapterIndex((i) => i + 1);
            return 0;
          } else {
            setIsPlaying(false);
            return activeChapter.durationSec;
          }
        }
        return next;
      });
    }, tickMs);

    return () => clearInterval(timer);
  }, [isOpen, isPlaying, playbackSpeed, chapterIndex, activeChapter.durationSec]);

  // 60fps Interactive Video Demonstration Canvas Renderer
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame = 0;
    const startTime = performance.now();

    const drawScene = (now: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(320, rect.width);
      const h = Math.max(200, rect.height);

      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Background dark blueprint grid
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(30, 41, 59, 0.55)';
      ctx.lineWidth = 1;
      const step = 28;
      for (let gx = 0; gx < w; gx += step) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, h);
        ctx.stroke();
      }
      for (let gy = 0; gy < h; gy += step) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
      }

      const t = isPlaying ? (now - startTime) / 1000 : chapterElapsed;
      const progress = Math.min(1, chapterElapsed / activeChapter.durationSec);
      const accent = activeChapter.accentColor;

      // Helper for crisp rounded card
      const roundRect = (x: number, y: number, rw: number, rh: number, r: number, fill: string, stroke: string) => {
        ctx.beginPath();
        ctx.roundRect(x, y, rw, rh, r);
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      };

      // Helper for animated signal pulse dot along line
      const drawPulse = (x1: number, y1: number, x2: number, y2: number, speed: number, color: string) => {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
        ctx.lineWidth = 2;
        ctx.stroke();

        const p = (t * speed) % 1;
        const px = x1 + (x2 - x1) * p;
        const py = y1 + (y2 - y1) * p;
        ctx.beginPath();
        ctx.arc(px, py, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      };

      const cx = w / 2;
      const cy = h / 2 - 10;

      // Chapter-specific Visual Demonstration Animations
      if (activeChapter.id === 'console') {
        // Left: Multimodal Inputs (Voice, Camera, Any Language) -> Center ASSF Core -> Right Verified Reply
        roundRect(24, cy - 64, 138, 38, 8, '#0f172a', '#22d3ee');
        roundRect(24, cy - 16, 138, 38, 8, '#0f172a', '#a78bfa');
        roundRect(24, cy + 32, 138, 38, 8, '#0f172a', '#34d399');

        ctx.fillStyle = '#e2e8f0';
        ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('Voice Mic (Any Lang)', 34, cy - 41);
        ctx.fillText('Camera / Photo Snap', 34, cy + 7);
        ctx.fillText('Text / B.Tech Question', 34, cy + 55);

        drawPulse(162, cy - 45, cx - 50, cy + 4, 0.9, '#22d3ee');
        drawPulse(162, cy + 3, cx - 50, cy + 4, 1.1, '#a78bfa');
        drawPulse(162, cy + 51, cx - 50, cy + 4, 0.8, '#34d399');

        // Center Core
        const pulseScale = 1 + Math.sin(t * 4) * 0.04;
        roundRect(cx - 50 * pulseScale, cy - 42 * pulseScale, 100 * pulseScale, 88 * pulseScale, 14, '#082f49', accent);
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 15px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('ASSF AI', cx, cy);
        ctx.font = '500 10px "JetBrains Mono", monospace';
        ctx.fillStyle = '#67e8f9';
        ctx.fillText('24+ Languages', cx, cy + 18);

        drawPulse(cx + 50, cy + 4, w - 172, cy - 18, 1.0, '#22d3ee');
        drawPulse(cx + 50, cy + 4, w - 172, cy + 30, 0.85, '#34d399');

        roundRect(w - 172, cy - 42, 148, 44, 8, '#0f172a', '#22d3ee');
        roundRect(w - 172, cy + 10, 148, 44, 8, '#0f172a', '#34d399');
        ctx.textAlign = 'left';
        ctx.fillStyle = '#f8fafc';
        ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('Verified Step Answer', w - 160, cy - 16);
        ctx.fillText('Audio Voice Reply', w - 160, cy + 36);
      } else if (activeChapter.id === 'family') {
        // Center Family Core Hub spawning 3 Sub-AI Member Nodes
        roundRect(cx - 78, 28, 156, 44, 10, '#064e3b', '#34d399');
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 12px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('Live Family AI Network', cx, 54);

        const nodes = [
          { x: cx - 170, name: 'Dad · ASSF-Core', lang: 'English · All Gadgets', color: '#22d3ee' },
          { x: cx, name: 'Mom · Aura-Home', lang: 'Hindi · Home Gadgets', color: '#34d399' },
          { x: cx + 170, name: 'Student · Sigma', lang: 'Tamil · B.Tech Tutor', color: '#fbbf24' },
        ];
        nodes.forEach((n, idx) => {
          const nx = Math.max(85, Math.min(w - 85, n.x));
          drawPulse(cx, 72, nx, cy + 10, 0.75 + idx * 0.15, n.color);
          roundRect(nx - 72, cy + 10, 144, 64, 10, '#0f172a', n.color);
          ctx.textAlign = 'center';
          ctx.fillStyle = '#f8fafc';
          ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
          ctx.fillText(n.name, nx, cy + 36);
          ctx.fillStyle = '#94a3b8';
          ctx.font = '500 10px "JetBrains Mono", monospace';
          ctx.fillText(n.lang, nx, cy + 56);
        });
      } else if (activeChapter.id === 'gadgets') {
        // Left Command -> Center Bus -> Household + Industrial Gadgets toggling ON
        roundRect(24, cy - 28, 150, 56, 10, '#0f172a', '#22d3ee');
        ctx.textAlign = 'center';
        ctx.fillStyle = '#e0f2fe';
        ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('"Start Vacuum &', 99, cy - 4);
        ctx.fillText('Set CNC 2400 RPM"', 99, cy + 12);

        const devices = [
          { y: cy - 68, title: 'Floor Vacuum Bot · ON (85%)', col: '#34d399' },
          { y: cy - 22, title: 'Smart AC · Cooling 22°C', col: '#22d3ee' },
          { y: cy + 24, title: 'CNC Spindle · 2400 RPM', col: '#fbbf24' },
          { y: cy + 70, title: 'Boiler Valve · 95 PSI Safe', col: '#fb923c' },
        ];
        devices.forEach((d, idx) => {
          const isLit = (progress * 4) > idx * 0.7;
          drawPulse(174, cy, w - 210, d.y + 16, 0.9 + idx * 0.1, d.col);
          roundRect(w - 210, d.y, 186, 34, 8, isLit ? '#0f172a' : '#020617', isLit ? d.col : '#334155');
          ctx.textAlign = 'left';
          ctx.fillStyle = isLit ? '#ffffff' : '#64748b';
          ctx.font = '600 11px "JetBrains Mono", monospace';
          ctx.fillText(d.title, w - 198, d.y + 21);
        });
      } else if (activeChapter.id === 'python') {
        // Inputs -> Math Solver -> Clean Python Script Box
        roundRect(26, cy - 52, 162, 104, 10, '#0f172a', '#a78bfa');
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ddd6fe';
        ctx.font = '600 11px "JetBrains Mono", monospace';
        ctx.fillText('Engineering Inputs:', 38, cy - 28);
        ctx.fillStyle = '#f8fafc';
        ctx.fillText('R = 12 Ω', 38, cy - 6);
        ctx.fillText('L = 4.7 mH', 38, cy + 14);
        ctx.fillText('C = 10 µF', 38, cy + 34);

        drawPulse(188, cy, cx - 10, cy, 1.0, '#a78bfa');

        roundRect(cx - 10, cy - 64, w - cx - 16, 128, 10, '#0b1120', '#22d3ee');
        ctx.fillStyle = '#34d399';
        ctx.font = '600 11px "JetBrains Mono", monospace';
        ctx.fillText('# Verified Python 3 Output', cx + 4, cy - 42);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText('f0 = 1 / (2*pi*sqrt(L*C))', cx + 4, cy - 20);
        ctx.fillText('-> Resonant: 734.13 Hz', cx + 4, cy + 2);
        ctx.fillText('-> Q-Factor: 1.806', cx + 4, cy + 24);
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('[Download .py Ready]', cx + 4, cy + 48);
      } else if (activeChapter.id === 'telemetry') {
        // Animated Oscilloscope Waves (CPU Cyan + Power Amber)
        roundRect(28, 32, w - 56, h - 84, 10, '#090f1e', '#334155');

        ctx.beginPath();
        for (let x = 40; x < w - 40; x += 6) {
          const norm = (x - 40) / (w - 80);
          const burst = Math.exp(-Math.pow((norm - ((t * 0.28) % 1)) * 9, 2)) * 55;
          const y = cy + 28 - burst - Math.sin(x * 0.08 + t * 5) * 6;
          if (x === 40) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2.4;
        ctx.stroke();

        ctx.beginPath();
        for (let x = 40; x < w - 40; x += 6) {
          const norm = (x - 40) / (w - 80);
          const burst = Math.exp(-Math.pow((norm - ((t * 0.28) % 1)) * 9, 2)) * 42;
          const y = cy + 36 - burst - Math.cos(x * 0.06 + t * 4) * 4;
          if (x === 40) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2.2;
        ctx.stroke();

        ctx.textAlign = 'left';
        ctx.fillStyle = '#22d3ee';
        ctx.font = '600 11px "JetBrains Mono", monospace';
        ctx.fillText('CPU Load (%) · Spike during inference', 44, 54);
        ctx.fillStyle = '#fbbf24';
        ctx.fillText('Power Draw (mW) · Instant energy impact', 44, 72);
      } else {
        // Hardware & A/B OTA Partition Swap + C++ Export
        roundRect(28, cy - 48, 148, 96, 10, '#0f172a', '#22d3ee');
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 12px "JetBrains Mono", monospace';
        ctx.fillText('OTA_0 Active', 102, cy - 10);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '500 10px "JetBrains Mono", monospace';
        ctx.fillText('Safe Running', 102, cy + 12);

        drawPulse(176, cy, cx + 10, cy, 0.9, '#f472b6');

        roundRect(cx + 10, cy - 48, 160, 96, 10, '#0f172a', '#f472b6');
        ctx.fillStyle = '#fbcfe8';
        ctx.font = '700 12px "JetBrains Mono", monospace';
        ctx.fillText('OTA_1 Verified', cx + 90, cy - 10);
        ctx.fillStyle = '#34d399';
        ctx.font = '500 10px "JetBrains Mono", monospace';
        ctx.fillText('SHA-256 · Zero Brick', cx + 90, cy + 12);

        if (w > 500) {
          drawPulse(cx + 170, cy, w - 140, cy, 1.1, '#34d399');
          roundRect(w - 140, cy - 36, 114, 72, 10, '#0f172a', '#34d399');
          ctx.fillStyle = '#ffffff';
          ctx.font = '600 11px "JetBrains Mono", monospace';
          ctx.fillText('C++ / JSON', w - 83, cy - 4);
          ctx.fillText('Export ZIP', w - 83, cy + 14);
        }
      }

      // Video Player Top Overlay Label
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(2, 6, 23, 0.8)';
      ctx.fillRect(12, 10, 210, 22);
      ctx.fillStyle = accent;
      ctx.font = '700 10px "JetBrains Mono", monospace';
      ctx.fillText(`DEMO SCENE ${activeChapter.number} / 06 · LIVE`, 18, 25);

      ctx.restore();
      animFrame = requestAnimationFrame(drawScene);
    };

    animFrame = requestAnimationFrame(drawScene);
    return () => cancelAnimationFrame(animFrame);
  }, [isOpen, isPlaying, chapterElapsed, activeChapter]);

  // Interactive Guider Q&A Handler
  const handleAskGuider = (textOverride?: string) => {
    const q = (textOverride ?? guiderInput).trim();
    if (!q) return;
    sound.playFlashTick();
    if (!textOverride) setGuiderInput('');

    const userMsg = { id: `gu-${Date.now()}`, sender: 'user' as const, text: q };
    const lower = q.toLowerCase();

    if (
      lower.includes('who created') ||
      lower.includes('who made') ||
      lower.includes('who built') ||
      lower.includes('created by') ||
      lower.includes('creator') ||
      lower.includes('founder')
    ) {
      setGuiderMessages((prev) => [
        ...prev,
        userMsg,
        {
          id: `ga-${Date.now() + 1}`,
          sender: 'guider',
          text: 'ASSF was created by Fahadsha and ASSF Technology, powered by Gemini Argon.',
        },
      ]);
      return;
    }

    let matched = GUIDER_FAQ.find(
      (f) =>
        (lower.includes('lang') && f.actionTab === 'console' && f.question.includes('language')) ||
        (lower.includes('family') && f.actionTab === 'family') ||
        (lower.includes('sub') && f.actionTab === 'family') ||
        (lower.includes('gadget') && f.actionTab === 'gadgets') ||
        (lower.includes('home') && f.actionTab === 'gadgets') ||
        (lower.includes('indus') && f.actionTab === 'gadgets') ||
        (lower.includes('photo') && f.question.includes('photo')) ||
        (lower.includes('camera') && f.question.includes('photo')) ||
        (lower.includes('python') && f.actionTab === 'python') ||
        (lower.includes('chip') && f.actionTab === 'hardware') ||
        (lower.includes('offline') && f.actionTab === 'hardware') ||
        ((lower.includes('poster') || lower.includes('report') || lower.includes('video') || lower.includes('analytics') || lower.includes('website') || lower.includes('store') || lower.includes('studio')) && f.actionTab === 'studio')
    );

    if (!matched) {
      matched = {
        question: q,
        answer:
          'You can ask any question directly in the AI Console (text, voice mic, or camera photo), build posters/reports/videos/analytics/websites in Creator & Biz, create personal Sub-AIs in Family & Sub-AI, control home/factory devices in AI Gadgets, or generate engineering scripts in Python Tools. Click any chapter on the left to watch its animated demonstration!',
        actionTab: 'console',
        actionLabel: 'Go to AI Console',
      };
    }

    setGuiderMessages((prev) => [
      ...prev,
      userMsg,
      {
        id: `ga-${Date.now() + 1}`,
        sender: 'guider',
        text: matched!.answer,
        actionTab: matched!.actionTab,
        actionLabel: matched!.actionLabel,
      },
    ]);
  };

  if (!isOpen) return null;

  const totalDuration = GUIDE_CHAPTERS.reduce((acc, c) => acc + c.durationSec, 0);
  const completedDuration =
    GUIDE_CHAPTERS.slice(0, chapterIndex).reduce((acc, c) => acc + c.durationSec, 0) + chapterElapsed;
  const globalPercent = Math.min(100, (completedDuration / totalDuration) * 100);

  const fmtTime = (sec: number) => {
    const s = Math.floor(sec);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="fixed inset-0 z-[90] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-label="ASSF Video Demonstration & Guider Assistant"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-6xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Top Modal Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Film className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                ASSF Interactive Video Guide & Helper Assistant
              </h2>
              <p className="text-xs text-slate-400 hidden sm:block">
                Watch step-by-step animated demonstrations of every section or ask the Guider Assistant anything.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition-colors"
            aria-label="Close Video Guide"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Main 2-Column Body: Video Stage Left | Guider Assistant Right */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12">
          {/* Left: Video Player & Chapters (7 cols) */}
          <div className="lg:col-span-7 p-4 sm:p-5 space-y-4 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col">
            {/* Video Stage */}
            <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
              <canvas
                ref={canvasRef}
                className="w-full h-56 sm:h-64 block"
              />

              {/* Live Subtitle Caption Overlay */}
              <div className="bg-slate-950/95 border-t border-slate-800 px-4 py-2.5 text-xs text-slate-200 leading-relaxed">
                <span className="text-cyan-400 font-semibold mr-2">Narration:</span>
                <span>{activeChapter.narration}</span>
              </div>
            </div>

            {/* Video Scrubber & Controls */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2.5">
              {/* Progress Bar */}
              <div
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  const targetSec = pct * activeChapter.durationSec;
                  setChapterElapsed(targetSec);
                }}
                className="w-full h-2 bg-slate-800 rounded-full overflow-hidden cursor-pointer"
                title="Click to seek within current demonstration chapter"
              >
                <div
                  className="h-full bg-cyan-400 transition-all duration-75"
                  style={{ width: `${Math.min(100, (chapterElapsed / activeChapter.durationSec) * 100)}%` }}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setChapterIndex((i) => Math.max(0, i - 1));
                      setChapterElapsed(0);
                    }}
                    disabled={chapterIndex === 0}
                    className="p-1.5 rounded-md bg-slate-900 hover:bg-slate-800 disabled:opacity-35 text-slate-200 border border-slate-800"
                    title="Previous Chapter"
                  >
                    <SkipBack className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!isPlaying && chapterElapsed >= activeChapter.durationSec) {
                        setChapterElapsed(0);
                      }
                      setIsPlaying((p) => !p);
                    }}
                    className="px-3 py-1.5 rounded-md bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold flex items-center gap-1.5"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{isPlaying ? 'Pause' : 'Play'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setChapterIndex((i) => Math.min(GUIDE_CHAPTERS.length - 1, i + 1));
                      setChapterElapsed(0);
                    }}
                    disabled={chapterIndex === GUIDE_CHAPTERS.length - 1}
                    className="p-1.5 rounded-md bg-slate-900 hover:bg-slate-800 disabled:opacity-35 text-slate-200 border border-slate-800"
                    title="Next Chapter"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>

                  <span className="ml-2 text-slate-400 tabular-nums text-[11px]">
                    {fmtTime(completedDuration)} / {fmtTime(totalDuration)} ({globalPercent.toFixed(0)}%)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPlaybackSpeed((s) => (s === 1 ? 1.25 : s === 1.25 ? 1.5 : 1))
                    }
                    className="px-2 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-[11px] tabular-nums"
                    title="Playback Speed"
                  >
                    {playbackSpeed}x
                  </button>

                  <button
                    type="button"
                    onClick={() => setNarrationEnabled((v) => !v)}
                    className={`px-2.5 py-1 rounded-md border text-[11px] flex items-center gap-1.5 transition-colors ${
                      narrationEnabled
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    {narrationEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                    <span>{narrationEnabled ? 'Voiceover ON' : 'Voiceover OFF'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Active Chapter Takeaways & Jump Button */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-semibold text-white">
                  {activeChapter.number}. {activeChapter.title}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onNavigateTab(activeChapter.targetTab);
                    onClose();
                  }}
                  className="px-3 py-1.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <span>Open Section</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <ul className="space-y-1 text-xs text-slate-300">
                {activeChapter.keyTakeaways.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Chapter Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {GUIDE_CHAPTERS.map((ch, idx) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => {
                    setChapterIndex(idx);
                    setChapterElapsed(0);
                    setIsPlaying(true);
                  }}
                  className={`p-2 rounded-lg border text-left transition-colors ${
                    idx === chapterIndex
                      ? 'bg-cyan-950/50 border-cyan-400 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="text-[10px] font-mono text-cyan-400">Chapter {ch.number}</div>
                  <div className="text-xs font-medium truncate">{ch.title.split('·')[0].trim()}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Right: Friendly Guider Assistant Q&A (5 cols) */}
          <div className="lg:col-span-5 p-4 sm:p-5 flex flex-col justify-between gap-4 bg-slate-950/40">
            <div className="space-y-3 flex-1 flex flex-col min-h-0">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
                <Compass className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">ASSF Guider Assistant</h3>
                <span className="text-[11px] font-mono text-slate-400 ml-auto">Plain-Language Guide</span>
              </div>

              {/* Quick Guide Questions */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-mono text-slate-400">Common questions from new users:</div>
                <div className="flex flex-wrap gap-1.5">
                  {GUIDER_FAQ.map((faq, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleAskGuider(faq.question)}
                      className="text-left px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 hover:text-cyan-300 transition-colors"
                    >
                      {faq.question}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Thread */}
              <div className="flex-1 min-h-[180px] max-h-[260px] overflow-y-auto space-y-2.5 pr-1">
                {guiderMessages.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-xl p-3 text-xs leading-relaxed ${
                      m.sender === 'user'
                        ? 'bg-cyan-950/60 border border-cyan-500/30 text-cyan-100 ml-6'
                        : 'bg-slate-900 border border-slate-800 text-slate-200 mr-4'
                    }`}
                  >
                    <div className="text-[10px] font-mono text-slate-400 mb-1 flex items-center gap-1">
                      {m.sender === 'guider' && <Sparkles className="w-3 h-3 text-emerald-400" />}
                      <span>{m.sender === 'user' ? 'You' : 'ASSF Guider'}</span>
                    </div>
                    <p>{m.text}</p>
                    {m.actionTab && (
                      <button
                        type="button"
                        onClick={() => {
                          onNavigateTab(m.actionTab!);
                          onClose();
                        }}
                        className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold text-[11px]"
                      >
                        <span>{m.actionLabel || 'Open Section'}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Guider Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAskGuider();
              }}
              className="flex items-center gap-2 pt-2 border-t border-slate-800"
            >
              <input
                type="text"
                value={guiderInput}
                onChange={(e) => setGuiderInput(e.target.value)}
                placeholder="Ask Guider how any section works..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                disabled={!guiderInput.trim()}
                className="px-3.5 py-2 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 text-slate-950 font-semibold text-xs rounded-lg flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Ask</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
