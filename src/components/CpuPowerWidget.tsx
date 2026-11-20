import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChipSpec } from '../types/edge';
import { Activity, Pause, Play, RotateCcw, ChevronDown, ChevronUp, Cpu, Zap, X } from 'lucide-react';

export type ActiveTaskType = 'idle' | 'offline' | 'vision' | 'frontier' | 'ota';

export interface TelemetrySample {
  id: number;
  timestamp: string;
  cpuPercent: number;
  powerMw: number;
  taskLabel: string;
}

export interface CpuPowerTelemetryConfig {
  chip: ChipSpec;
  isAirGapped: boolean;
  autoSyncEnabled: boolean;
  otaState: string;
  isInferencing: boolean;
  activeTaskType: ActiveTaskType;
  lastPowerMw: number;
  lastLatencyMs: number;
  inferenceBurstId: number;
}

const MAX_SAMPLES = 36;
const SAMPLE_INTERVAL_MS = 750;

function formatTaskLabel(task: ActiveTaskType, otaState: string): string {
  if (otaState !== 'IDLE') return `OTA: ${otaState.replace(/_/g, ' ')}`;
  switch (task) {
    case 'vision':
      return 'DVP Optical Vision';
    case 'frontier':
      return 'Gateway Sync + Distill';
    case 'offline':
      return 'On-Chip INT8 GEMM';
    case 'ota':
      return 'Flash Sector Write';
    default:
      return 'Standby Watchdog';
  }
}

