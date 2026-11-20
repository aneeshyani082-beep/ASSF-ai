import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { BuiltVideoProject } from '../types/edge';
import {
  renderProjectToWebmBlob,
  renderVideoSceneFrame,
} from '../services/videoStudioEngine';
import { sound } from '../services/soundEffects';
import {
  Film,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Download,
  Video,
  SlidersHorizontal,
} from 'lucide-react';

interface InlineVideoPlayerCardProps {
  project: BuiltVideoProject;
  onOpenInVideoStudio?: (project: BuiltVideoProject) => void;
}

export const InlineVideoPlayerCard: React.FC<InlineVideoPlayerCardProps> = ({
  project,
  onOpenInVideoStudio,
}) => {
  const [aspect, setAspect] = useState<'16:9' | '9:16'>(project.aspectRatio || '16:9');
  const [isPlaying, setIsPlaying] = useState(false);
  const [voiceOverOn, setVoiceOverOn] = useState(true);
  const [activeSceneIdx, setActiveSceneIdx] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportPct, setExportPct] = useState(0);
  const [webmUrl, setWebmUrl] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const elapsedRef = useRef(0);
  const lastSpokenSceneRef = useRef(-1);

  const totalSec = useMemo(
    () => project.scenes.reduce((s, sc) => s + Math.max(2, sc.durationSec || 4), 0),
    [project.scenes]
  );

  const drawAt = useCallback(
    (elapsedSec: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const w = aspect === '16:9' ? 960 : 540;
      const h = aspect === '16:9' ? 540 : 960;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const sceneIdx = renderVideoSceneFrame(ctx, w, h, project, elapsedSec, aspect);
      if (sceneIdx !== activeSceneIdx) {
        setActiveSceneIdx(sceneIdx);
      }

      if (isPlaying && voiceOverOn && lastSpokenSceneRef.current !== sceneIdx) {
        lastSpokenSceneRef.current = sceneIdx;
        const sc = project.scenes[sceneIdx];
        if (sc?.voiceover && typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(sc.voiceover);
          u.rate = 1.05;
          window.speechSynthesis.speak(u);
        }
      }
    },
    [aspect, project, activeSceneIdx, isPlaying, voiceOverOn]
  );

  useEffect(() => {
    if (!isPlaying) {
      drawAt(elapsedRef.current);
    }
  }, [isPlaying, drawAt]);

  useEffect(() => {
    if (!isPlaying) return;
    let rafId = 0;
    let prev = performance.now();
    const tick = (now: number) => {
      const dt = (now - prev) / 1000;
      prev = now;
      elapsedRef.current += dt;
      if (elapsedRef.current >= totalSec) {
        elapsedRef.current = 0;
        lastSpokenSceneRef.current = -1;
        setIsPlaying(false);
        drawAt(0);
        return;
      }
      drawAt(elapsedRef.current);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, totalSec, drawAt]);

  const handleExportWebm = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setExportPct(0);
    setWebmUrl(null);
    sound.playFlashTick();
    try {
      const url = await renderProjectToWebmBlob(project, aspect, setExportPct);
      if (url) {
        setWebmUrl(url);
        sound.playOtaSuccess();
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="mt-3 rounded-xl border border-violet-500/40 bg-slate-900/90 overflow-hidden">
      {/* Header Bar */}
      <div className="px-3.5 py-2.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-bold text-violet-300">
            <Film className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{project.title}</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {project.scenes.length} Scenes · {totalSec}s Motion Video ({aspect})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (isPlaying) {
                setIsPlaying(false);
                window.speechSynthesis?.cancel();
              } else {
                lastSpokenSceneRef.current = -1;
                setIsPlaying(true);
              }
            }}
            className="px-2.5 py-1 rounded bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-[11px] flex items-center gap-1"
          >
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            type="button"
            onClick={() => setVoiceOverOn((v) => !v)}
            className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300 text-[11px] flex items-center gap-1"
            title="Toggle Spoken Voiceover"
          >
            {voiceOverOn ? (
              <Volume2 className="w-3 h-3 text-emerald-400" />
            ) : (
              <VolumeX className="w-3 h-3 text-slate-400" />
            )}
            <span>Audio</span>
          </button>

          <button
            type="button"
            onClick={() => setAspect((a) => (a === '16:9' ? '9:16' : '16:9'))}
            className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300 text-[11px]"
          >
            {aspect}
          </button>

          <button
            type="button"
            onClick={handleExportWebm}
            disabled={isExporting}
            className="px-2.5 py-1 rounded bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-slate-950 font-bold text-[11px] flex items-center gap-1"
          >
            <Video className="w-3 h-3" />
            <span>{isExporting ? `Rendering ${exportPct}%` : 'Export .WebM'}</span>
          </button>

          {webmUrl && (
            <a
              href={webmUrl}
              download={`${project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'assf-video'}.webm`}
              className="px-2.5 py-1 rounded bg-emerald-950 border border-emerald-500/60 text-emerald-300 font-bold text-[11px] flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              <span>Save</span>
            </a>
          )}

          {onOpenInVideoStudio && (
            <button
              type="button"
              onClick={() => onOpenInVideoStudio({ ...project, aspectRatio: aspect })}
              className="px-2.5 py-1 rounded bg-violet-400 hover:bg-violet-300 text-slate-950 font-bold text-[11px] flex items-center gap-1"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>Edit in Studio</span>
            </button>
          )}
        </div>
      </div>

      {/* Motion Viewport */}
      <div className="p-3 bg-slate-950 flex flex-col items-center gap-2.5">
        {webmUrl ? (
          <video
            src={webmUrl}
            controls
            autoPlay
            className="max-h-[360px] w-auto rounded-lg border border-emerald-500/40 shadow-lg"
          />
        ) : (
          <canvas
            ref={canvasRef}
            className="max-h-[340px] w-auto rounded-lg border border-slate-800 shadow-lg"
          />
        )}

        {/* Quick Scene Step Pills */}
        <div className="w-full flex flex-wrap items-center gap-1.5">
          {project.scenes.map((sc, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                const startAt = project.scenes
                  .slice(0, i)
                  .reduce((acc, s) => acc + Math.max(2, s.durationSec || 4), 0);
                elapsedRef.current = startAt;
                setActiveSceneIdx(i);
                setWebmUrl(null);
                drawAt(startAt);
              }}
              className={`px-2 py-1 rounded text-[10px] font-mono border transition-colors ${
                activeSceneIdx === i
                  ? 'bg-violet-500/25 border-violet-400 text-violet-200 font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              0{i + 1}. {sc.headline.slice(0, 22)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
