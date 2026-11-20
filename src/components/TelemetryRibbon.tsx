import React, { useState } from 'react';
import { ChipSpec, PartitionSlot } from '../types/edge';
import {
  ActiveTaskType,
  CpuPowerOscilloscope,
  CpuPowerSparkline,
  useCpuPowerTelemetry,
} from './CpuPowerWidget';

interface TelemetryRibbonProps {
  chip: ChipSpec;
  activePartition: PartitionSlot;
  currentVersion: string;
  isAirGapped: boolean;
  sramUsedKb: number;
  lastLatencyMs: number;
  otaState: string;
  autoSyncEnabled: boolean;
  isInferencing: boolean;
  activeTaskType: ActiveTaskType;
  lastPowerMw: number;
  inferenceBurstId: number;
}

export const TelemetryRibbon: React.FC<TelemetryRibbonProps> = ({
  chip,
  activePartition,
  currentVersion,
  isAirGapped,
  sramUsedKb,
  lastLatencyMs,
  otaState,
  autoSyncEnabled,
  isInferencing,
  activeTaskType,
  lastPowerMw,
  inferenceBurstId,
}) => {
  const sramPercent = ((sramUsedKb / chip.sramKb) * 100).toFixed(1);
  const [isGraphExpanded, setIsGraphExpanded] = useState(false);

  const telemetry = useCpuPowerTelemetry({
    chip,
    isAirGapped,
    autoSyncEnabled,
    otaState,
    isInferencing,
    activeTaskType,
    lastPowerMw,
    lastLatencyMs,
    inferenceBurstId,
  });

  return (
    <div className="border-b border-slate-800/60 bg-slate-900/50 px-4 sm:px-6 py-2.5">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-6 text-xs text-slate-400 font-mono">
          {/* Hardware & Execution state */}
          <div className="flex items-center gap-2">
            <span className="text-slate-300 font-semibold">{chip.name}</span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span className="text-slate-400">{chip.clockMhz} MHz</span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span className={isAirGapped ? 'text-amber-400' : 'text-emerald-400'}>
              {isAirGapped ? 'OFFLINE SILICON' : 'SYNC READY'}
            </span>
          </div>

          {/* Real-time Telemetry Metrics + CPU & Power Graph Widget */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 uppercase">Flash:</span>
              <span className="text-slate-200 font-bold">{activePartition}</span>
              <span className="text-cyan-400">({currentVersion})</span>
            </div>

            <span className="text-slate-700 hidden sm:inline" aria-hidden="true">|</span>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 uppercase">SRAM:</span>
              <span className="text-slate-200 tabular-nums font-semibold">{sramUsedKb} KB</span>
              <span className="text-slate-500">/{chip.sramKb} KB ({sramPercent}%)</span>
            </div>

            <span className="text-slate-700 hidden sm:inline" aria-hidden="true">|</span>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 uppercase">Latency:</span>
              <span className="text-cyan-400 tabular-nums font-semibold">
                {lastLatencyMs > 0 ? `${lastLatencyMs} ms` : 'Idle'}
              </span>
            </div>

            <span className="text-slate-700 hidden sm:inline" aria-hidden="true">|</span>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 uppercase">OTA Daemon:</span>
              <span className={otaState === 'IDLE' ? 'text-slate-300' : 'text-amber-400 animate-pulse'}>
                {otaState === 'IDLE' ? (autoSyncEnabled ? 'Auto-Watchdog On' : 'Paused') : otaState}
              </span>
            </div>

            <span className="text-slate-700 hidden md:inline" aria-hidden="true">|</span>

            {/* Real-Time CPU & Power Graph Widget */}
            <CpuPowerSparkline
              samples={telemetry.samples}
              latest={telemetry.latest}
              maxPowerScale={telemetry.maxPowerScale}
              isExpanded={isGraphExpanded}
              onToggleExpand={() => setIsGraphExpanded((v) => !v)}
            />
          </div>
        </div>

        {/* Full-Width Expanded Oscilloscope Drawer */}
        {isGraphExpanded && (
          <CpuPowerOscilloscope
            chip={chip}
            samples={telemetry.samples}
            latest={telemetry.latest}
            peakCpu={telemetry.peakCpu}
            peakPower={telemetry.peakPower}
            maxPowerScale={telemetry.maxPowerScale}
            lastPowerMw={lastPowerMw}
            lastLatencyMs={lastLatencyMs}
            isPaused={telemetry.isPaused}
            onTogglePause={() => telemetry.setIsPaused((p) => !p)}
            onResetPeaks={telemetry.resetPeaks}
            onClose={() => setIsGraphExpanded(false)}
          />
        )}
      </div>
    </div>
  );
};
