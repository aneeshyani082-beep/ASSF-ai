import { AiGadget, FamilyMemberProfile, GadgetCommand } from '../types/edge';

export const INITIAL_FAMILY_NAME = 'ASSF Live Family Network';

export const DEFAULT_FAMILY_MEMBERS: FamilyMemberProfile[] = [
  {
    id: 'member-primary',
    name: 'Lead Engineer',
    role: 'Architect / Parent',
    subAiName: 'ASSF-Core',
    languageCode: 'auto',
    specialty: 'All-Rounder · Python, B.Tech & Industrial Control',
    voicePitch: 1.0,
    voiceRate: 1.05,
    gadgetScope: 'all',
    createdAt: '2026-11-14',
  },
  {
    id: 'member-home',
    name: 'Home Care',
    role: 'Family Manager',
    subAiName: 'Aura-Home',
    languageCode: 'hi-IN',
    specialty: 'Household Appliances, Kitchen, Schedules & Wellness',
    voicePitch: 1.08,
    voiceRate: 1.0,
    gadgetScope: 'household',
    createdAt: '2026-11-14',
  },
  {
    id: 'member-student',
    name: 'B.Tech Scholar',
    role: 'Student',
    subAiName: 'Sigma-Tutor',
    languageCode: 'en-US',
    specialty: 'B.Tech Curriculum, Python/C++/Java & Math Proofs',
    voicePitch: 0.96,
    voiceRate: 1.05,
    gadgetScope: 'household',
    createdAt: '2026-11-14',
  },
];

export const DEFAULT_AI_GADGETS: AiGadget[] = [
  // Household Work Gadgets (6)
  {
    id: 'home-vacuum',
    name: 'LiDAR Floor Vacuum & Mop Bot',
    domain: 'household',
    zone: 'Living Room & Hallway',
    protocol: 'Matter / MQTT Local',
    isOn: false,
    statusText: 'Docked · Standby',
    metricLabel: 'Suction',
    metricValue: 65,
    unit: '%',
    minVal: 20,
    maxVal: 100,
    stepVal: 5,
    powerWatts: 48,
  },
  {
    id: 'home-hvac',
    name: 'Smart Inverter AC & HEPA Air',
    domain: 'household',
    zone: 'Family Living Zone',
    protocol: 'ESP32 BLE Mesh',
    isOn: true,
    statusText: 'Cooling · HEPA Eco',
    metricLabel: 'Target Temp',
    metricValue: 23,
    unit: '°C',
    minVal: 16,
    maxVal: 30,
    stepVal: 1,
    powerWatts: 920,
  },
  {
    id: 'home-induction',
    name: 'Smart Kitchen Induction & Timer',
    domain: 'household',
    zone: 'Kitchen Counter',
    protocol: 'Matter Local Hub',
    isOn: false,
    statusText: 'Burners Off · Safe',
    metricLabel: 'Cook Power',
    metricValue: 1200,
    unit: 'W',
    minVal: 200,
    maxVal: 2200,
    stepVal: 100,
    powerWatts: 1200,
  },
  {
    id: 'home-washer',
    name: 'AI Drum Washer & Load Balancer',
    domain: 'household',
    zone: 'Utility & Laundry',
    protocol: 'Wi-Fi Direct Local',
    isOn: false,
    statusText: 'Idle · Ready',
    metricLabel: 'Spin Speed',
    metricValue: 1000,
    unit: 'RPM',
    minVal: 400,
    maxVal: 1400,
    stepVal: 100,
    powerWatts: 550,
  },
  {
    id: 'home-solar',
    name: 'Home Solar & Hybrid Inverter',
    domain: 'household',
    zone: 'Rooftop & Microgrid',
    protocol: 'RS485 Modbus',
    isOn: true,
    statusText: 'Solar Priority · Charging',
    metricLabel: 'Battery SoC',
    metricValue: 84,
    unit: '%',
    minVal: 10,
    maxVal: 100,
    stepVal: 5,
    powerWatts: 15,
  },
  {
    id: 'home-security',
    name: 'Smart Entry Lock & Perimeter Vision',
    domain: 'household',
    zone: 'Main Entrance',
    protocol: 'Zigbee 3.0 Encrypted',
    isOn: true,
    statusText: 'Locked · Armed',
    metricLabel: 'Sensitivity',
    metricValue: 75,
    unit: '%',
    minVal: 10,
    maxVal: 100,
    stepVal: 5,
    powerWatts: 6,
  },

  // Industrial Work Gadgets (6)
  {
    id: 'ind-cnc',
    name: '3-Phase CNC Spindle & VFD Drive',
    domain: 'industrial',
    zone: 'Bay A · Machining Cell',
    protocol: 'Modbus TCP / GPIO16',
    isOn: true,
    statusText: 'Active · Vibration Nominal',
    metricLabel: 'Spindle RPM',
    metricValue: 1800,
    unit: 'RPM',
    minVal: 0,
    maxVal: 6000,
    stepVal: 100,
    powerWatts: 2400,
  },
  {
    id: 'ind-robot-arm',
    name: '6-DOF Pick & Weld Cobot Arm',
    domain: 'industrial',
    zone: 'Bay B · Assembly Line',
    protocol: 'EtherCAT / ROS2 Edge',
    isOn: true,
    statusText: 'Auto Cycle Active',
    metricLabel: 'Cycle Speed',
    metricValue: 70,
    unit: '%',
    minVal: 10,
    maxVal: 100,
    stepVal: 5,
    powerWatts: 1150,
  },
  {
    id: 'ind-conveyor',
    name: 'PLC Optical Sorting Conveyor',
    domain: 'industrial',
    zone: 'Packaging Line 2',
    protocol: 'OPC-UA / PWM',
    isOn: true,
    statusText: 'Running · 0 Faults',
    metricLabel: 'Belt Speed',
    metricValue: 24,
    unit: 'm/min',
    minVal: 0,
    maxVal: 60,
    stepVal: 2,
    powerWatts: 780,
  },
  {
    id: 'ind-boiler',
    name: 'Steam Boiler & Relief Valve Node',
    domain: 'industrial',
    zone: 'Thermal Utility Plant',
    protocol: 'HART / 4-20mA Loop',
    isOn: true,
    statusText: 'Nominal Pressure',
    metricLabel: 'Pressure',
    metricValue: 95,
    unit: 'PSI',
    minVal: 20,
    maxVal: 160,
    stepVal: 5,
    powerWatts: 3200,
  },
  {
    id: 'ind-compressor',
    name: 'Rotary Screw Air Compressor',
    domain: 'industrial',
    zone: 'Pneumatic Manifold',
    protocol: 'CANopen / RS485',
    isOn: false,
    statusText: 'Standby · Tank Charged',
    metricLabel: 'Line Pressure',
    metricValue: 7,
    unit: 'Bar',
    minVal: 2,
    maxVal: 12,
    stepVal: 1,
    powerWatts: 1850,
  },
  {
    id: 'ind-agv',
    name: 'Autonomous Warehouse AGV #04',
    domain: 'industrial',
    zone: 'Logistics Corridor',
    protocol: 'UWB + Local Wi-Fi',
    isOn: true,
    statusText: 'Navigating · Payload Ready',
    metricLabel: 'Max Speed',
    metricValue: 1.4,
    unit: 'm/s',
    minVal: 0.2,
    maxVal: 2.5,
    stepVal: 0.2,
    powerWatts: 340,
  },
];

