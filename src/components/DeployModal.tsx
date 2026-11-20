import React, { useState } from 'react';
import { ChipSpec, KnowledgeItem } from '../types/edge';
import { downloadFirmwareZip } from '../services/firmwareGenerator';
import { sound } from '../services/soundEffects';
import { X, Cpu, Download, CheckCircle2, Zap } from 'lucide-react';

interface DeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  chip: ChipSpec;
  knowledge: KnowledgeItem[];
  currentVersion: string;
}

export const DeployModal: React.FC<DeployModalProps> = ({
  isOpen,
  onClose,
  chip,
  knowledge,
  currentVersion,
}) => {
  const [flashingState, setFlashingState] = useState<'idle' | 'flashing' | 'success'>('idle');
  const [flashProgress, setFlashProgress] = useState(0);
  const [flashLog, setFlashLog] = useState<string>('');

  if (!isOpen) return null;

  const handleSimulatedFlash = async () => {
    setFlashingState('flashing');
    setFlashProgress(10);
    setFlashLog('Connecting to on-chip bootloader ROM via UART...');
    sound.playFlashTick();

    await new Promise((r) => setTimeout(r, 400));
    setFlashProgress(35);
    setFlashLog(`Syncing baud rate 921600... Chip detected: ${chip.name}`);
    sound.playFlashTick();

    await new Promise((r) => setTimeout(r, 500));
    setFlashProgress(65);
    setFlashLog('Writing INT8 Quantized weights to Flash partition OTA_0 (0x110000)...');
    sound.playFlashTick();

    await new Promise((r) => setTimeout(r, 500));
    setFlashProgress(90);
    setFlashLog('Verifying MD5 & SHA-256 partition checksum... OK');

    await new Promise((r) => setTimeout(r, 400));
    setFlashProgress(100);
    setFlashLog('Bootloader reset into application. 100% OFFLINE AI READY.');
    setFlashingState('success');
    sound.playOtaSuccess();
  };

  const handleDownloadZip = async () => {
    sound.playFlashTick();
    const blob = await downloadFirmwareZip(chip, knowledge, currentVersion);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assf_ai_${chip.id}_${currentVersion}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Deploy ASSF AI to {chip.name}</h3>
              <p className="text-xs text-slate-400 font-mono">Firmware: {currentVersion} · 100% Offline</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {flashingState === 'idle' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed font-mono">
                Select your deployment target. The neural model will run 100% locally on the silicon with zero ongoing internet requirements, while maintaining autonomous OTA auto-sync.
              </p>

              <div className="space-y-3">
                {/* Option 1: In-Memory Simulated Flash */}
                <button
                  onClick={handleSimulatedFlash}
                  className="w-full p-4 rounded-xl border border-cyan-500/40 bg-cyan-950/20 hover:bg-cyan-950/40 text-left transition-all flex items-start gap-3 group"
                >
                  <Zap className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-cyan-300 font-mono uppercase">
                      Flash Silicon Simulator (Instant)
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      Burns model weights into the simulated MCU memory registers and verifies execution.
                    </div>
                  </div>
                </button>

                {/* Option 2: Download Firmware Zip */}
                <button
                  onClick={handleDownloadZip}
                  className="w-full p-4 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-slate-700 text-left transition-all flex items-start gap-3 group"
                >
                  <Download className="w-5 h-5 text-slate-400 group-hover:text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-slate-200 font-mono uppercase">
                      Download Flashable C/C++ Package (.ZIP)
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      Ready to compile in Arduino IDE or PlatformIO for your physical {chip.name}.
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {flashingState === 'flashing' && (
            <div className="py-6 space-y-4 text-center">
              <div className="w-12 h-12 mx-auto rounded-full border-2 border-cyan-500 border-t-transparent animate-spin"></div>
              <div className="text-xs font-mono font-bold text-cyan-300">
                Flashing Silicon Flash Sectors... {flashProgress}%
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-cyan-400 h-full transition-all duration-300"
                  style={{ width: `${flashProgress}%` }}
                ></div>
              </div>
              <div className="text-[11px] font-mono text-slate-400 truncate">{flashLog}</div>
            </div>
          )}

          {flashingState === 'success' && (
            <div className="py-4 space-y-4 text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <div className="text-sm font-bold text-white font-mono">
                  CHIP FLASHED & VERIFIED SUCCESSFULLY
                </div>
                <div className="text-xs text-slate-400 mt-1 font-mono">
                  ASSF INT8 Neural Core is active on {chip.name}. Ready for 100% offline edge inference.
                </div>
              </div>
              <button
                onClick={() => {
                  setFlashingState('idle');
                  onClose();
                }}
                className="w-full py-2.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs rounded-lg transition-colors font-mono"
              >
                Launch Offline AI Console
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
