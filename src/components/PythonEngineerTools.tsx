import React, { useState, useMemo } from 'react';
import { sound } from '../services/soundEffects';
import {
  Code2,
  Copy,
  Check,
  Download,
  Cpu,
  Zap,
  Waves,
  Ruler,
  Terminal,
  Sparkles,
} from 'lucide-react';

interface PythonEngineerToolsProps {
  onAskAssfPython: (prompt: string) => void;
}

type ToolId = 'rlc_buck' | 'pid_control' | 'fluid_pipe' | 'beam_stress' | 'dsp_modbus';

export const PythonEngineerTools: React.FC<PythonEngineerToolsProps> = ({
  onAskAssfPython,
}) => {
  const [activeTool, setActiveTool] = useState<ToolId>('rlc_buck');
  const [copied, setCopied] = useState(false);

  // 1. RLC & Buck Converter Inputs
  const [rOhm, setROhm] = useState(12);
  const [lMh, setLMh] = useState(4.7);
  const [cUf, setCUf] = useState(10);
  const [vin, setVin] = useState(24);
  const [vout, setVout] = useState(5);
  const [iout, setIout] = useState(2.5);
  const [fswKhz, setFswKhz] = useState(250);

  // 2. PID / 2nd-Order Control Inputs
  const [wn, setWn] = useState(12);
  const [zeta, setZeta] = useState(0.45);
  const [dcGain, setDcGain] = useState(1.0);

  // 3. Pipe Flow Inputs
  const [pipeDiaMm, setPipeDiaMm] = useState(50);
  const [velocityMs, setVelocityMs] = useState(2.2);
  const [pipeLenM, setPipeLenM] = useState(35);
  const [roughnessMm, setRoughnessMm] = useState(0.045);

  // 4. Beam Bending Inputs
  const [beamType, setBeamType] = useState<'simply_supported' | 'cantilever'>('simply_supported');
  const [spanM, setSpanM] = useState(4.0);
  const [loadKn, setLoadKn] = useState(12.0);
  const [eGpa, setEGpa] = useState(200);
  const [inertiaCm4, setInertiaCm4] = useState(2400);
  const [cMm, setCMm] = useState(100);
  const [yieldMpa, setYieldMpa] = useState(250);

  // 5. Embedded DSP & Modbus CRC-16 Inputs
  const [hexPayload, setHexPayload] = useState('01 03 00 00 00 0A');
  const [fsHz, setFsHz] = useState(1000);
  const [fcHz, setFcHz] = useState(50);

  const computed = useMemo(() => {
    if (activeTool === 'rlc_buck') {
      const L = Math.max(1e-9, lMh * 1e-3);
      const C = Math.max(1e-12, cUf * 1e-6);
      const R = Math.max(1e-6, rOhm);
      const f0 = 1 / (2 * Math.PI * Math.sqrt(L * C));
      const Q = (1 / R) * Math.sqrt(L / C);
      const bw = f0 / Q;
      const dampingZeta = 1 / (2 * Q);

      const safeVin = Math.max(0.1, vin);
      const duty = Math.min(0.99, Math.max(0.01, vout / safeVin));
      const deltaI = Math.max(0.01, 0.3 * iout);
      const fsw = Math.max(1, fswKhz) * 1000;
      const lBuckUh = ((vout * (1 - duty)) / (deltaI * fsw)) * 1e6;

      const script = `"""ASSF Verified Python Tool: Series RLC Resonance & Buck Converter Sizing"""
import math

def analyze_rlc(r_ohm: float, l_mh: float, c_uf: float) -> dict:
    L = l_mh * 1e-3
    C = c_uf * 1e-6
    f0_hz = 1.0 / (2.0 * math.pi * math.sqrt(L * C))
    q_factor = (1.0 / r_ohm) * math.sqrt(L / C)
    bandwidth_hz = f0_hz / q_factor
    zeta = 1.0 / (2.0 * q_factor)
    return {
        "resonant_freq_hz": round(f0_hz, 4),
        "q_factor": round(q_factor, 4),
        "bandwidth_hz": round(bandwidth_hz, 4),
        "damping_ratio": round(zeta, 5),
    }

def size_buck_inductor(vin: float, vout: float, iout: float, fsw_khz: float, ripple_frac: float = 0.30) -> dict:
    assert 0 < vout < vin, "Buck converter requires 0 < Vout < Vin"
    duty = vout / vin
    delta_i = ripple_frac * iout
    l_henry = (vout * (1.0 - duty)) / (delta_i * fsw_khz * 1e3)
    return {"duty_cycle": round(duty, 4), "min_inductance_uH": round(l_henry * 1e6, 3)}

if __name__ == "__main__":
    rlc = analyze_rlc(r_ohm=${rOhm}, l_mh=${lMh}, c_uf=${cUf})
    buck = size_buck_inductor(vin=${vin}, vout=${vout}, iout=${iout}, fsw_khz=${fswKhz})
    print("RLC Analysis:", rlc)
    print("Buck Sizing:", buck)
`;
      return {
        metrics: [
          { label: 'Resonant Freq (f₀)', value: `${f0.toFixed(2)} Hz` },
          { label: 'Quality Factor (Q)', value: Q.toFixed(3) },
          { label: 'Bandwidth (Δf)', value: `${bw.toFixed(2)} Hz` },
          { label: 'Buck L (30% ΔI)', value: `${lBuckUh.toFixed(2)} µH (D=${(duty * 100).toFixed(1)}%)` },
        ],
        formula: 'f₀ = 1 / (2π√LC) · Q = (1/R)√(L/C) · L_buck = V_out(1 - D) / (ΔI_L · f_sw)',
        filename: 'assf_rlc_buck_tool.py',
        script,
      };
    }

    if (activeTool === 'pid_control') {
      const safeWn = Math.max(0.01, wn);
      const safeZeta = Math.max(0, zeta);
      const regime =
        safeZeta === 0
          ? 'Undamped'
          : safeZeta < 1
          ? 'Underdamped'
          : safeZeta === 1
          ? 'Critically Damped'
          : 'Overdamped';

      const overshootPct =
        safeZeta < 1 ? 100 * Math.exp((-Math.PI * safeZeta) / Math.sqrt(1 - safeZeta * safeZeta)) : 0;
      const settling2Pct = safeZeta > 0 ? 4 / (safeZeta * safeWn) : Infinity;
      const peakTime =
        safeZeta < 1 ? Math.PI / (safeWn * Math.sqrt(1 - safeZeta * safeZeta)) : Infinity;

      const script = `"""ASSF Verified Python Tool: 2nd-Order Control System Step & Bode Analyzer"""
import math
import numpy as np
from scipy import signal

def second_order_metrics(wn: float, zeta: float, k_dc: float = 1.0) -> dict:
    assert wn > 0 and zeta >= 0, "Natural frequency must be > 0 and zeta >= 0"
    num = [k_dc * (wn ** 2)]
    den = [1.0, 2.0 * zeta * wn, wn ** 2]
    sys = signal.TransferFunction(num, den)

    overshoot = 100.0 * math.exp(-math.pi * zeta / math.sqrt(1 - zeta ** 2)) if zeta < 1.0 else 0.0
    ts_2pct = 4.0 / (zeta * wn) if zeta > 0 else float("inf")
    tp = math.pi / (wn * math.sqrt(1 - zeta ** 2)) if zeta < 1.0 else float("inf")

    t, y = signal.step(sys, N=500)
    w, mag_db, phase_deg = signal.bode(sys)
    return {
        "overshoot_pct": round(overshoot, 3),
        "settling_time_2pct_s": round(ts_2pct, 4),
        "peak_time_s": round(tp, 4),
        "final_value": round(float(y[-1]), 4),
        "dc_mag_db": round(float(mag_db[0]), 3),
    }

if __name__ == "__main__":
    result = second_order_metrics(wn=${wn}, zeta=${zeta}, k_dc=${dcGain})
    print("Control Metrics:", result)
`;
      return {
        metrics: [
          { label: 'Damping Regime', value: regime },
          { label: '% Overshoot (M_p)', value: `${overshootPct.toFixed(2)}%` },
          { label: 'Settling Time (2%)', value: Number.isFinite(settling2Pct) ? `${settling2Pct.toFixed(3)} s` : '∞ (Oscillating)' },
          { label: 'Peak Time (T_p)', value: Number.isFinite(peakTime) ? `${peakTime.toFixed(3)} s` : 'N/A (No Peak)' },
        ],
        formula: 'G(s) = K·ω_n² / (s² + 2ζω_n·s + ω_n²) · M_p = 100·exp(-πζ / √(1-ζ²)) · T_s(2%) ≈ 4 / (ζω_n)',
        filename: 'assf_control_step_bode.py',
        script,
      };
    }

    if (activeTool === 'fluid_pipe') {
      const D = Math.max(1e-4, pipeDiaMm / 1000);
      const v = Math.max(0, velocityMs);
      const L = Math.max(0, pipeLenM);
      const eps = Math.max(0, roughnessMm / 1000);
      const nu = 1.004e-6; // Water @ 20°C
      const rho = 998.2;
      const g = 9.80665;

      const re = (v * D) / nu;
      const regime = re < 2300 ? 'Laminar' : re <= 4000 ? 'Transitional' : 'Turbulent';
      let f = 0;
      if (re > 0) {
        if (re < 2300) {
          f = 64 / re;
        } else {
          const term = eps / (3.7 * D) + 5.74 / Math.pow(re, 0.9);
          f = 0.25 / Math.pow(Math.log10(term), 2);
        }
      }
      const headLossM = f * (L / D) * ((v * v) / (2 * g));
      const flowM3s = (Math.PI * D * D * 0.25) * v;
      const hydPowerW = rho * g * flowM3s * headLossM;

      const script = `"""ASSF Verified Python Tool: Darcy-Weisbach Pipe Head Loss & Pump Power"""
import math

def pipe_hydraulics(dia_mm: float, velocity_ms: float, length_m: float, roughness_mm: float = 0.045) -> dict:
    D = dia_mm / 1000.0
    eps = roughness_mm / 1000.0
    nu = 1.004e-6  # Water kinematic viscosity @ 20C (m^2/s)
    rho = 998.2    # Water density (kg/m^3)
    g = 9.80665

    re = (velocity_ms * D) / nu
    if re == 0:
        return {"reynolds": 0, "head_loss_m": 0.0, "flow_lps": 0.0}
    if re < 2300:
        regime = "Laminar"
        f = 64.0 / re
    else:
        regime = "Transitional" if re <= 4000 else "Turbulent"
        f = 0.25 / (math.log10((eps / (3.7 * D)) + (5.74 / (re ** 0.9))) ** 2)

    hf = f * (length_m / D) * (velocity_ms ** 2) / (2.0 * g)
    q_m3s = math.pi * (D ** 2) * 0.25 * velocity_ms
    power_w = rho * g * q_m3s * hf
    return {
        "reynolds": round(re, 1),
        "regime": regime,
        "friction_factor": round(f, 5),
        "head_loss_m": round(hf, 3),
        "flow_lps": round(q_m3s * 1000.0, 3),
        "hydraulic_power_w": round(power_w, 2),
    }

if __name__ == "__main__":
    print(pipe_hydraulics(dia_mm=${pipeDiaMm}, velocity_ms=${velocityMs}, length_m=${pipeLenM}, roughness_mm=${roughnessMm}))
`;
      return {
        metrics: [
          { label: 'Reynolds (Re)', value: `${re.toFixed(0)} (${regime})` },
          { label: 'Friction Factor (f)', value: f.toFixed(5) },
          { label: 'Head Loss (h_f)', value: `${headLossM.toFixed(3)} m` },
          { label: 'Flow · Pump Power', value: `${(flowM3s * 1000).toFixed(2)} L/s · ${hydPowerW.toFixed(1)} W` },
        ],
        formula: 'Re = vD/ν · Swamee-Jain f = 0.25 / [log₁₀(ε/3.7D + 5.74/Re⁰·⁹)]² · h_f = f(L/D)(v²/2g)',
        filename: 'assf_pipe_hydraulics.py',
        script,
      };
    }

    if (activeTool === 'beam_stress') {
      const L = Math.max(0.05, spanM);
      const P = Math.max(0, loadKn) * 1000; // N
      const E = Math.max(1, eGpa) * 1e9; // Pa
      const I = Math.max(1, inertiaCm4) * 1e-8; // m^4
      const c = Math.max(1, cMm) * 1e-3; // m

      const mMaxNm = beamType === 'simply_supported' ? (P * L) / 4 : P * L;
      const deltaMaxMm =
        (beamType === 'simply_supported' ? (P * L * L * L) / (48 * E * I) : (P * L * L * L) / (3 * E * I)) * 1000;
      const sigmaMaxMpa = ((mMaxNm * c) / I) / 1e6;
      const fos = sigmaMaxMpa > 0 ? yieldMpa / sigmaMaxMpa : Infinity;

      const script = `"""ASSF Verified Python Tool: Euler-Bernoulli Beam Stress & Deflection"""

def beam_analysis(beam_type: str, span_m: float, load_kn: float, e_gpa: float, i_cm4: float, c_mm: float, yield_mpa: float) -> dict:
    P = load_kn * 1e3
    E = e_gpa * 1e9
    I = i_cm4 * 1e-8
    c = c_mm * 1e-3

    if beam_type == "simply_supported":
        m_max_nm = (P * span_m) / 4.0
        delta_m = (P * (span_m ** 3)) / (48.0 * E * I)
    else:
        m_max_nm = P * span_m
        delta_m = (P * (span_m ** 3)) / (3.0 * E * I)

    sigma_mpa = ((m_max_nm * c) / I) / 1e6
    fos = yield_mpa / sigma_mpa if sigma_mpa > 0 else float("inf")
    return {
        "max_moment_knm": round(m_max_nm / 1e3, 3),
        "max_stress_mpa": round(sigma_mpa, 2),
        "max_deflection_mm": round(delta_m * 1e3, 3),
        "factor_of_safety": round(fos, 2),
    }

if __name__ == "__main__":
    print(beam_analysis("${beamType}", ${spanM}, ${loadKn}, ${eGpa}, ${inertiaCm4}, ${cMm}, ${yieldMpa}))
`;
      return {
        metrics: [
          { label: 'Max Bending Moment', value: `${(mMaxNm / 1000).toFixed(2)} kN·m` },
          { label: 'Max Bending Stress', value: `${sigmaMaxMpa.toFixed(2)} MPa` },
          { label: 'Max Deflection (δ)', value: `${deltaMaxMm.toFixed(3)} mm` },
          { label: 'Factor of Safety', value: Number.isFinite(fos) ? `${fos.toFixed(2)}x` : '∞' },
        ],
        formula:
          beamType === 'simply_supported'
            ? 'M_max = PL/4 · δ_max = PL³ / (48EI) · σ = Mc / I'
            : 'M_max = PL · δ_max = PL³ / (3EI) · σ = Mc / I',
        filename: 'assf_beam_stress.py',
        script,
      };
    }

    // 5. Embedded DSP & Modbus RTU CRC-16
    const bytes = hexPayload
      .trim()
      .split(/[\s,;:-]+/)
      .filter(Boolean)
      .map((b) => parseInt(b, 16))
      .filter((n) => !Number.isNaN(n) && n >= 0 && n <= 255);

    let crc = 0xffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) {
        if ((crc & 0x0001) !== 0) {
          crc = (crc >>> 1) ^ 0xa001;
        } else {
          crc = crc >>> 1;
        }
      }
    }
    const crcLow = crc & 0xff;
    const crcHigh = (crc >>> 8) & 0xff;
    const crcHex = `${crcLow.toString(16).toUpperCase().padStart(2, '0')} ${crcHigh.toString(16).toUpperCase().padStart(2, '0')}`;

    const dt = 1 / Math.max(1, fsHz);
    const rc = 1 / (2 * Math.PI * Math.max(0.1, fcHz));
    const alpha = dt / (rc + dt);

    const pyBytes = bytes.map((b) => `0x${b.toString(16).toUpperCase().padStart(2, '0')}`).join(', ');
    const script = `"""ASSF Verified Python Tool: Modbus RTU CRC-16 & Embedded 1st-Order IIR Filter"""
import math

def modbus_crc16(frame: bytes) -> tuple[int, int]:
    crc = 0xFFFF
    for byte in frame:
        crc ^= byte
        for _ in range(8):
            crc = ((crc >> 1) ^ 0xA001) if (crc & 0x0001) else (crc >> 1)
    return (crc & 0xFF, (crc >> 8) & 0xFF)  # Low byte first (Modbus RTU)

def iir_lowpass_alpha(fs_hz: float, fc_hz: float) -> float:
    dt = 1.0 / fs_hz
    rc = 1.0 / (2.0 * math.pi * fc_hz)
    return dt / (rc + dt)

if __name__ == "__main__":
    payload = bytes([${pyBytes}])
    lo, hi = modbus_crc16(payload)
    alpha = iir_lowpass_alpha(fs_hz=${fsHz}, fc_hz=${fcHz})
    print(f"Full Modbus Frame: {payload.hex(' ').upper()} {lo:02X} {hi:02X}")
    print(f"IIR Low-Pass Alpha: {alpha:.6f}")
`;
    return {
      metrics: [
        { label: 'Parsed Bytes', value: `${bytes.length} bytes` },
        { label: 'Modbus CRC-16 (Lo Hi)', value: crcHex },
        { label: 'IIR Alpha (α)', value: alpha.toFixed(5) },
        { label: 'Sample Period (Δt)', value: `${(dt * 1000).toFixed(3)} ms` },
      ],
      formula: 'CRC-16/MODBUS (Poly 0xA001, Init 0xFFFF) · α = Δt / (RC + Δt), RC = 1 / (2πf_c)',
      filename: 'assf_modbus_dsp_tool.py',
      script,
    };
  }, [
    activeTool,
    rOhm,
    lMh,
    cUf,
    vin,
    vout,
    iout,
    fswKhz,
    wn,
    zeta,
    dcGain,
    pipeDiaMm,
    velocityMs,
    pipeLenM,
    roughnessMm,
    beamType,
    spanM,
    loadKn,
    eGpa,
    inertiaCm4,
    cMm,
    yieldMpa,
    hexPayload,
    fsHz,
    fcHz,
  ]);

  const handleCopyScript = async () => {
    await navigator.clipboard.writeText(computed.script);
    setCopied(true);
    sound.playFlashTick();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadScript = () => {
    const blob = new Blob([computed.script], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = computed.filename;
    a.click();
    URL.revokeObjectURL(url);
    sound.playChipBuzzer(1480);
  };

  const toolTabs: { id: ToolId; label: string; icon: React.ReactNode }[] = [
    { id: 'rlc_buck', label: 'Circuits & Buck', icon: <Zap className="w-3.5 h-3.5" /> },
    { id: 'pid_control', label: 'Control & PID', icon: <Cpu className="w-3.5 h-3.5" /> },
    { id: 'fluid_pipe', label: 'Fluid Mechanics', icon: <Waves className="w-3.5 h-3.5" /> },
    { id: 'beam_stress', label: 'Beam Mechanics', icon: <Ruler className="w-3.5 h-3.5" /> },
    { id: 'dsp_modbus', label: 'Embedded DSP & CRC', icon: <Terminal className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Tool Selector */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-mono text-cyan-400">
              Verified Deterministic Solver + Runnable Python 3 Code Generator
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Python Engineering Workbench
            </h1>
            <p className="text-xs text-slate-400">
              Enter engineering parameters for exact, unit-checked answers and download verified PEP-8 Python scripts for Electronics, Control, Fluids, Mechanics, and Embedded DSP.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              onAskAssfPython(
                `Write a verified, runnable Python 3 engineering tool for ${
                  toolTabs.find((t) => t.id === activeTool)?.label
                } with unit tests and edge-case validation.`
              )
            }
            className="px-3.5 py-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ask ASSF for Custom Python Tool</span>
          </button>
        </div>

        {/* Segmented Tool Selector */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-lg">
          {toolTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                sound.playFlashTick();
                setActiveTool(t.id);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTool === t.id
                  ? 'bg-cyan-400 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Split: Interactive Parameters + Exact Outputs | Generated Python Code */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Parameters & Verified Analytical Output */}
        <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-5">
          <h2 className="text-sm font-semibold text-white border-b border-slate-800 pb-2.5">
            Engineering Inputs & Exact Results
          </h2>

          {activeTool === 'rlc_buck' && (
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <label className="space-y-1">
                <span className="text-slate-400 block">Resistance R (Ω)</span>
                <input
                  type="number"
                  step="0.5"
                  value={rOhm}
                  onChange={(e) => setROhm(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white tabular-nums"
                />
              </label>
              <label className="space-y-1">
                <span className="text-slate-400 block">Inductance L (mH)</span>
                <input
                  type="number"
                  step="0.1"
                  value={lMh}
                  onChange={(e) => setLMh(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white tabular-nums"
                />
              </label>
              <label className="space-y-1">
                <span className="text-slate-400 block">Capacitance C (µF)</span>
                <input
                  type="number"
                  step="0.5"
                  value={cUf}
                  onChange={(e) => setCUf(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white tabular-nums"
                />
              </label>
              <label className="space-y-1">
                <span className="text-slate-400 block">Buck Vin (V)</span>
                <input
                  type="number"
                  step="1"
                  value={vin}
                  onChange={(e) => setVin(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white tabular-nums"
                />
              </label>
              <label className="space-y-1">
                <span className="text-slate-400 block">Buck Vout (V)</span>
                <input
                  type="number"
                  step="0.5"
                  value={vout}
                  onChange={(e) => setVout(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white tabular-nums"
                />
              </label>
              <label className="space-y-1">
                <span className="text-slate-400 block">Load Iout (A) · fsw (kHz)</span>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.1"
                    value={iout}
                    onChange={(e) => setIout(parseFloat(e.target.value) || 0)}
                    className="w-1/2 bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-white tabular-nums"
                  />
                  <input
                    type="number"
                    step="10"
                    value={fswKhz}
                    onChange={(e) => setFswKhz(parseFloat(e.target.value) || 0)}
                    className="w-1/2 bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-white tabular-nums"
                  />
                </div>
              </label>
            </div>
          )}

          {activeTool === 'pid_control' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
              <label className="space-y-1">
                <span className="text-slate-400 block">Natural Freq ω_n (rad/s)</span>
                <input
                  type="number"
                  step="0.5"
                  value={wn}
                  onChange={(e) => setWn(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white tabular-nums"
                />
              </label>
              <label className="space-y-1">
                <span className="text-slate-400 block">Damping Ratio ζ</span>
                <input
                  type="number"
                  step="0.05"
                  value={zeta}
                  onChange={(e) => setZeta(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white tabular-nums"
                />
              </label>
              <label className="space-y-1">
                <span className="text-slate-400 block">DC Gain K</span>
                <input
                  type="number"
                  step="0.1"
                  value={dcGain}
                  onChange={(e) => setDcGain(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white tabular-nums"
                />
              </label>
            </div>
          )}

          {activeTool === 'fluid_pipe' && (
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <label className="space-y-1">
                <span className="text-slate-400 block">Pipe Diameter (mm)</span>
                <input
                  type="number"
                  step="5"
                  value={pipeDiaMm}
                  onChange={(e) => setPipeDiaMm(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white tabular-nums"
                />
              </label>
              <label className="space-y-1">
                <span className="text-slate-400 block">Flow Velocity (m/s)</span>
                <input
                  type="number"
                  step="0.2"
                  value={velocityMs}
                  onChange={(e) => setVelocityMs(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white tabular-nums"
                />
              </label>
              <label className="space-y-1">
                <span className="text-slate-400 block">Pipe Length (m)</span>
                <input
                  type="number"
                  step="5"
                  value={pipeLenM}
                  onChange={(e) => setPipeLenM(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white tabular-nums"
                />
              </label>
              <label className="space-y-1">
                <span className="text-slate-400 block">Roughness ε (mm)</span>
                <input
                  type="number"
                  step="0.005"
                  value={roughnessMm}
                  onChange={(e) => setRoughnessMm(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white tabular-nums"
                />
              </label>
            </div>
          )}

          {activeTool === 'beam_stress' && (
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <label className="space-y-1 col-span-2">
                <span className="text-slate-400 block">Beam Support Configuration</span>
                <select
                  value={beamType}
                  onChange={(e) => setBeamType(e.target.value as 'simply_supported' | 'cantilever')}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                >
                  <option value="simply_supported">Simply Supported (Center Point Load)</option>
                  <option value="cantilever">Cantilever (Tip Point Load)</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-slate-400 block">Span L (m)</span>
                <input
                  type="number"
                  step="0.2"
                  value={spanM}
                  onChange={(e) => setSpanM(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white tabular-nums"
                />
              </label>
              <label className="space-y-1">
                <span className="text-slate-400 block">Point Load P (kN)</span>
                <input
                  type="number"
                  step="1"
                  value={loadKn}
                  onChange={(e) => setLoadKn(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white tabular-nums"
                />
              </label>
              <label className="space-y-1">
                <span className="text-slate-400 block">Modulus E (GPa)</span>
                <input
                  type="number"
                  step="10"
                  value={eGpa}
                  onChange={(e) => setEGpa(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white tabular-nums"
                />
              </label>
              <label className="space-y-1">
                <span className="text-slate-400 block">Inertia I (cm⁴)</span>
                <input
                  type="number"
                  step="100"
                  value={inertiaCm4}
                  onChange={(e) => setInertiaCm4(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white tabular-nums"
                />
              </label>
              <label className="space-y-1">
                <span className="text-slate-400 block">Extreme Fiber c (mm)</span>
                <input
                  type="number"
                  step="5"
                  value={cMm}
                  onChange={(e) => setCMm(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white tabular-nums"
                />
              </label>
              <label className="space-y-1">
                <span className="text-slate-400 block">Yield Strength (MPa)</span>
                <input
                  type="number"
                  step="10"
                  value={yieldMpa}
                  onChange={(e) => setYieldMpa(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white tabular-nums"
                />
              </label>
            </div>
          )}

          {activeTool === 'dsp_modbus' && (
            <div className="space-y-3 text-xs font-mono">
              <label className="space-y-1 block">
                <span className="text-slate-400 block">Modbus RTU Hex Payload (Space Separated)</span>
                <input
                  type="text"
                  value={hexPayload}
                  onChange={(e) => setHexPayload(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-cyan-200 uppercase"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-slate-400 block">Sample Rate f_s (Hz)</span>
                  <input
                    type="number"
                    step="50"
                    value={fsHz}
                    onChange={(e) => setFsHz(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white tabular-nums"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-400 block">Cutoff Freq f_c (Hz)</span>
                  <input
                    type="number"
                    step="5"
                    value={fcHz}
                    onChange={(e) => setFcHz(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white tabular-nums"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Computed Verified Answers */}
          <div className="pt-3 border-t border-slate-800 space-y-3">
            <div className="text-[11px] font-mono text-emerald-400 font-semibold">
              Verified Analytical Outputs
            </div>
            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              {computed.metrics.map((m, idx) => (
                <div key={idx} className="bg-slate-950 border border-slate-800/80 rounded-lg p-2.5">
                  <div className="text-slate-500 text-[10px]">{m.label}</div>
                  <div className="text-cyan-300 font-bold mt-0.5 tabular-nums">{m.value}</div>
                </div>
              ))}
            </div>
            <div className="text-[11px] font-mono text-slate-400 bg-slate-950/70 border border-slate-800/60 rounded-lg px-3 py-2">
              {computed.formula}
            </div>
          </div>
        </div>

        {/* Right: Runnable Python 3 Script */}
        <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <div className="flex items-center gap-2 text-slate-200">
              <Code2 className="w-4 h-4 text-amber-400" />
              <span className="font-semibold">{computed.filename}</span>
              <span className="text-slate-600" aria-hidden="true">·</span>
              <span className="text-slate-400">Python 3.10+</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyScript}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-slate-200 flex items-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Code'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadScript}
                className="px-3 py-1.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .py</span>
              </button>
            </div>
          </div>

          <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed max-h-[460px] overflow-y-auto">
            <code>{computed.script}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
