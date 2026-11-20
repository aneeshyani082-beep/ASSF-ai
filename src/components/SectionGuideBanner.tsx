import React from 'react';
import { MainTab } from './Header';
import { Compass, Film, ChevronRight, Sparkles } from 'lucide-react';

interface SectionGuideBannerProps {
  activeTab: MainTab;
  onWatchVideo: (chapterId: string) => void;
  onOpenGuider: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const SECTION_GUIDE_COPY: Record<
  MainTab,
  {
    chapterId: string;
    title: string;
    plainSummary: string;
    quickSteps: string[];
  }
> = {
  console: {
    chapterId: 'console',
    title: 'Welcome to the AI Console',
    plainSummary:
      'Ask any question in your preferred language, speak using your microphone, or snap a photo of homework, math, or a circuit board.',
    quickSteps: [
      'Pick a Language at the top',
      'Click Camera or Mic, or type below',
      'Toggle Voice Reply ON to hear spoken answers',
    ],
  },
  studio: {
    chapterId: 'studio',
    title: 'Creator, Business Analytics & App Builder Studio',
    plainSummary:
      'Design marketing posters (PNG), generate grounded executive reports, animate promo videos (.WebM), analyze business CSV metrics, and build product-selling websites or apps.',
    quickSteps: [
      'Choose Poster, Report, Video, Analytics, or Store Builder',
      'Enter your idea or CSV numbers and generate with AI',
      'Preview live and download PNG, HTML, MD, or WebM video',
    ],
  },
  family: {
    chapterId: 'family',
    title: 'Live Family AI & Personal Sub-AIs',
    plainSummary:
      'Give your family network a name and create a dedicated Sub-AI for each person—with their own language, voice tone, and device access.',
    quickSteps: [
      'Click the pencil icon to name your Family AI',
      'Add a member on the left to spawn their Sub-AI',
      'Click Talk to Sub-AI to open their private chat',
    ],
  },
  gadgets: {
    chapterId: 'gadgets',
    title: 'Household & Industrial AI Gadgets',
    plainSummary:
      'Manage smart home appliances and factory machinery from one place using manual sliders or natural everyday instructions.',
    quickSteps: [
      'Filter by Household Work or Industrial Work',
      'Type commands like "Turn on vacuum bot" above',
      'Adjust temperature, suction, or RPM with sliders',
    ],
  },
  python: {
    chapterId: 'python',
    title: 'Python Engineering Workbench',
    plainSummary:
      'Compute exact engineering results for circuits, control loops, fluid pipes, beams, and embedded DSP, then download clean Python 3 scripts.',
    quickSteps: [
      'Pick an engineering module tab',
      'Enter your numbers for instant verified answers',
      'Copy or download the runnable .py script',
    ],
  },
  hardware: {
    chapterId: 'hardware',
    title: 'Silicon Pinout, Auto-OTA & Firmware Export',
    plainSummary:
      'Inspect microcontroller hardware pins, test safe A/B dual-partition updates, and export C++ firmware or JSON/CSV knowledge datasets.',
    quickSteps: [
      'Choose your target chip (ESP32-S3, RP2350, STM32H7)',
      'Test Auto-OTA updates or simulate rollback safety',
      'Download C++ firmware ZIP or Knowledge files',
    ],
  },
};

export const SectionGuideBanner: React.FC<SectionGuideBannerProps> = ({
  activeTab,
  onWatchVideo,
  onOpenGuider,
  isCollapsed,
  onToggleCollapse,
}) => {
  const info = SECTION_GUIDE_COPY[activeTab];

  if (isCollapsed) {
    return (
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="text-xs font-mono text-slate-400 hover:text-cyan-300 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 transition-colors"
        >
          <Compass className="w-3.5 h-3.5 text-cyan-400" />
          <span>Show Section Guide & Video Demo</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div className="space-y-2 flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <h2 className="text-sm sm:text-base font-semibold text-white">{info.title}</h2>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="text-[11px] font-mono text-slate-500 hover:text-slate-300 ml-auto lg:ml-2 underline"
          >
            Hide Guide
          </button>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
          {info.plainSummary}
        </p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400 pt-0.5">
          {info.quickSteps.map((step, i) => (
            <span key={i} className="inline-flex items-center gap-1.5">
              <span className="font-mono text-cyan-400 font-semibold">0{i + 1}.</span>
              <span>{step}</span>
              {i < info.quickSteps.length - 1 && (
                <ChevronRight className="w-3 h-3 text-slate-600 hidden sm:inline" aria-hidden="true" />
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Video Demo + Guider CTA Buttons */}
      <div className="flex flex-wrap items-center gap-2.5 shrink-0">
        <button
          type="button"
          onClick={() => onWatchVideo(info.chapterId)}
          className="px-4 py-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold text-xs rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
        >
          <Film className="w-4 h-4" />
          <span>Watch Video Demo</span>
        </button>

        <button
          type="button"
          onClick={onOpenGuider}
          className="px-3.5 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white font-medium text-xs rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
        >
          <Compass className="w-4 h-4 text-emerald-400" />
          <span>Ask Guider Assistant</span>
        </button>
      </div>
    </div>
  );
};
