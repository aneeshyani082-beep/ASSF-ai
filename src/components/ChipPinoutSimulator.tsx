import React, { useState } from 'react';
import { ChipSpec, CHIP_PRESETS, GpioPin, PartitionSlot } from '../types/edge';
import { Cpu, Zap, Activity, HardDrive, Shield, CheckCircle2, Sliders } from 'lucide-react';
import { sound } from '../services/soundEffects';

interface ChipPinoutSimulatorProps {
  selectedChip: ChipSpec;
  onSelectChip: (chip: ChipSpec) => void;
  activePartition: PartitionSlot;
  currentVersion: string;
  sramUsedKb: number;
  lastLatencyMs: number;
}

export const ChipPinoutSimulator: React.FC<ChipPinoutSimulatorProps> = ({
  selectedChip,
  onSelectChip,
  activePartition,
  currentVersion,
  sramUsedKb,
  lastLatencyMs,
}) => {
  // Interactive GPIO Pins State
  const [pins, setPins] = useState<GpioPin[]>([
    { pinNumber: 4, name: 'GPIO4 (ADC1_CH3)', function: 'ADC', state: 'ANALOG', analogValue: 3.28 },
    { pinNumber: 14, name: 'GPIO14 (PWM_COOL)', function: 'PWM', state: 'HIGH', analogValue: 80 },
    { pinNumber: 16, name: 'GPIO16 (SAFETY_RELAY)', function: 'RELAY', state: 'LOW', isTriggered: false },
    { pinNumber: 18, name: 'GPIO18 (SOLENOID)', function: 'GPIO', state: 'LOW', isTriggered: false },
    { pinNumber: 21, name: 'GPIO21 (I2C_SDA)', function: 'I2C', state: 'HIGH' },
    { pinNumber: 22, name: 'GPIO22 (ARC_ISOLATE)', function: 'RELAY', state: 'LOW', isTriggered: false },
  ]);

  const [selectedPin, setSelectedPin] = useState<GpioPin | null>(pins[0]);
  const [junctionTemp, setJunctionTemp] = useState(41.8);

  const togglePin = (pinNumber: number) => {
    sound.playFlashTick();
    setPins((prev) =>
      prev.map((p) => {
        if (p.pinNumber === pinNumber) {
          const nextState = p.state === 'HIGH' ? 'LOW' : 'HIGH';
          return { ...p, state: nextState, isTriggered: nextState === 'HIGH' };
        }
        return p;
      })
    );
  };

  const updateAnalogValue = (pinNumber: number, val: number) => {
    setPins((prev) =>
      prev.map((p) => (p.pinNumber === pinNumber ? { ...p, analogValue: val } : p))
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Section: Chip Model Selector & Overview */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-white tracking-tight">
            Target Microcontroller Silicon & Vector Architecture
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Hardware-level memory mapping, INT8 execution registers, and peripheral pinouts.
          </p>
        </div>

        {/* Hardware Preset Selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="chip-selector" className="text-xs font-mono text-slate-400 uppercase">
            Select Chip:
          </label>
          <select
            id="chip-selector"
            value={selectedChip.id}
            onChange={(e) => {
              const next = CHIP_PRESETS[e.target.value];
              if (next) {
                onSelectChip(next);
                sound.playChipBuzzer(1200);
              }
            }}
            className="bg-slate-950 border border-slate-700 text-slate-200 text-xs font-medium rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 font-mono"
          >
            {Object.values(CHIP_PRESETS).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.clockMhz}MHz)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: Visual Silicon Die & Physical Reference */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Interactive Silicon Block Diagram (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900/40 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-6">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-cyan-400" />
              <span className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                {selectedChip.name} Internal Die Layout
              </span>
            </div>
            <div className="text-xs font-mono text-slate-400">
              Vdd = {selectedChip.voltage}V · Clock = {selectedChip.clockMhz} MHz
            </div>
          </div>

          {/* Silicon Architecture Diagram */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Core 0 & Core 1 */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400 uppercase font-bold">Dual CPU Cores</span>
                <span className="text-xs font-mono text-emerald-400">240 MHz</span>
              </div>
              <div className="space-y-2">
                <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                  <div className="text-xs font-mono text-slate-300 flex justify-between">
                    <span>CPU Core 0 (System)</span>
                    <span className="text-cyan-400">18% Load</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                    <div className="bg-cyan-500 h-full w-[18%] transition-all duration-300"></div>
                  </div>
                </div>

                <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                  <div className="text-xs font-mono text-slate-300 flex justify-between">
                    <span>CPU Core 1 (Edge AI)</span>
                    <span className="text-emerald-400">{lastLatencyMs > 0 ? 'Active' : 'Standby'}</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                    <div className="bg-emerald-500 h-full w-[64%] transition-all duration-300"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Neural Vector Unit (NPU / Accelerator) */}
            <div className="bg-cyan-950/20 border border-cyan-500/30 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-cyan-300 uppercase font-bold">Neural Engine</span>
                <span className="text-xs font-mono text-cyan-400">INT8 GEMM</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {selectedChip.npuArchitecture}
              </p>
              <div className="bg-slate-950/80 p-2.5 rounded border border-cyan-500/20 text-xs font-mono space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Quantization:</span>
                  <span className="text-slate-200">INT8 Per-Tensor</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Weight Precision:</span>
                  <span className="text-slate-200">8-bit Signed (-128..127)</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Activation Math:</span>
                  <span className="text-slate-200">Fixed-Point ReLU</span>
                </div>
              </div>
            </div>

            {/* SRAM & Register Banks */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400 uppercase font-bold">SRAM Banks</span>
                <span className="text-xs font-mono text-slate-300">{selectedChip.sramKb} KB Total</span>
              </div>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Used by Model:</span>
                  <span className="text-cyan-400">{sramUsedKb} KB</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Free Heap:</span>
                  <span className="text-slate-300">{selectedChip.sramKb - sramUsedKb} KB</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
                  <div
                    className="bg-cyan-500 h-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (sramUsedKb / selectedChip.sramKb) * 100)}%` }}
                  ></div>
                </div>
                <div className="text-[11px] text-slate-500 pt-1">
                  Static memory map: 0 dynamic heap leaks.
                </div>
              </div>
            </div>
          </div>

          {/* Flash Dual-Partition Flash Visualizer (Crucial for OTA Auto-Update!) */}
          <div className="mt-6 bg-slate-950/90 border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-mono text-slate-300 font-bold uppercase tracking-wider">
                  Flash Memory A/B Partition Layout ({selectedChip.flashMb} MB Flash)
                </span>
              </div>
              <span className="text-xs font-mono text-slate-500">Atomic Rollback Guard Active</span>
            </div>

            {/* Partition Bars */}
            <div className="grid grid-cols-12 gap-2 text-xs font-mono">
              {/* Bootloader & NVS */}
              <div className="col-span-2 bg-slate-800/80 border border-slate-700/60 rounded p-2 text-center">
                <div className="text-slate-400 text-[10px] uppercase">Boot & NVS</div>
                <div className="text-slate-300 font-bold mt-0.5">64 KB</div>
              </div>

              {/* Partition OTA_0 */}
              <div
                className={`col-span-5 rounded p-2.5 border transition-all ${
                  activePartition === 'OTA_0'
                    ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-200'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">PARTITION OTA_0 (3MB)</span>
                  {activePartition === 'OTA_0' && (
                    <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded font-mono">
                      ACTIVE BOOT
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Firmware: {activePartition === 'OTA_0' ? currentVersion : 'Standby Image'}
                </div>
              </div>

              {/* Partition OTA_1 */}
              <div
                className={`col-span-5 rounded p-2.5 border transition-all ${
                  activePartition === 'OTA_1'
                    ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-200'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">PARTITION OTA_1 (3MB)</span>
                  {activePartition === 'OTA_1' && (
                    <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded font-mono">
                      ACTIVE BOOT
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Firmware: {activePartition === 'OTA_1' ? currentVersion : 'Target OTA Flash Buffer'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Physical Reference Image & Live Telemetry (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Microcontroller Macro Photo Reference Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
            <div className="relative h-44 w-full bg-slate-950">
              <img
                src="/src/assets/images/edge_ai_microcontroller_chip_1794327833735.jpg"
                alt="ASSF Neural Silicon Chip on PCB"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
              <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-xs font-mono text-cyan-300">
                <span className="font-bold">HARDWARE REFERENCE</span>
                <span>FABRICATED MCU</span>
              </div>
            </div>
            <div className="p-4 space-y-3 text-xs">
              <div className="flex justify-between font-mono text-slate-400">
                <span>Silicon Package:</span>
                <span className="text-slate-200">QFN-56 (7x7mm)</span>
              </div>
              <div className="flex justify-between font-mono text-slate-400">
                <span>Power Rating:</span>
                <span className="text-slate-200">{selectedChip.activePowerMw} mW @ full load</span>
              </div>
              <div className="flex justify-between font-mono text-slate-400">
                <span>Junction Temperature:</span>
                <span className="text-emerald-400 tabular-nums">{junctionTemp.toFixed(1)}°C (Nominal)</span>
              </div>
              <div className="flex justify-between font-mono text-slate-400">
                <span>Wireless Radios:</span>
                <span className="text-slate-200">{selectedChip.wirelessCapabilities[0]}</span>
              </div>
            </div>
          </div>

          {/* Quick Real-Time Thermal / Power Gauge */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 uppercase font-bold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Active Silicon Power
              </span>
              <span className="text-amber-400 font-bold tabular-nums">
                {(selectedChip.activePowerMw * 0.92).toFixed(1)} mW
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div className="bg-amber-500 h-full w-[42%]"></div>
            </div>
            <div className="flex justify-between text-[11px] font-mono text-slate-500">
              <span>Deep Sleep: {selectedChip.idlePowerMw}mW</span>
              <span>Peak: {selectedChip.activePowerMw}mW</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Interactive GPIO & Peripheral Matrix */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight">
              Peripheral Pinout & Hardware Trigger Matrix
            </h3>
            <p className="text-xs text-slate-400">
              Click pins to trigger analog voltages or toggle relays commanded by the offline AI.
            </p>
          </div>
          <span className="text-xs font-mono text-cyan-400">
            {pins.filter((p) => p.state === 'HIGH' || p.isTriggered).length} Pin Signals Active
          </span>
        </div>

        {/* Pin Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {pins.map((pin) => (
            <div
              key={pin.pinNumber}
              onClick={() => {
                setSelectedPin(pin);
                if (pin.function === 'RELAY' || pin.function === 'GPIO') {
                  togglePin(pin.pinNumber);
                }
              }}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                selectedPin?.pinNumber === pin.pinNumber
                  ? 'border-cyan-500/80 bg-slate-900 shadow-sm shadow-cyan-950'
                  : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-slate-300">P{pin.pinNumber}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                    pin.state === 'HIGH' || pin.isTriggered
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : pin.state === 'ANALOG'
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {pin.state}
                </span>
              </div>
              <div className="text-xs text-slate-300 font-medium mt-1 truncate">{pin.name}</div>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                {pin.function === 'ADC'
                  ? `${pin.analogValue}V`
                  : pin.function === 'PWM'
                  ? `${pin.analogValue}% duty`
                  : pin.function}
              </div>
            </div>
          ))}
        </div>

        {/* Selected Pin Detail Editor */}
        {selectedPin && (
          <div className="mt-3 bg-slate-950 border border-slate-800/80 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs font-mono">
            <div className="flex items-center gap-3">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <div>
                <span className="text-slate-300 font-bold">{selectedPin.name}</span>
                <span className="text-slate-500 ml-2">({selectedPin.function} Mode)</span>
              </div>
            </div>

            {selectedPin.function === 'ADC' && (
              <div className="flex items-center gap-3 w-full md:w-72">
                <span className="text-slate-400">Sensor Voltage:</span>
                <input
                  type="range"
                  min="0"
                  max="3.3"
                  step="0.05"
                  value={selectedPin.analogValue || 1.65}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    updateAnalogValue(selectedPin.pinNumber, val);
                    setSelectedPin({ ...selectedPin, analogValue: val });
                  }}
                  className="w-full accent-cyan-400"
                />
                <span className="text-cyan-400 font-bold tabular-nums">
                  {selectedPin.analogValue?.toFixed(2)}V
                </span>
              </div>
            )}

            {(selectedPin.function === 'RELAY' || selectedPin.function === 'GPIO') && (
              <button
                onClick={() => togglePin(selectedPin.pinNumber)}
                className={`px-3 py-1.5 rounded font-bold text-xs transition-colors ${
                  selectedPin.state === 'HIGH'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                }`}
              >
                Toggle {selectedPin.state === 'HIGH' ? 'LOW (Open)' : 'HIGH (Energize)'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
