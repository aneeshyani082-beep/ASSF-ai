export interface ChipSpec {
  id: string;
  name: string;
  family: string;
  clockMhz: number;
  sramKb: number;
  flashMb: number;
  npuArchitecture: string;
  voltage: number;
  idlePowerMw: number;
  activePowerMw: number;
  pinCount: number;
  wirelessCapabilities: string[];
}

export const CHIP_PRESETS: Record<string, ChipSpec> = {
  'esp32-s3': {
    id: 'esp32-s3',
    name: 'Espressif ESP32-S3 AI SoC',
    family: 'Xtensa Dual-Core LX7 + PIE Vector Instructions',
    clockMhz: 240,
    sramKb: 512,
    flashMb: 8,
    npuArchitecture: 'Vector Neural Extension (240 MFLOPS INT8)',
    voltage: 3.3,
    idlePowerMw: 18,
    activePowerMw: 68,
    pinCount: 45,
    wirelessCapabilities: ['Wi-Fi 4 (802.11b/g/n)', 'Bluetooth 5.0 LE', 'OTA A/B Partitioning'],
  },
  'rp2350': {
    id: 'rp2350',
    name: 'Raspberry Pi RP2350 (Pico 2)',
    family: 'Dual Arm Cortex-M33 + Dual Hazard3 RISC-V',
    clockMhz: 150,
    sramKb: 520,
    flashMb: 4,
    npuArchitecture: 'Arm Helium Vector / DSP Extensions',
    voltage: 3.3,
    idlePowerMw: 12,
    activePowerMw: 45,
    pinCount: 30,
    wirelessCapabilities: ['External BLE / Wi-Fi Co-Processor', 'Differential Flash OTA'],
  },
  'stm32h7': {
    id: 'stm32h7',
    name: 'STMicroelectronics STM32H7A3',
    family: 'Arm Cortex-M7 with Double-Precision FPU',
    clockMhz: 480,
    sramKb: 1024,
    flashMb: 2,
    npuArchitecture: 'ST X-CUBE-AI Hardware Accelerator',
    voltage: 3.3,
    idlePowerMw: 32,
    activePowerMw: 110,
    pinCount: 100,
    wirelessCapabilities: ['Ethernet MAC', 'Secure Dual-Bank Flash Swap'],
  },
  'nrf5340': {
    id: 'nrf5340',
    name: 'Nordic Semi nRF5340 Dual-Core',
    family: 'Dual Arm Cortex-M33 (App 128MHz + Net 64MHz)',
    clockMhz: 128,
    sramKb: 512,
    flashMb: 1,
    npuArchitecture: 'Edge Impulse TinyML Optimized Kernel',
    voltage: 3.0,
    idlePowerMw: 8,
    activePowerMw: 34,
    pinCount: 48,
    wirelessCapabilities: ['Bluetooth 5.3 Low Energy', 'Thread / Zigbee', 'BLE Mesh OTA'],
  },
  'k210': {
    id: 'k210',
    name: 'Kendryte K210 Dual RISC-V',
    family: '64-bit Dual RISC-V RV64GC Core',
    clockMhz: 400,
    sramKb: 8192,
    flashMb: 16,
    npuArchitecture: 'Hardware KPU Neural Accelerator (0.8 TOPS)',
    voltage: 3.3,
    idlePowerMw: 45,
    activePowerMw: 290,
    pinCount: 48,
    wirelessCapabilities: ['UART Co-processor Gateway', 'Fast Flash A/B'],
  },
  'esp32-p4': {
    id: 'esp32-p4',
    name: 'Espressif ESP32-P4 Dual RISC-V AI SoC',
    family: 'Dual 400MHz RISC-V HP + LP Core + AI PIE Extensions',
    clockMhz: 400,
    sramKb: 768,
    flashMb: 16,
    npuArchitecture: 'RISC-V AI Vector PIE + H.264/MIPI Vision ISP',
    voltage: 3.3,
    idlePowerMw: 16,
    activePowerMw: 84,
    pinCount: 55,
    wirelessCapabilities: ['Wi-Fi 7 / Matter Companion (ESP32-C6)', 'Post-Quantum OTA A/B', 'USB 2.0 HS OTG'],
  },
  'stm32n6': {
    id: 'stm32n6',
    name: 'STMicroelectronics STM32N6 Neural-ART',
    family: 'Arm Cortex-M55 (800MHz) + Helium MVE',
    clockMhz: 800,
    sramKb: 4200,
    flashMb: 16,
    npuArchitecture: 'ST Neural-ART NPU (600 GOPS INT4/INT8)',
    voltage: 1.8,
    idlePowerMw: 22,
    activePowerMw: 145,
    pinCount: 144,
    wirelessCapabilities: ['TSN Gigabit Ethernet', 'Matter over Thread Bridge', 'TrustZone ML-KEM OTA'],
  },
};

export type PartitionSlot = 'OTA_0' | 'OTA_1' | 'FACTORY';