/**
 * Deterministic safe math expression evaluator (supports +, -, *, /, ^, %, parentheses, sqrt, sin, cos, tan, log, ln, pi, e)
 */
export function tryEvaluateMathExpression(input: string): { expression: string; result: number } | null {
  const cleaned = input
    .toLowerCase()
    .replace(/^(what is|calculate|compute|solve|evaluate|=)\s+/i, '')
    .replace(/[?？]/g, '')
    .trim();

  // Only match queries that are primarily mathematical expressions
  if (!/[0-9]/.test(cleaned) || !/[+\-*/^]|sqrt|sin|cos|tan|log|ln/.test(cleaned)) {
    return null;
  }

  // Extract math-like substring
  const exprMatch = cleaned.match(/[0-9a-z.\s+\-*/^()%]+/);
  if (!exprMatch) return null;
  const rawExpr = exprMatch[0].trim();

  // Verify no unsafe words exist
  const tokens = rawExpr.match(/[a-z]+/g) || [];
  const allowedFns = new Set(['sqrt', 'sin', 'cos', 'tan', 'abs', 'log', 'ln', 'pi', 'e', 'pow']);
  if (tokens.some((t) => !allowedFns.has(t))) {
    return null;
  }

  try {
    const jsExpr = rawExpr
      .replace(/\^/g, '**')
      .replace(/\bpi\b/g, 'Math.PI')
      .replace(/\be\b/g, 'Math.E')
      .replace(/\bsqrt\(/g, 'Math.sqrt(')
      .replace(/\bsin\(/g, 'Math.sin(')
      .replace(/\bcos\(/g, 'Math.cos(')
      .replace(/\btan\(/g, 'Math.tan(')
      .replace(/\babs\(/g, 'Math.abs(')
      .replace(/\blog\(/g, 'Math.log10(')
      .replace(/\bln\(/g, 'Math.log(');

    // Strictly validate only allowed characters remain before executing arithmetic
    if (!/^[0-9+\-*/().,\sMathPICEsqrtincolaeb]+$/.test(jsExpr)) {
      return null;
    }

    const fn = new Function(`"use strict"; return (${jsExpr});`);
    const value = fn();
    if (typeof value === 'number' && Number.isFinite(value)) {
      return { expression: rawExpr, result: +value.toFixed(6) };
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Parses natural-language commands to control Household & Industrial AI gadgets offline.
 */
export function parseOfflineGadgetCommands(
  query: string,
  gadgets: AiGadget[],
  scope: 'all' | 'household' | 'industrial'
): { commands: GadgetCommand[]; summaryLines: string[]; blockedNotices: string[] } {
  const q = query.toLowerCase();
  const commands: GadgetCommand[] = [];
  const summaryLines: string[] = [];
  const blockedNotices: string[] = [];

  const turnOn = /\b(turn on|start|enable|activate|run|open|boot|on|चलाओ|शुरू|ऑन)\b/i.test(q);
  const turnOff = /\b(turn off|stop|disable|halt|shut|close|kill|dock|off|बंद|रोको|ऑफ)\b/i.test(q);
  const numMatch = q.match(/(\d+(?:\.\d+)?)/);
  const numVal = numMatch ? parseFloat(numMatch[1]) : undefined;

  const keywordMap: Record<string, string[]> = {
    'home-vacuum': ['vacuum', 'mop', 'cleaner', 'floor bot', 'roomba', 'झाड़ू'],
    'home-hvac': ['ac', 'air condition', 'hvac', 'hepa', 'purifier', 'cooling', 'thermostat', 'temperature', 'एसी'],
    'home-induction': ['induction', 'stove', 'kitchen', 'cook', 'burner', 'रसोई', 'इंडक्शन'],
    'home-washer': ['washer', 'washing machine', 'laundry', 'dryer', 'clothes'],
    'home-solar': ['solar', 'inverter', 'battery', 'microgrid'],
    'home-security': ['door lock', 'lock', 'security', 'perimeter', 'alarm'],
    'ind-cnc': ['cnc', 'spindle', 'vfd', 'lathe', 'milling'],
    'ind-robot-arm': ['robot', 'cobot', 'weld', 'arm'],
    'ind-conveyor': ['conveyor', 'belt', 'sorting'],
    'ind-boiler': ['boiler', 'steam', 'relief valve', 'psi'],
    'ind-compressor': ['compressor', 'pneumatic', 'air line'],
    'ind-agv': ['agv', 'warehouse', 'forklift', 'logistics'],
  };

  for (const gadget of gadgets) {
    const keys = keywordMap[gadget.id] || [];
    const matched = keys.some((k) => q.includes(k));
    if (!matched) continue;

    if (scope !== 'all' && gadget.domain !== scope) {
      blockedNotices.push(
        `Permission Notice: Active Sub-AI scope (${scope}) restricts direct control of ${gadget.name} (${gadget.domain}).`
      );
      continue;
    }

    const cmd: GadgetCommand = { gadgetId: gadget.id };
    if (turnOff && !turnOn) {
      cmd.isOn = false;
      cmd.statusText = 'Stopped by ASSF AI';
    } else if (turnOn) {
      cmd.isOn = true;
      cmd.statusText = 'Active · ASSF Controlled';
    }

    if (typeof numVal === 'number' && !Number.isNaN(numVal)) {
      const clamped = Math.max(gadget.minVal, Math.min(gadget.maxVal, numVal));
      cmd.metricValue = clamped;
      if (cmd.isOn === undefined && clamped > 0) {
        cmd.isOn = true;
        cmd.statusText = `Calibrated to ${clamped} ${gadget.unit}`;
      }
    }

    if (cmd.isOn !== undefined || cmd.metricValue !== undefined) {
      commands.push(cmd);
      const stateDesc = cmd.isOn === false ? 'OFF' : 'ON';
      const valDesc = cmd.metricValue !== undefined ? ` (${gadget.metricLabel}: ${cmd.metricValue} ${gadget.unit})` : '';
      summaryLines.push(`${gadget.name} [${gadget.zone}] → ${stateDesc}${valDesc}`);
    }
  }

  return { commands, summaryLines, blockedNotices };
}
