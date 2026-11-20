import React, { useState } from 'react';
import { EdgeInferenceEngine } from '../services/edgeInferenceEngine';
import { ChipSpec, OtaState, PartitionSlot } from '../types/edge';
import { sound } from '../services/soundEffects';
import {
  RefreshCw,
  Sparkles,
  ShieldCheck,
  AlertOctagon,
  HardDrive,
  Clock,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Layers,
  Radio,
} from 'lucide-react';

interface AutoOtaPipelineProps {
  engine: EdgeInferenceEngine;
  chip: ChipSpec;
  activePartition: PartitionSlot;
  setActivePartition: (partition: PartitionSlot) => void;
  currentVersion: string;
  setCurrentVersion: (version: string) => void;
  otaState: OtaState;
  setOtaState: (state: OtaState) => void;
  autoSyncEnabled: boolean;
  setAutoSyncEnabled: (enabled: boolean) => void;
}

export const AutoOtaPipeline: React.FC<AutoOtaPipelineProps> = ({
  engine,
  chip,
  activePartition,
  setActivePartition,
  currentVersion,
  setCurrentVersion,
  otaState,
  setOtaState,
  autoSyncEnabled,
  setAutoSyncEnabled,
}) => {
  const [newTopic, setNewTopic] = useState('');
  const [isCompiling, setIsCompiling] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [otaLogs, setOtaLogs] = useState<string[]>([
    `[OTA-DAEMON] Dual-partition watcher active. Boot slot: ${activePartition}`,
    `[OTA-DAEMON] Current Firmware: ${currentVersion} · Rollback guard: ACTIVE`,
  ]);
  const [lastPatchDetails, setLastPatchDetails] = useState<any>(null);

  const addLog = (msg: string) => {
    setOtaLogs((prev) => [...prev.slice(-15), msg]);
  };

  // Execute full A/B OTA update lifecycle
  const runOtaUpdateProcess = async (
    targetVersion: string,
    deltaBytes: number,
    patchTitle: string,
    deltaItems: any[],
    simulateCorrupt: boolean = false
  ) => {
    setOtaState('CHECKING_CLOUD');
    setProgressPercent(10);
    addLog(`[OTA] Opportunistic gateway detected. Polling Cloud OTA Registry...`);
    sound.playFlashTick();

    await new Promise((r) => setTimeout(r, 600));
    setOtaState('PATCH_FOUND');
    setProgressPercent(25);
    addLog(`[OTA] Found delta patch: ${targetVersion} "${patchTitle}" (${deltaBytes} bytes)`);

    await new Promise((r) => setTimeout(r, 700));
    setOtaState('DOWNLOADING_CHUNKS');
    setProgressPercent(50);
    addLog(`[OTA] Receiving differential delta blocks: 16 packets @ 512 bytes`);
    sound.playFlashTick();

    await new Promise((r) => setTimeout(r, 700));
    setOtaState('VERIFYING_SIGNATURE');
    setProgressPercent(70);

    if (simulateCorrupt) {
      addLog(`[OTA-ERROR] CRC32 MISMATCH DETECTED! Expected 0x4A1F9C8E, got 0xBAD00000`);
      sound.playAlarmTone();
      setOtaState('ROLLBACK_TRIGGERED');
      await new Promise((r) => setTimeout(r, 800));
      addLog(`[OTA-ROLLBACK] Hardware Watchdog prevented flash write. Safe boot preserved on ${activePartition}.`);
      setOtaState('IDLE');
      setProgressPercent(0);
      return;
    }

    addLog(`[OTA] SHA-256 RSA-2048 cryptographic signature: VERIFIED OK`);

    await new Promise((r) => setTimeout(r, 600));
    const targetPartition: PartitionSlot = activePartition === 'OTA_0' ? 'OTA_1' : 'OTA_0';
    setOtaState('WRITING_SECTORS');
    setProgressPercent(85);
    addLog(`[OTA] Erasing and flashing passive flash partition: ${targetPartition}`);
    sound.playFlashTick();

    await new Promise((r) => setTimeout(r, 700));
    setOtaState('SWAPPING_BOOT_PARTITION');
    setProgressPercent(95);
    addLog(`[OTA] Atomically setting bootloader active partition flag -> ${targetPartition}`);

    await new Promise((r) => setTimeout(r, 500));
    setOtaState('REBOOTING');
    setProgressPercent(100);
    addLog(`[OTA] Performing 65ms warm micro-reboot into updated partition...`);

    // Hot-apply into local engine
    engine.applyOtaPatch(targetVersion, deltaItems);
    setActivePartition(targetPartition);
    setCurrentVersion(targetVersion);

    await new Promise((r) => setTimeout(r, 400));
    setOtaState('HOT_RELOAD_SUCCESS');
    sound.playOtaSuccess();
    addLog(`[OTA-SUCCESS] Chip running updated firmware ${targetVersion} on ${targetPartition}!`);

    setTimeout(() => {
      setOtaState('IDLE');
      setProgressPercent(0);
    }, 2500);
  };

  // Compile new rule/knowledge using server-side Gemini
  const handleSynthesizeUpdate = async () => {
    if (!newTopic.trim() || isCompiling) return;
    setIsCompiling(true);
    sound.playFlashTick();
    addLog(`[SERVER-GEMINI] Synthesizing INT8 quantized delta weights for: "${newTopic}"...`);

    try {
      const response = await fetch('/api/edge/compile-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: newTopic,
          existingVersion: currentVersion,
          targetChip: chip.name,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to compile patch');
      }

      setLastPatchDetails(data.patch);
      addLog(`[REGISTRY] Patch ${data.patch.version} registered on Cloud OTA Server.`);

      // Now run autonomous on-chip OTA update to download and install this patch!
      await runOtaUpdateProcess(
        data.patch.version,
        data.patch.deltaSizeBytes,
        data.patch.title,
        data.patch.knowledgeDelta
      );

      setNewTopic('');
    } catch (err: any) {
      console.error(err);
      addLog(`[ERROR] OTA Compilation failed: ${err.message}`);
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview & Auto-Sync Switch */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400" />
            Autonomous Over-The-Air (Δ-OTA) Update Architecture
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            How offline chips stay up to date: Differential byte-level deltas, A/B flash partitions, and rollback protection.
          </p>
        </div>

        {/* Auto-Sync Toggle */}
        <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-lg border border-slate-800">
          <span className="text-xs font-mono text-slate-400">Opportunistic Auto-Sync:</span>
          <button
            onClick={() => {
              setAutoSyncEnabled(!autoSyncEnabled);
              sound.playFlashTick();
            }}
            className={`px-3 py-1 rounded text-xs font-mono font-bold transition-colors ${
              autoSyncEnabled
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            {autoSyncEnabled ? 'ACTIVE (Watchdog On)' : 'PAUSED'}
          </button>
        </div>
      </div>

      {/* Main Grid: Visual Flash Partition A/B Transition & Live Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Live A/B Flash Partition Visualizer (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/40 border border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              <span className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Dual-Partition A/B Flash Map
              </span>
            </div>
            <span className="text-xs font-mono text-cyan-400">
              Active: {activePartition} ({currentVersion})
            </span>
          </div>

          {/* Flash Memory Slots */}
          <div className="space-y-4">
            {/* Partition OTA_0 */}
            <div
              className={`p-4 rounded-xl border transition-all ${
                activePartition === 'OTA_0'
                  ? 'bg-cyan-950/40 border-cyan-500 shadow-sm shadow-cyan-950/50'
                  : 'bg-slate-950/60 border-slate-800 opacity-75'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-slate-200">PARTITION OTA_0 (0x110000 - 3072 KB)</span>
                {activePartition === 'OTA_0' ? (
                  <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded font-bold">
                    BOOT CURRENT (RUNNING)
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500">STANDBY RECEPTACLE</span>
                )}
              </div>
              <div className="mt-2 text-xs font-mono text-slate-400 flex items-center justify-between">
                <span>Status: {activePartition === 'OTA_0' ? 'Locked / Read-Only Flash' : 'Available for Next OTA Write'}</span>
                <span className="text-slate-300">CRC: 0x4A1F9C8E</span>
              </div>
            </div>

            {/* Partition OTA_1 */}
            <div
              className={`p-4 rounded-xl border transition-all ${
                activePartition === 'OTA_1'
                  ? 'bg-cyan-950/40 border-cyan-500 shadow-sm shadow-cyan-950/50'
                  : 'bg-slate-950/60 border-slate-800 opacity-75'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-slate-200">PARTITION OTA_1 (0x410000 - 3072 KB)</span>
                {activePartition === 'OTA_1' ? (
                  <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded font-bold">
                    BOOT CURRENT (RUNNING)
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500">STANDBY RECEPTACLE</span>
                )}
              </div>
              <div className="mt-2 text-xs font-mono text-slate-400 flex items-center justify-between">
                <span>Status: {activePartition === 'OTA_1' ? 'Locked / Read-Only Flash' : 'Available for Next OTA Write'}</span>
                <span className="text-slate-300">CRC: 0x72CD1A44</span>
              </div>
            </div>
          </div>

          {/* Active OTA Process Status & Progress Bar */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 uppercase font-semibold">OTA State Machine:</span>
              <span
                className={`font-bold ${
                  otaState === 'IDLE'
                    ? 'text-slate-400'
                    : otaState === 'HOT_RELOAD_SUCCESS'
                    ? 'text-emerald-400'
                    : otaState === 'ROLLBACK_TRIGGERED'
                    ? 'text-rose-400'
                    : 'text-amber-400'
                }`}
              >
                {otaState}
              </span>
            </div>

            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
              <div
                className="bg-cyan-400 h-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>

            <div className="flex justify-between text-[11px] font-mono text-slate-500 pt-1">
              <span>A/B Zero-Downtime Swap</span>
              <span>Hardware Watchdog Guard</span>
            </div>
          </div>

          {/* Simulation Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => {
                const patchVer = `v1.${Math.floor(Math.random() * 8) + 3}.0`;
                runOtaUpdateProcess(
                  patchVer,
                  6144,
                  'Simulated Gateway Differential Push',
                  [
                    {
                      triggerPattern: 'hydraulic fluid temp|pressure relief',
                      intent: 'HYDRAULIC_SAFETY_UPDATE',
                      responseTemplate: 'High-viscosity hydraulic oil threshold recalibrated to 78°C. Auxiliary bypass dump valve opened.',
                      actionCode: 'VALVE_BYPASS_OPEN',
                    },
                  ]
                );
              }}
              disabled={otaState !== 'IDLE'}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium rounded-lg transition-colors border border-slate-700 flex items-center gap-2 disabled:opacity-40"
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
              <span>Trigger Gateway Auto-Sync</span>
            </button>

            <button
              onClick={() => {
                runOtaUpdateProcess('v1.CORRUPT.0', 4096, 'Corrupt Payload Test', [], true);
              }}
              disabled={otaState !== 'IDLE'}
              className="px-3 py-2 bg-slate-900 hover:bg-rose-950/40 text-rose-300 text-xs font-mono font-medium rounded-lg transition-colors border border-rose-500/30 flex items-center gap-1.5 disabled:opacity-40"
            >
              <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
              <span>Simulate Corrupt CRC Rollback</span>
            </button>
          </div>
        </div>

        {/* Right Column: AI Model Synthesizer & Knowledge Updater (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/50 border border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <span className="text-sm font-bold text-white tracking-wider font-mono uppercase">
                Synthesize New Knowledge Delta
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Teach the offline chip new rules or emergency protocols. Gemini compiles INT8 weights & triggers, then the chip automatically pulls the update!
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-mono text-slate-300 block">
              Enter New Technical Rule or Equipment Protocol:
            </label>
            <textarea
              rows={3}
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              placeholder="e.g. Drone rotor icing alarm when temp < -2°C and motor current increases by 25%..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />

            <div className="flex flex-wrap gap-1.5">
              {[
                'Post-Quantum ML-KEM OTA Guard',
                'Wi-Fi 7 MLO Telemetry Roaming',
                'Matter 1.4 Smart Load Shedding',
                'Edge NPU INT4 Quantization',
              ].map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => setNewTopic(preset)}
                  className="text-[11px] font-mono px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-cyan-300 transition-colors"
                >
                  + {preset}
                </button>
              ))}
            </div>

            <button
              onClick={handleSynthesizeUpdate}
              disabled={!newTopic.trim() || isCompiling || otaState !== 'IDLE'}
              className="w-full py-2.5 px-4 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              {isCompiling ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Synthesizing INT8 Delta with Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Compile & Push Auto-Update</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Info Box */}
          <div className="bg-slate-950/80 p-3.5 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
            <div className="text-slate-300 font-bold">Why Offline AI Needs Δ-OTA:</div>
            <div>· Full image is 8MB; differential weight delta is ~6KB.</div>
            <div>· Transmitted in seconds over low-power Bluetooth LE or LoRa mesh.</div>
            <div>· Verified before burning to silicon; zero brick risk.</div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Live OTA Terminal Trace */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-[11px] space-y-2">
        <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800/80">
          <span className="text-slate-300 font-bold uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            Autonomous OTA Bootloader Log Stream
          </span>
          <span className="text-slate-500">Dual-Bank Rollback Telemetry</span>
        </div>
        <div className="space-y-0.5 text-slate-400 max-h-28 overflow-y-auto">
          {otaLogs.map((log, i) => (
            <div key={i} className="leading-snug">
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
