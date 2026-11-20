import { BuiltVideoProject, VideoPalette, VideoScene, VideoVisualStyle } from '../types/edge';

export function isVideoRequestPrompt(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  const actionVerb = /\b(make|create|build|generate|produce|render|animate|design|craft)\b/.test(lower);
  const videoNoun =
    /\b(video|videos|reel|reels|short|shorts|trailer|commercial|promo video|explainer video|animation|storyboard|clip)\b/.test(
      lower
    );
  return actionVerb && videoNoun;
}

export function detectAspectRatioFromPrompt(prompt: string): '16:9' | '9:16' {
  const lower = prompt.toLowerCase();
  if (/\b(9:16|vertical|reel|reels|short|shorts|tiktok|instagram story|portrait)\b/.test(lower)) {
    return '9:16';
  }
  return '16:9';
}

export function buildOfflineVideoProject(prompt: string): BuiltVideoProject {
  const clean = prompt.trim() || 'ASSF Advanced AI Showcase';
  const aspectRatio = detectAspectRatioFromPrompt(clean);
  const shortTopic = clean
    .replace(/^(make|create|build|generate|produce|design)\s+(a\s+)?(short\s+)?(video|reel|promo|explainer|clip)?\s*(about|on|for|of)?\s*/i, '')
    .trim()
    .slice(0, 44) || 'Custom AI Video';

  const titleCase = shortTopic.charAt(0).toUpperCase() + shortTopic.slice(1);

  const scenes: VideoScene[] = [
    {
      title: 'Scene 01 · Hook',
      headline: titleCase,
      caption: `Opening spotlight crafted by ASSF Advanced AI Director.`,
      metricBadge: 'INTRO',
      voiceover: `Welcome to ${titleCase}. Here is a visual overview created from your prompt.`,
      durationSec: 4,
      palette: 'cyan',
      visualStyle: 'orbits',
    },
    {
      title: 'Scene 02 · Core Innovation',
      headline: 'Built For Real Impact',
      caption: clean.slice(0, 72) + (clean.length > 72 ? '...' : ''),
      metricBadge: 'KEY INSIGHT',
      voiceover: `Let us explore the core idea: ${clean.slice(0, 110)}.`,
      durationSec: 4,
      palette: 'violet',
      visualStyle: 'particles',
    },
    {
      title: 'Scene 03 · Performance & Scale',
      headline: 'Next-Gen Execution',
      caption: 'Faster workflows, intelligent automation, and measurable results.',
      metricBadge: '3X FASTER',
      voiceover: 'Engineered with precision metrics, adaptive automation, and modern speed.',
      durationSec: 4,
      palette: 'emerald',
      visualStyle: 'bars',
    },
    {
      title: 'Scene 04 · Call To Action',
      headline: 'Launch & Share Today',
      caption: 'Created with ASSF AI · Ready for Web, Social, and Presentation.',
      metricBadge: 'READY NOW',
      voiceover: `Your custom video on ${titleCase} is ready to download and share.`,
      durationSec: 4,
      palette: 'amber',
      visualStyle: 'rocket',
    },
  ];

  return {
    title: titleCase,
    aspectRatio,
    scenes,
  };
}

