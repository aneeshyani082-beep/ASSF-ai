import React, { useState } from 'react';
import { ChipSpec, KnowledgeItem } from '../types/edge';
import {
  generateFirmwareFiles,
  downloadFirmwareZip,
  exportKnowledgeDataset,
  FirmwareBundle,
} from '../services/firmwareGenerator';
import { sound } from '../services/soundEffects';
import {
  Download,
  Copy,
  Check,
  FileCode,
  Usb,
  ShieldCheck,
  Cpu,
  Layers,
  Plus,
  BookOpen,
  Database,
  Search,
  FileText,
  Table,
  Sparkles,
  GraduationCap,
  X,
  Code2,
} from 'lucide-react';

interface FirmwareExporterProps {
  chip: ChipSpec;
  knowledge: KnowledgeItem[];
  currentVersion: string;
  onAddKnowledge?: (item: KnowledgeItem) => void;
}

export const FirmwareExporter: React.FC<FirmwareExporterProps> = ({
  chip,
  knowledge,
  currentVersion,
  onAddKnowledge,
}) => {
  const [selectedFile, setSelectedFile] = useState<keyof FirmwareBundle>('mainCpp');
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [serialStatus, setSerialStatus] = useState<string>('Ready to connect');
  const [isIdeaFormOpen, setIsIdeaFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Idea Form State
  const [ideaTopic, setIdeaTopic] = useState('');
  const [ideaCategory, setIdeaCategory] = useState<KnowledgeItem['category']>('B.Tech');
  const [ideaTriggers, setIdeaTriggers] = useState('');
  const [ideaIntent, setIdeaIntent] = useState('');
  const [ideaAction, setIdeaAction] = useState('NO_ACTION');
  const [ideaResponse, setIdeaResponse] = useState('');

  const bundle = generateFirmwareFiles(chip, knowledge, currentVersion);

  const fileMap: { key: keyof FirmwareBundle; label: string; ext: string; badge?: string }[] = [
    { key: 'mainCpp', label: 'main.cpp', ext: 'C++' },
    { key: 'edgeModelH', label: 'edge_model.h', ext: 'Header' },
    { key: 'knowledgeTableH', label: 'knowledge_table.h', ext: 'C Header', badge: 'Knowledge' },
    { key: 'knowledgeJson', label: 'knowledge_dataset.json', ext: 'JSON', badge: 'Export' },
    { key: 'knowledgeCsv', label: 'knowledge_manifest.csv', ext: 'CSV', badge: 'Export' },
    { key: 'knowledgeMarkdown', label: 'knowledge_encyclopedia.md', ext: 'Markdown', badge: 'Docs' },
    { key: 'tinymlGemmC', label: 'tinyml_gemm.c', ext: 'C' },
    { key: 'autoOtaEngineC', label: 'auto_ota_engine.c', ext: 'C' },
    { key: 'partitionsCsv', label: 'partitions.csv', ext: 'CSV' },
    { key: 'platformioIni', label: 'platformio.ini', ext: 'INI' },
    { key: 'readmeMd', label: 'README.md', ext: 'Markdown' },
  ];

  // Quick Preset Ideas for rapid testing
  const ideaPresets = [
    {
      title: 'Fast Fourier Transform (FFT) Radix-2',
      category: 'B.Tech' as const,
      triggers: 'fft|fast fourier transform|dft|radix-2|butterfly computation',
      intent: 'BTECH_DSP_FFT_ALGO',
      action: 'EXEC_DSP_ACCEL',
      response: `[ASSF B.TECH DSP: FAST FOURIER TRANSFORM]
Radix-2 Decimation-in-Time (DIT) FFT reduces DFT complexity from O(N²) to O(N log₂ N).
Key Butterfly Formula:
  X[k]       = E[k] + W_N^k · O[k]
  X[k + N/2] = E[k] - W_N^k · O[k]
Where twiddle factor W_N^k = e^(-j·2πk/N).
Silicon Implementation: Stored in lookup table; executed in 14 µs on dual-core DSP ALU.`,
    },
    {
      title: 'Python Multiprocessing Shared Memory',
      category: 'Python' as const,
      triggers: 'python multiprocessing|shared memory python|multiprocessing value|ipc python',
      intent: 'PYTHON_MULTIPROCESSING_SHARED_MEM',
      action: 'PYTHON_EXEC_CODE',
      response: `[ASSF PYTHON CORE: INTER-PROCESS COMMUNICATION]
Shared memory IPC bypassing the Global Interpreter Lock (GIL) using \`multiprocessing.shared_memory\`:

\`\`\`python
from multiprocessing import shared_memory
import numpy as np

# Allocate 1MB shared buffer
shm = shared_memory.SharedMemory(create=True, size=1024 * 1024)
arr = np.ndarray((1024, 256), dtype=np.int32, buffer=shm.buf)
arr[:] = 42  # Shared across all worker child processes zero-copy
\`\`\`
Performance: Zero serialization overhead compared to Queue or Pipe.`,
    },
    {
      title: 'Java CompletableFuture Async Pipeline',
      category: 'Java' as const,
      triggers: 'completablefuture|async pipeline java|thenapply|thencompose|java async',
      intent: 'JAVA_COMPLETABLE_FUTURE_ASYNC',
      action: 'JAVA_EXEC_CODE',
      response: `[ASSF JAVA CORE: NON-BLOCKING ASYNC COMPOSITION]
\`\`\`java
CompletableFuture.supplyAsync(() -> fetchRawSensorData())
    .thenApplyAsync(data -> filterInt8Matrix(data))
    .thenAccept(result -> publishToTelemetryQueue(result))
    .exceptionally(ex -> { logError(ex); return null; });
\`\`\`
Enables responsive reactive streaming without thread starvation.`,
    },
    {
      title: 'Maxwell’s 4 Electromagnetic Equations',
      category: 'World' as const,
      triggers: 'maxwell equations|gauss law|faraday law|ampere circuital law|electromagnetism',
      intent: 'PHYSICS_MAXWELL_EQUATIONS',
      action: 'PHYSICS_ENCYCLOPEDIA',
      response: `[ASSF WORLD SCIENCE: ELECTROMAGNETIC FIELD THEORY]
Maxwell's 4 Unified Differential Equations:
1. Gauss's Law: ∇ · E = ρ / ε₀ (Electric charges produce divergence)
2. Gauss's Magnetism: ∇ · B = 0 (No magnetic monopoles)
3. Faraday's Law: ∇ × E = -∂B/∂t (Time-varying B creates circulating E)
4. Ampère-Maxwell Law: ∇ × B = μ₀(J + ε₀ ∂E/∂t) (Currents & displacement currents create circulating B).`,
    },
  ];

  const handleApplyPreset = (preset: typeof ideaPresets[0]) => {
    setIdeaTopic(preset.title);
    setIdeaCategory(preset.category);
    setIdeaTriggers(preset.triggers);
    setIdeaIntent(preset.intent);
    setIdeaAction(preset.action);
    setIdeaResponse(preset.response);
  };

  const handleSaveIdea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ideaTopic.trim() || !ideaTriggers.trim() || !ideaResponse.trim()) {
      return;
    }

    sound.playFlashTick();

    const newItem: KnowledgeItem = {
      id: `idea-${Date.now()}`,
      triggerPattern: ideaTriggers.toLowerCase(),
      intent: ideaIntent.trim() || `CUSTOM_IDEA_${Date.now()}`,
      responseTemplate: ideaResponse.trim(),
      actionCode: ideaAction.trim() || 'NO_ACTION',
      category: ideaCategory,
      addedInVersion: currentVersion,
    };

    if (onAddKnowledge) {
      onAddKnowledge(newItem);
    }

    setToastMessage(`Baked idea "${ideaTopic}" into silicon knowledge bank! Total rules: ${knowledge.length + 1}`);
    setTimeout(() => setToastMessage(null), 4000);

    // Reset Form
    setIdeaTopic('');
    setIdeaTriggers('');
    setIdeaIntent('');
    setIdeaResponse('');
    setIsIdeaFormOpen(false);
    sound.playOtaSuccess();
  };

  const handleCopy = () => {
    sound.playFlashTick();
    navigator.clipboard.writeText(bundle[selectedFile]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    sound.playFlashTick();
    setIsZipping(true);
    try {
      const blob = await downloadFirmwareZip(chip, knowledge, currentVersion);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `assf_ai_${chip.id}_${currentVersion}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      sound.playOtaSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setIsZipping(false);
    }
  };

  const handleConnectSerial = async () => {
    sound.playFlashTick();
    if (!('serial' in navigator)) {
      setSerialStatus('Web Serial API not supported in this browser (Chrome/Edge recommended)');
      return;
    }
    try {
      setSerialStatus('Opening serial port prompt...');
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 115200 });
      setSerialStatus('CONNECTED: USB Serial active @ 115200 baud. Ready to stream.');
      sound.playOtaSuccess();
    } catch (err: any) {
      setSerialStatus(`Serial connection cancelled or failed: ${err.message}`);
    }
  };

  // Category counts
  const categoryCounts = knowledge.reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {});

  const filteredKnowledge = knowledge.filter(
    (k) =>
      k.triggerPattern.toLowerCase().includes(searchQuery.toLowerCase()) ||
      k.intent.toLowerCase().includes(searchQuery.toLowerCase()) ||
      k.responseTemplate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      k.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
              <FileCode className="w-5 h-5 text-cyan-400" />
              Embedded C/C++ Firmware & Knowledge Exporter
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-mono">
              v{currentVersion}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Flashable C/C++ source code, standalone knowledge tables, and complete idea datasets tailored for {chip.name}.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsIdeaFormOpen(!isIdeaFormOpen)}
            className="px-3.5 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-500/40 font-semibold text-xs rounded-lg transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4 text-indigo-400" />
            <span>Add Knowledge Idea</span>
          </button>

          <button
            onClick={handleDownloadZip}
            disabled={isZipping}
            className="px-4 py-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>{isZipping ? 'Bundling...' : 'Download Full Package (.ZIP)'}</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="bg-emerald-950/90 border border-emerald-500/60 text-emerald-300 text-xs font-mono px-4 py-2.5 rounded-xl flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-bold uppercase">Flash Updated</span>
        </div>
      )}

      {/* Idea Ingestion Studio Form (Expandable) */}
      {isIdeaFormOpen && (
        <div className="bg-slate-900/90 border border-indigo-500/40 rounded-xl p-5 space-y-4 shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Add Knowledge Idea into Silicon Knowledge Bank</h3>
            </div>
            <button
              onClick={() => setIsIdeaFormOpen(false)}
              className="text-slate-400 hover:text-slate-200 p-1 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Presets Selection */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Or choose a pre-formulated engineering preset:</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              {ideaPresets.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-mono whitespace-nowrap transition-colors"
                >
                  {p.title}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSaveIdea} className="space-y-4 text-xs font-mono">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 block mb-1">Idea / Topic Title</label>
                <input
                  type="text"
                  value={ideaTopic}
                  onChange={(e) => setIdeaTopic(e.target.value)}
                  placeholder="e.g. Radix-2 FFT Algorithm or Python GIL bypass"
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Domain / Category</label>
                <select
                  value={ideaCategory}
                  onChange={(e) => setIdeaCategory(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-400"
                >
                  <option value="B.Tech">🎓 B.Tech Engineering</option>
                  <option value="Python">🐍 Python Mastery</option>
                  <option value="Java">☕ Java Mastery</option>
                  <option value="C++">⚡ C++ Mastery</option>
                  <option value="World">🌍 Universal World STEM</option>
                  <option value="Science">🔬 Science & Physics</option>
                  <option value="Industrial">⚙️ Industrial Telemetry</option>
                  <option value="Medical">🩺 Biomedical</option>
                  <option value="Custom">✨ Custom Idea</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="text-slate-300 block mb-1">
                  Trigger Keywords (pipe \`|\` separated for offline INT8 matching)
                </label>
                <input
                  type="text"
                  value={ideaTriggers}
                  onChange={(e) => setIdeaTriggers(e.target.value)}
                  placeholder="e.g. fft|fast fourier transform|radix-2|dft"
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Intent ID / Action Code</label>
                <input
                  type="text"
                  value={ideaIntent}
                  onChange={(e) => setIdeaIntent(e.target.value)}
                  placeholder="e.g. ALGO_FFT_EXEC"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-400"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-300 block mb-1">Offline Solution / Response Template</label>
              <textarea
                value={ideaResponse}
                onChange={(e) => setIdeaResponse(e.target.value)}
                rows={5}
                placeholder="The comprehensive, step-by-step solution, mathematical formulas, or code that ASSF will output offline when triggered..."
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 focus:outline-none focus:border-indigo-400 font-mono text-xs leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsIdeaFormOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Bake Idea into Silicon Knowledge Base</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Knowledge Dataset Export Actions Hub */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <span>Silicon Knowledge Base ({knowledge.length} Offline Rules & Ideas)</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Target MCU: {chip.name} · Flash: {chip.flashMb}MB · SRAM: {chip.sramKb}KB
            </div>
          </div>

          {/* Direct Knowledge Export Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
            <span className="text-[11px] text-slate-400 font-semibold mr-1">Export As:</span>
            <button
              onClick={() => {
                sound.playFlashTick();
                exportKnowledgeDataset(knowledge, currentVersion, 'json', chip);
              }}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors text-[11px]"
              title="Download structured JSON dataset"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>JSON</span>
            </button>

            <button
              onClick={() => {
                sound.playFlashTick();
                exportKnowledgeDataset(knowledge, currentVersion, 'c_header', chip);
              }}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors text-[11px]"
              title="Download C/C++ knowledge_table.h header"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>C Header (.h)</span>
            </button>

            <button
              onClick={() => {
                sound.playFlashTick();
                exportKnowledgeDataset(knowledge, currentVersion, 'csv', chip);
              }}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors text-[11px]"
              title="Download CSV manifest spreadsheet"
            >
              <Table className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>

            <button
              onClick={() => {
                sound.playFlashTick();
                exportKnowledgeDataset(knowledge, currentVersion, 'markdown', chip);
              }}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors text-[11px]"
              title="Download Markdown reference manual"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Markdown (.md)</span>
            </button>
          </div>
        </div>

        {/* Category Breakdown Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono py-1">
          <span className="text-slate-500 font-semibold mr-1">Breakdown:</span>
          {Object.entries(categoryCounts).map(([cat, count]) => (
            <span
              key={cat}
              className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-slate-300 whitespace-nowrap"
            >
              <strong className="text-cyan-400">{cat}</strong>: {count}
            </span>
          ))}
        </div>
      </div>

      {/* Main Code Studio Grid */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[580px]">
        {/* File Tabs & Actions Toolbar */}
        <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          {/* File Selectors */}
          <div className="flex items-center gap-1 overflow-x-auto py-1">
            {fileMap.map((f) => (
              <button
                key={f.key}
                onClick={() => {
                  setSelectedFile(f.key);
                  sound.playFlashTick();
                }}
                className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  selectedFile === f.key
                    ? 'bg-slate-800 text-cyan-300 font-bold border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <span>{f.label}</span>
                {f.badge && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                    {f.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Copy Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-lg text-slate-300 text-xs font-mono transition-colors flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy File'}</span>
            </button>
          </div>
        </div>

        {/* Code Viewer */}
        <div className="flex-1 bg-slate-950 p-4 overflow-auto font-mono text-xs text-slate-300 leading-relaxed">
          <pre className="whitespace-pre">{bundle[selectedFile]}</pre>
        </div>

        {/* Bottom Hardware Flashing Status Bar */}
        <div className="bg-slate-900/80 px-4 py-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-400">
            <Usb className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-300 font-semibold">Web Serial Flasher:</span>
            <span className="text-slate-400 truncate">{serialStatus}</span>
          </div>

          <button
            onClick={handleConnectSerial}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/40 rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Usb className="w-3.5 h-3.5" />
            <span>Connect USB Microcontroller</span>
          </button>
        </div>
      </div>

      {/* Flashing Instructions Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="text-slate-200 font-bold font-mono flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            1. Arduino IDE Setup
          </div>
          <p className="text-slate-400 leading-relaxed">
            Open Arduino IDE, select your board ({chip.name}), select partition scheme with OTA support, copy the files, and click Upload.
          </p>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="text-slate-200 font-bold font-mono flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            2. PlatformIO Compilation
          </div>
          <p className="text-slate-400 leading-relaxed">
            Extract the downloaded zip, open in VS Code with PlatformIO extension installed, and run <code className="text-cyan-300">pio run -t upload</code>.
          </p>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="text-slate-200 font-bold font-mono flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            3. Autonomous Updates
          </div>
          <p className="text-slate-400 leading-relaxed">
            Once flashed to silicon, the device operates 100% offline and automatically syncs incremental deltas over Wi-Fi/BLE whenever available.
          </p>
        </div>
      </div>
    </div>
  );
};