export type OtaState =
  | 'IDLE'
  | 'CHECKING_CLOUD'
  | 'PATCH_FOUND'
  | 'DOWNLOADING_CHUNKS'
  | 'VERIFYING_SIGNATURE'
  | 'WRITING_SECTORS'
  | 'SWAPPING_BOOT_PARTITION'
  | 'REBOOTING'
  | 'HOT_RELOAD_SUCCESS'
  | 'ROLLBACK_TRIGGERED';

export interface KnowledgeItem {
  id: string;
  triggerPattern: string;
  intent: string;
  responseTemplate: string;
  actionCode?: string;
  category: 'Industrial' | 'Medical' | 'Agri' | 'Robotics' | 'General' | 'Custom' | 'Python' | 'Java' | 'C++' | 'Coding' | 'World' | 'Science' | 'B.Tech' | 'Engineering';
  addedInVersion: string;
}

export interface InferenceTelemetry {
  latencyMs: number;
  tokensPerSec: number;
  sramUsedKb: number;
  flashFootprintKb: number;
  confidenceScore: number;
  cpuCyclesEst: number;
  powerConsumptionMw: number;
  triggeredAction?: string;
  executionMode: '100% OFFLINE ON-CHIP' | 'CACHED INT8 KERNEL';
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface BuiltAppPreview {
  appTitle: string;
  summary: string;
  htmlCode: string;
}

export type VideoVisualStyle = 'orbits' | 'wave' | 'bars' | 'grid' | 'particles' | 'rocket';
export type VideoPalette = 'cyan' | 'emerald' | 'amber' | 'violet';

export interface VideoScene {
  title: string;
  headline: string;
  caption: string;
  metricBadge: string;
  voiceover: string;
  durationSec: number;
  palette: VideoPalette;
  visualStyle?: VideoVisualStyle;
}

export interface BuiltVideoProject {
  title: string;
  aspectRatio?: '16:9' | '9:16';
  scenes: VideoScene[];
}

export interface LivePulseItem {
  id: string;
  category: 'AI & Tech' | 'Silicon & Hardware' | 'Science & Space' | 'World & Economy';
  title: string;
  summary: string;
  triggerKeywords: string;
  importance: 'breaking' | 'high' | 'normal';
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'chip';
  text: string;
  timestamp: string;
  image?: string;
  hasAudio?: boolean;
  telemetry?: InferenceTelemetry;
  groundingSources?: GroundingSource[];
  builtApp?: BuiltAppPreview;
  builtVideo?: BuiltVideoProject;
}

export interface GpioPin {
  pinNumber: number;
  name: string;
  function: 'ADC' | 'GPIO' | 'PWM' | 'UART' | 'I2C' | 'POWER' | 'RELAY';
  state: 'HIGH' | 'LOW' | 'ANALOG' | 'FLOATING';
  analogValue?: number;
  isTriggered?: boolean;
}

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'auto', name: 'Auto-Detect (Any Language)', nativeName: 'Universal Auto' },
  { code: 'en-US', name: 'English', nativeName: 'English' },
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ta-IN', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te-IN', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'kn-IN', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml-IN', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'bn-IN', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'mr-IN', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'gu-IN', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'pa-IN', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'ur-PK', name: 'Urdu', nativeName: 'اردو' },
  { code: 'es-ES', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr-FR', name: 'French', nativeName: 'Français' },
  { code: 'de-DE', name: 'German', nativeName: 'Deutsch' },
  { code: 'ja-JP', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko-KR', name: 'Korean', nativeName: '한국어' },
  { code: 'zh-CN', name: 'Chinese (Mandarin)', nativeName: '中文' },
  { code: 'ar-SA', name: 'Arabic', nativeName: 'العربية' },
  { code: 'pt-BR', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru-RU', name: 'Russian', nativeName: 'Русский' },
  { code: 'it-IT', name: 'Italian', nativeName: 'Italiano' },
  { code: 'id-ID', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'tr-TR', name: 'Turkish', nativeName: 'Türkçe' },
];

export interface FamilyMemberProfile {
  id: string;
  name: string;
  role: string;
  subAiName: string;
  languageCode: string;
  customLanguage?: string;
  specialty: string;
  voicePitch: number;
  voiceRate: number;
  gadgetScope: 'all' | 'household' | 'industrial';
  createdAt: string;
}

export interface FamilyActivityEvent {
  id: string;
  timestamp: string;
  memberName: string;
  subAiName: string;
  summary: string;
  category: 'chat' | 'gadget' | 'family' | 'engineering';
}

export type GadgetDomain = 'household' | 'industrial';

export interface AiGadget {
  id: string;
  name: string;
  domain: GadgetDomain;
  zone: string;
  protocol: string;
  isOn: boolean;
  statusText: string;
  metricLabel: string;
  metricValue: number;
  unit: string;
  minVal: number;
  maxVal: number;
  stepVal: number;
  powerWatts: number;
}

export interface GadgetCommand {
  gadgetId: string;
  isOn?: boolean;
  metricValue?: number;
  statusText?: string;
}