function buildBaselineSamples(chip: ChipSpec, isAirGapped: boolean): TelemetrySample[] {
  const now = Date.now();
  const radioBiasMw = isAirGapped ? 0 : 2.4;
  const baseCpu = isAirGapped ? 5.2 : 8.4;

  return Array.from({ length: MAX_SAMPLES }, (_, idx) => {
    const jitter = Math.sin(idx * 0.7) * 0.9 + (Math.random() - 0.5) * 1.4;
    const cpu = Math.max(2, Math.min(18, baseCpu + jitter));
    const power = Math.max(chip.idlePowerMw * 0.9, chip.idlePowerMw + radioBiasMw + jitter * 0.45);
    const ts = new Date(now - (MAX_SAMPLES - 1 - idx) * SAMPLE_INTERVAL_MS);
    return {
      id: idx,
      timestamp: ts.toLocaleTimeString([], {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      cpuPercent: +cpu.toFixed(1),
      powerMw: +power.toFixed(1),
      taskLabel: 'Standby Watchdog',
    };
  });
}

export function useCpuPowerTelemetry({
  chip,
  isAirGapped,
  autoSyncEnabled,
  otaState,
  isInferencing,
  activeTaskType,
  lastPowerMw,
  inferenceBurstId,
}: CpuPowerTelemetryConfig) {
  const [samples, setSamples] = useState<TelemetrySample[]>(() => buildBaselineSamples(chip, isAirGapped));
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [peakCpu, setPeakCpu] = useState<number>(9.0);
  const [peakPower, setPeakPower] = useState<number>(chip.idlePowerMw);

  const sampleIdRef = useRef<number>(MAX_SAMPLES);
  const burstTicksRef = useRef<number>(0);
  const burstTaskRef = useRef<ActiveTaskType>('idle');
  const prevChipIdRef = useRef<string>(chip.id);

  // Reset baseline smoothly when switching target silicon
  useEffect(() => {
    if (prevChipIdRef.current !== chip.id) {
      prevChipIdRef.current = chip.id;
      const fresh = buildBaselineSamples(chip, isAirGapped);
      setSamples(fresh);
      setPeakCpu(Math.max(...fresh.map((s) => s.cpuPercent)));
      setPeakPower(Math.max(...fresh.map((s) => s.powerMw)));
      burstTicksRef.current = 0;
    }
  }, [chip, isAirGapped]);

  // Register immediate hardware spike when an inference task starts or completes
  useEffect(() => {
    if (inferenceBurstId === 0 && !isInferencing) return;

    burstTicksRef.current = isInferencing ? 3 : 2;
    burstTaskRef.current = activeTaskType !== 'idle' ? activeTaskType : 'offline';

    const targetTask = burstTaskRef.current;
    const spikeCpu =
      targetTask === 'vision'
        ? 89 + Math.random() * 9
        : targetTask === 'offline'
        ? 78 + Math.random() * 14
        : 64 + Math.random() * 14;

    const baseTargetPower =
      lastPowerMw > chip.idlePowerMw
        ? lastPowerMw
        : chip.activePowerMw * (targetTask === 'vision' ? 1.06 : 0.94);

    const spikePower = Math.max(chip.idlePowerMw + 4, baseTargetPower + (Math.random() - 0.3) * 3.5);
    const nowStr = new Date().toLocaleTimeString([], {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const spikeSample: TelemetrySample = {
      id: ++sampleIdRef.current,
      timestamp: nowStr,
      cpuPercent: +Math.min(99.5, spikeCpu).toFixed(1),
      powerMw: +spikePower.toFixed(1),
      taskLabel: formatTaskLabel(targetTask, otaState),
    };

    if (!isPaused) {
      setSamples((prev) => [...prev.slice(-(MAX_SAMPLES - 1)), spikeSample]);
      setPeakCpu((p) => Math.max(p, spikeSample.cpuPercent));
      setPeakPower((p) => Math.max(p, spikeSample.powerMw));
    }
  }, [inferenceBurstId, isInferencing]);

  // Continuous hardware sampling loop
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      const otaActive = otaState !== 'IDLE';
      const radioBiasMw = isAirGapped ? 0 : autoSyncEnabled ? 2.6 : 1.4;
      let nextCpu = (isAirGapped ? 5.0 : 8.2) + (Math.random() - 0.5) * 2.6;
      let nextPower = chip.idlePowerMw + radioBiasMw + (Math.random() - 0.5) * 1.4;
      let task: ActiveTaskType = 'idle';

      if (isInferencing) {
        task = activeTaskType !== 'idle' ? activeTaskType : 'offline';
        nextCpu = task === 'vision' ? 88 + Math.random() * 9 : 74 + Math.random() * 16;
        nextPower = chip.activePowerMw * (task === 'vision' ? 1.05 : 0.92) + (Math.random() - 0.5) * 3;
      } else if (burstTicksRef.current > 0) {
        const decayFactor = burstTicksRef.current === 3 ? 0.65 : burstTicksRef.current === 2 ? 0.42 : 0.2;
        burstTicksRef.current -= 1;
        task = burstTaskRef.current;
        const deltaPower = Math.max(8, (lastPowerMw || chip.activePowerMw) - chip.idlePowerMw);
        nextCpu = 12 + decayFactor * 68 + (Math.random() - 0.5) * 4;
        nextPower = chip.idlePowerMw + radioBiasMw + deltaPower * decayFactor;
      } else if (otaActive) {
        task = 'ota';
        nextCpu = 46 + Math.random() * 24;
        nextPower = chip.idlePowerMw + (chip.activePowerMw - chip.idlePowerMw) * 0.62 + (Math.random() - 0.5) * 3;
      }

      const clampedCpu = +Math.max(1.5, Math.min(99.5, nextCpu)).toFixed(1);
      const clampedPower = +Math.max(chip.idlePowerMw * 0.85, nextPower).toFixed(1);

      const sample: TelemetrySample = {
        id: ++sampleIdRef.current,
        timestamp: new Date().toLocaleTimeString([], {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        cpuPercent: clampedCpu,
        powerMw: clampedPower,
        taskLabel: formatTaskLabel(task, otaState),
      };

      setSamples((prev) => [...prev.slice(-(MAX_SAMPLES - 1)), sample]);
      setPeakCpu((p) => Math.max(p, clampedCpu));
      setPeakPower((p) => Math.max(p, clampedPower));
    }, SAMPLE_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [isPaused, chip, isAirGapped, autoSyncEnabled, otaState, isInferencing, activeTaskType, lastPowerMw]);

  const latest = samples[samples.length - 1];
  const maxPowerScale = useMemo(
    () => Math.max(Math.ceil(chip.activePowerMw * 1.25), Math.ceil(peakPower * 1.1)),
    [chip.activePowerMw, peakPower]
  );

  const resetPeaks = () => {
    setPeakCpu(latest.cpuPercent);
    setPeakPower(latest.powerMw);
  };

  return {
    samples,
    latest,
    peakCpu,
    peakPower,
    maxPowerScale,
    isPaused,
    setIsPaused,
    resetPeaks,
  };
}

function buildSvgPaths(samples: TelemetrySample[], maxPowerScale: number, width: number, height: number, padX: number, padY: number) {
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const count = Math.max(1, samples.length - 1);

  const cpuPts: string[] = [];
  const powerPts: string[] = [];
  const coords: { x: number; cpuY: number; powerY: number }[] = [];

  samples.forEach((s, i) => {
    const x = padX + (i / count) * innerW;
    const cpuY = padY + innerH - (Math.min(100, Math.max(0, s.cpuPercent)) / 100) * innerH;
    const powerY = padY + innerH - (Math.min(maxPowerScale, Math.max(0, s.powerMw)) / maxPowerScale) * innerH;
    cpuPts.push(`${x.toFixed(1)},${cpuY.toFixed(1)}`);
    powerPts.push(`${x.toFixed(1)},${powerY.toFixed(1)}`);
    coords.push({ x, cpuY, powerY });
  });

  const cpuLine = cpuPts.join(' ');
  const powerLine = powerPts.join(' ');
  const baseY = (padY + innerH).toFixed(1);
  const firstX = coords[0]?.x.toFixed(1) ?? String(padX);
  const lastX = coords[coords.length - 1]?.x.toFixed(1) ?? String(width - padX);

  const cpuArea = `${firstX},${baseY} ${cpuLine} ${lastX},${baseY}`;
  const powerArea = `${firstX},${baseY} ${powerLine} ${lastX},${baseY}`;

  return { cpuLine, powerLine, cpuArea, powerArea, coords };
}

interface CpuPowerSparklineProps {
  samples: TelemetrySample[];
  latest: TelemetrySample;
  maxPowerScale: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export const CpuPowerSparkline: React.FC<CpuPowerSparklineProps> = ({
  samples,
  latest,
  maxPowerScale,
  isExpanded,
  onToggleExpand,
}) => {
  const mini = useMemo(() => buildSvgPaths(samples, maxPowerScale, 116, 26, 2, 3), [samples, maxPowerScale]);

  return (
    <button
      type="button"
      onClick={onToggleExpand}
      className={`group flex items-center gap-2.5 bg-slate-950/90 border rounded-lg px-2.5 py-1 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 shrink-0 ${
        isExpanded ? 'border-cyan-500/60' : 'border-slate-800 hover:border-slate-700'
      }`}
      aria-expanded={isExpanded}
      title={isExpanded ? 'Collapse CPU & Power Oscilloscope' : 'Expand CPU & Power Oscilloscope'}
    >
      <div className="relative w-[116px] h-[26px] shrink-0 overflow-hidden rounded bg-slate-900/80 border border-slate-800/80">
        <svg viewBox="0 0 116 26" className="w-full h-full block" aria-hidden="true">
          <defs>
            <linearGradient id="assfCpuMiniGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <line x1="0" y1="13" x2="116" y2="13" stroke="#334155" strokeWidth="0.6" strokeDasharray="2 2" />
          <polygon points={mini.cpuArea} fill="url(#assfCpuMiniGrad)" />
          <polyline
            fill="none"
            stroke="#22d3ee"
            strokeWidth="1.4"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={mini.cpuLine}
          />
          <polyline
            fill="none"
            stroke="#fbbf24"
            strokeWidth="1.3"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={mini.powerLine}
          />
          {mini.coords.length > 0 && (
            <>
              <circle
                cx={mini.coords[mini.coords.length - 1].x}
                cy={mini.coords[mini.coords.length - 1].cpuY}
                r="2"
                fill="#22d3ee"
              />
              <circle
                cx={mini.coords[mini.coords.length - 1].x}
                cy={mini.coords[mini.coords.length - 1].powerY}
                r="2"
                fill="#fbbf24"
              />
            </>
          )}
        </svg>
      </div>

      <div className="flex items-center gap-2.5 text-[11px] font-mono whitespace-nowrap">
        <div className="flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400" aria-hidden="true" />
          <span className="text-slate-500 uppercase">CPU</span>
          <span className="text-cyan-300 font-semibold tabular-nums min-w-[30px] text-right">
            {latest.cpuPercent.toFixed(0)}%
          </span>
        </div>

        <div className="flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" aria-hidden="true" />
          <span className="text-slate-500 uppercase">PWR</span>
          <span className="text-amber-300 font-semibold tabular-nums min-w-[48px] text-right">
            {latest.powerMw.toFixed(1)}mW
          </span>
        </div>
      </div>

      <span className="text-slate-500 group-hover:text-cyan-300 transition-colors">
        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </span>
    </button>
  );
};

interface CpuPowerOscilloscopeProps {
  chip: ChipSpec;
  samples: TelemetrySample[];
  latest: TelemetrySample;
  peakCpu: number;
  peakPower: number;
  maxPowerScale: number;
  lastPowerMw: number;
  lastLatencyMs: number;
  isPaused: boolean;
  onTogglePause: () => void;
  onResetPeaks: () => void;
  onClose: () => void;
}

export const CpuPowerOscilloscope: React.FC<CpuPowerOscilloscopeProps> = ({
  chip,
  samples,
  latest,
  peakCpu,
  peakPower,
  maxPowerScale,
  lastPowerMw,
  lastLatencyMs,
  isPaused,
  onTogglePause,
  onResetPeaks,
  onClose,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const full = useMemo(() => buildSvgPaths(samples, maxPowerScale, 720, 128, 8, 8), [samples, maxPowerScale]);

  const inspectedSample = hoverIndex !== null && samples[hoverIndex] ? samples[hoverIndex] : latest;
  const inspectedCoord =
    hoverIndex !== null && full.coords[hoverIndex]
      ? full.coords[hoverIndex]
      : full.coords[full.coords.length - 1];

  const handleChartMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const idx = Math.round(relX * (samples.length - 1));
    setHoverIndex(idx);
  };

  const lastEnergyMj = ((lastPowerMw || chip.activePowerMw) * (lastLatencyMs || 0)) / 1000;
  const currentMa = latest.powerMw / chip.voltage;
  const idleY = 8 + 112 - (chip.idlePowerMw / maxPowerScale) * 112;
  const tdpY = 8 + 112 - (chip.activePowerMw / maxPowerScale) * 112;

  return (
    <div className="mt-2.5 bg-slate-950/95 border border-slate-800 rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-2.5">
        <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span className="text-slate-100 font-semibold">Hardware CPU & Power Oscilloscope</span>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <span className="text-slate-400">{chip.name}</span>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <span className="text-cyan-300">{inspectedSample.taskLabel}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onTogglePause}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:border-slate-700 transition-colors whitespace-nowrap"
          >
            {isPaused ? <Play className="w-3 h-3 text-emerald-400" /> : <Pause className="w-3 h-3 text-amber-400" />}
            <span>{isPaused ? 'Resume' : 'Pause'}</span>
          </button>

          <button
            type="button"
            onClick={onResetPeaks}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:border-slate-700 transition-colors whitespace-nowrap"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Peaks</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800 transition-colors"
            aria-label="Close CPU and Power oscilloscope"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Interactive Dual-Trace Oscilloscope Chart */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono mb-2">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5 text-cyan-300">
              <Cpu className="w-3.5 h-3.5" />
              <span>CPU Load (0–100%)</span>
            </span>
            <span className="flex items-center gap-1.5 text-amber-300">
              <Zap className="w-3.5 h-3.5" />
              <span>Power Draw (0–{maxPowerScale} mW)</span>
            </span>
            <span className="text-slate-500">
              Baseline {chip.idlePowerMw}mW · Active TDP {chip.activePowerMw}mW
            </span>
          </div>

          <div className="flex items-center gap-3 text-slate-300 tabular-nums">
            <span className="text-slate-500">{inspectedSample.timestamp}</span>
            <span className="text-cyan-300 font-semibold">{inspectedSample.cpuPercent.toFixed(1)}% CPU</span>
            <span className="text-amber-300 font-semibold">{inspectedSample.powerMw.toFixed(1)} mW</span>
          </div>
        </div>

        <div className="flex items-stretch gap-2">
          {/* Left Y-Axis (CPU %) */}
          <div className="flex flex-col justify-between text-[10px] font-mono text-cyan-400/80 tabular-nums py-1 select-none w-8 text-right shrink-0">
            <span>100%</span>
            <span>50%</span>
            <span>0%</span>
          </div>

          {/* SVG Waveform */}
          <svg
            viewBox="0 0 720 128"
            className="w-full h-32 cursor-crosshair select-none"
            onMouseMove={handleChartMouseMove}
            onMouseLeave={() => setHoverIndex(null)}
            role="img"
            aria-label="Real-time CPU utilization and power consumption graph"
          >
            <defs>
              <linearGradient id="assfCpuFullGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.01" />
              </linearGradient>
              <linearGradient id="assfPowerFullGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.01" />
              </linearGradient>
            </defs>

            <line x1="8" y1="8" x2="712" y2="8" stroke="#1e293b" strokeWidth="1" />
            <line x1="8" y1="64" x2="712" y2="64" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="8" y1="120" x2="712" y2="120" stroke="#1e293b" strokeWidth="1" />

            <line
              x1="8"
              y1={idleY}
              x2="712"
              y2={idleY}
              stroke="#fbbf24"
              strokeOpacity="0.28"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <line
              x1="8"
              y1={tdpY}
              x2="712"
              y2={tdpY}
              stroke="#f87171"
              strokeOpacity="0.32"
              strokeWidth="1"
              strokeDasharray="2 4"
            />

            <polygon points={full.cpuArea} fill="url(#assfCpuFullGrad)" />
            <polygon points={full.powerArea} fill="url(#assfPowerFullGrad)" />

            <polyline
              fill="none"
              stroke="#22d3ee"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={full.cpuLine}
            />
            <polyline
              fill="none"
              stroke="#fbbf24"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={full.powerLine}
            />

            {inspectedCoord && (
              <>
                <line
                  x1={inspectedCoord.x}
                  y1="8"
                  x2={inspectedCoord.x}
                  y2="120"
                  stroke="#64748b"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
                <circle
                  cx={inspectedCoord.x}
                  cy={inspectedCoord.cpuY}
                  r="3.5"
                  fill="#0f172a"
                  stroke="#22d3ee"
                  strokeWidth="2"
                />
                <circle
                  cx={inspectedCoord.x}
                  cy={inspectedCoord.powerY}
                  r="3.5"
                  fill="#0f172a"
                  stroke="#fbbf24"
                  strokeWidth="2"
                />
              </>
            )}
          </svg>

          {/* Right Y-Axis (Power mW) */}
          <div className="flex flex-col justify-between text-[10px] font-mono text-amber-400/80 tabular-nums py-1 select-none w-12 text-left shrink-0">
            <span>{maxPowerScale}mW</span>
            <span>{Math.round(maxPowerScale / 2)}mW</span>
            <span>0mW</span>
          </div>
        </div>
      </div>

      {/* 4-Column Hardware Impact Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-1 text-xs font-mono">
        <div className="border-r border-slate-800/80 pr-3">
          <div className="text-slate-500 text-[11px]">CPU Utilization · Peak</div>
          <div className="mt-0.5 flex items-baseline gap-2 tabular-nums">
            <span className="text-cyan-300 font-semibold text-sm">{latest.cpuPercent.toFixed(1)}%</span>
            <span className="text-slate-500 text-[11px]">Peak {peakCpu.toFixed(1)}%</span>
          </div>
        </div>

        <div className="lg:border-r border-slate-800/80 pr-3">
          <div className="text-slate-500 text-[11px]">Instant Power · Current</div>
          <div className="mt-0.5 flex items-baseline gap-2 tabular-nums">
            <span className="text-amber-300 font-semibold text-sm">{latest.powerMw.toFixed(1)} mW</span>
            <span className="text-slate-400 text-[11px]">{currentMa.toFixed(1)} mA @ {chip.voltage}V</span>
          </div>
        </div>

        <div className="border-r border-slate-800/80 pr-3">
          <div className="text-slate-500 text-[11px]">Peak vs. Idle Baseline</div>
          <div className="mt-0.5 flex items-baseline gap-2 tabular-nums">
            <span className="text-slate-200 font-semibold text-sm">{peakPower.toFixed(1)} mW</span>
            <span className="text-slate-500 text-[11px]">Idle {chip.idlePowerMw}mW / TDP {chip.activePowerMw}mW</span>
          </div>
        </div>

        <div>
          <div className="text-slate-500 text-[11px]">Last Inference Energy</div>
          <div className="mt-0.5 flex items-baseline gap-2 tabular-nums">
            <span className="text-emerald-300 font-semibold text-sm">
              {lastLatencyMs > 0 ? `${lastEnergyMj.toFixed(2)} mJ` : '0.00 mJ'}
            </span>
            <span className="text-slate-500 text-[11px]">
              {lastLatencyMs > 0 ? `${lastLatencyMs} ms burst` : 'Standby'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