function wrapText(
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

const VIDEO_PALETTES: Record<VideoPalette, [string, string, string]> = {
  cyan: ['#020617', '#083344', '#22d3ee'],
  emerald: ['#022c22', '#065f46', '#34d399'],
  amber: ['#1c1917', '#451a03', '#fbbf24'],
  violet: ['#0f172a', '#2e1065', '#a78bfa'],
};

function drawSceneVisualBackdrop(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  accent: string,
  elapsedSec: number,
  style: VideoVisualStyle
) {
  ctx.save();
  if (style === 'wave') {
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.5;
    for (let layer = 0; layer < 3; layer++) {
      ctx.globalAlpha = 0.22 - layer * 0.05;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 12) {
        const y =
          h * 0.72 +
          Math.sin(x * 0.014 + elapsedSec * (2.2 + layer * 0.6) + layer) * (28 + layer * 10);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  } else if (style === 'bars') {
    const barCount = 12;
    const barWidth = Math.max(12, Math.floor(w * 0.025));
    const baseX = w * 0.56;
    const baseY = h * 0.82;
    ctx.fillStyle = accent;
    for (let i = 0; i < barCount; i++) {
      ctx.globalAlpha = 0.14 + (i % 3) * 0.05;
      const barH = 50 + Math.abs(Math.sin(elapsedSec * 2.5 + i * 0.6)) * (h * 0.34);
      ctx.beginPath();
      ctx.roundRect(baseX + i * (barWidth + 10), baseY - barH, barWidth, barH, 6);
      ctx.fill();
    }
  } else if (style === 'particles') {
    ctx.fillStyle = accent;
    for (let i = 0; i < 28; i++) {
      const px = ((i * 137 + elapsedSec * (26 + (i % 5) * 8)) % (w + 60)) - 30;
      const py = ((i * 89 + Math.sin(elapsedSec + i) * 28) % h + h) % h;
      const r = 2 + (i % 4) * 1.4;
      ctx.globalAlpha = 0.14 + (i % 3) * 0.08;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (style === 'grid') {
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.09;
    ctx.lineWidth = 1;
    const shift = (elapsedSec * 24) % 48;
    for (let x = -48 + shift; x <= w; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = -48 + shift; y <= h; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  } else if (style === 'rocket') {
    // Rising kinetic arc + stardust
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.24;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w * 0.55, h * 0.9);
    ctx.quadraticCurveTo(w * 0.78, h * 0.48, w * 0.92, h * 0.12);
    ctx.stroke();

    const prog = (elapsedSec * 0.45) % 1;
    const tx = (1 - prog) * (1 - prog) * (w * 0.55) + 2 * (1 - prog) * prog * (w * 0.78) + prog * prog * (w * 0.92);
    const ty = (1 - prog) * (1 - prog) * (h * 0.9) + 2 * (1 - prog) * prog * (h * 0.48) + prog * prog * (h * 0.12);
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(tx, ty, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.arc(tx, ty, 28, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // 'orbits'
    const pulse = Math.sin(elapsedSec * 2.2) * 18;
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.18;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w * 0.78, h * 0.3, 125 + pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w * 0.78, h * 0.3, 205 - pulse * 0.6, 0, Math.PI * 2);
    ctx.stroke();
    const ox = w * 0.78 + Math.cos(elapsedSec * 1.4) * (125 + pulse);
    const oy = h * 0.3 + Math.sin(elapsedSec * 1.4) * (125 + pulse);
    ctx.globalAlpha = 0.65;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(ox, oy, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function getSceneAtTime(
  scenes: VideoScene[],
  elapsedSec: number
): { sceneIdx: number; sceneLocal: number; scene: VideoScene } {
  let accum = 0;
  for (let i = 0; i < scenes.length; i++) {
    const dur = Math.max(2, scenes[i].durationSec || 4);
    if (elapsedSec < accum + dur || i === scenes.length - 1) {
      return {
        sceneIdx: i,
        sceneLocal: Math.min(dur, Math.max(0, elapsedSec - accum)),
        scene: scenes[i],
      };
    }
    accum += dur;
  }
  return { sceneIdx: 0, sceneLocal: 0, scene: scenes[0] };
}

export function renderVideoSceneFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  project: BuiltVideoProject,
  elapsedSec: number,
  aspect: '16:9' | '9:16'
): number {
  const scenes = project.scenes;
  if (!scenes || scenes.length === 0) return 0;

  const totalSec = scenes.reduce((acc, s) => acc + Math.max(2, s.durationSec || 4), 0);
  const { sceneIdx, sceneLocal, scene } = getSceneAtTime(scenes, elapsedSec);
  const dur = Math.max(2, scene.durationSec || 4);
  const t = sceneLocal / dur;

  const [bgA, bgB, accent] = VIDEO_PALETTES[scene.palette] || VIDEO_PALETTES.cyan;
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, bgA);
  grad.addColorStop(1, bgB);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Subtle engineering grid backdrop + dynamic scene visual
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.035)';
  ctx.lineWidth = 1;
  for (let gx = 0; gx <= w; gx += 60) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, h);
    ctx.stroke();
  }
  ctx.restore();

  drawSceneVisualBackdrop(ctx, w, h, accent, elapsedSec, scene.visualStyle || 'orbits');

  const slideIn = Math.min(1, t * 4.5);
  const easeOut = 1 - Math.pow(1 - slideIn, 3);
  const offsetX = (1 - easeOut) * 32;

  const padX = aspect === '16:9' ? 64 : 38;
  const startY = aspect === '16:9' ? 110 : 210;

  // Header brand + scene pill
  ctx.fillStyle = accent;
  ctx.font = '700 16px monospace';
  ctx.fillText(
    `${project.title.toUpperCase().slice(0, 32)}  ·  ${scene.title.toUpperCase()}`,
    padX,
    startY - 38
  );

  // Metric badge
  ctx.font = '800 17px system-ui, sans-serif';
  const badgeText = (scene.metricBadge || 'ASSF VIDEO').toUpperCase();
  const bw = Math.min(w - padX * 2, ctx.measureText(badgeText).width + 30);
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.roundRect(padX + offsetX, startY, bw, 34, 6);
  ctx.fill();
  ctx.fillStyle = '#020617';
  ctx.fillText(badgeText, padX + 15 + offsetX, startY + 23);

  // Headline
  ctx.fillStyle = '#f8fafc';
  const hlSize = aspect === '16:9' ? 50 : 42;
  ctx.font = `800 ${hlSize}px system-ui, -apple-system, sans-serif`;
  const nextY = wrapText(
    ctx,
    scene.headline,
    padX + offsetX,
    startY + 90,
    w - padX * 2,
    hlSize * 1.18
  );

  // Caption
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '500 23px system-ui, -apple-system, sans-serif';
  wrapText(ctx, scene.caption, padX + offsetX, nextY + 14, w - padX * 2, 32);

  // Scene step indicators + footer credit
  ctx.fillStyle = 'rgba(148,163,184,0.75)';
  ctx.font = '600 13px monospace';
  ctx.fillText(
    `SCENE ${sceneIdx + 1}/${scenes.length} · GENERATED BY ASSF AI`,
    padX,
    h - 26
  );

  // Timeline scrubber bar
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(0, h - 8, w, 8);
  ctx.fillStyle = accent;
  ctx.fillRect(0, h - 8, w * Math.min(1, elapsedSec / Math.max(1, totalSec)), 8);

  return sceneIdx;
}

export async function renderProjectToWebmBlob(
  project: BuiltVideoProject,
  aspect: '16:9' | '9:16',
  onProgress?: (pct: number) => void
): Promise<string | null> {
  if (typeof document === 'undefined' || typeof MediaRecorder === 'undefined') return null;

  const canvas = document.createElement('canvas');
  const w = aspect === '16:9' ? 960 : 540;
  const h = aspect === '16:9' ? 540 : 960;
  canvas.width = w;
  canvas.height = h;
  if (typeof canvas.captureStream !== 'function') return null;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const totalSec = project.scenes.reduce((s, sc) => s + Math.max(2, sc.durationSec || 4), 0);
  const videoStream = canvas.captureStream(30);

  // Attach gentle ambient synth soundtrack using Web Audio API so exported .webm has real audio track
  let audioCtx: AudioContext | null = null;
  const combinedTracks: MediaStreamTrack[] = [...videoStream.getVideoTracks()];
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      audioCtx = new AudioCtx();
      const dest = audioCtx.createMediaStreamDestination();
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.value = 174.61; // F3 warm pad
      osc2.frequency.value = 261.63; // C4 fifth harmony
      gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.035, audioCtx.currentTime + 0.6);
      gain.gain.setValueAtTime(0.035, audioCtx.currentTime + Math.max(0.8, totalSec - 0.6));
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + totalSec);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(dest);
      osc1.start();
      osc2.start();
      osc1.stop(audioCtx.currentTime + totalSec + 0.1);
      osc2.stop(audioCtx.currentTime + totalSec + 0.1);
      dest.stream.getAudioTracks().forEach((tr) => combinedTracks.push(tr));
    }
  } catch {
    // Proceed with video-only WebM if audio context blocked
  }

  const finalStream = new MediaStream(combinedTracks);
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm';

  return new Promise<string | null>((resolve) => {
    const recorder = new MediaRecorder(finalStream, { mimeType });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => {
      audioCtx?.close().catch(() => {});
      const blob = new Blob(chunks, { type: 'video/webm' });
      resolve(URL.createObjectURL(blob));
    };

    recorder.start();
    const startMs = performance.now();
    const step = () => {
      const elapsedSec = (performance.now() - startMs) / 1000;
      renderVideoSceneFrame(ctx, w, h, project, Math.min(elapsedSec, totalSec), aspect);
      onProgress?.(Math.min(100, Math.round((elapsedSec / totalSec) * 100)));
      if (elapsedSec < totalSec) {
        requestAnimationFrame(step);
      } else {
        if (recorder.state === 'recording') recorder.stop();
      }
    };
    requestAnimationFrame(step);
  });
}
