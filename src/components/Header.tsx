import React from 'react';
import { Cpu, Wifi, WifiOff, Volume2, VolumeX, ShieldCheck } from 'lucide-react';

export type MainTab = 'console' | 'studio' | 'family' | 'gadgets' | 'python' | 'hardware';

interface HeaderProps {
  activeTab: MainTab;
  setActiveTab: (tab: MainTab) => void;
  isAirGapped: boolean;
  setIsAirGapped: (airgapped: boolean) => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  onDeployClick: () => void;
  onBrandClick?: () => void;
  chipName: string;
  firmwareVersion: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isAirGapped,
  setIsAirGapped,
  isMuted,
  setIsMuted,
  onDeployClick,
  onBrandClick,
}) => {
  const navItems: { id: MainTab; label: string }[] = [
    { id: 'console', label: 'AI Console' },
    { id: 'studio', label: 'Creator & Biz' },
    { id: 'family', label: 'Family & Sub-AI' },
    { id: 'gadgets', label: 'AI Gadgets' },
    { id: 'python', label: 'Python Tools' },
    { id: 'hardware', label: 'Silicon & OTA' },
  ];

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={onBrandClick}
          className="flex items-center gap-3 shrink-0 text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 rounded-lg"
          title="ASSF · Click to view welcome screen"
        >
          <div className="w-9 h-9 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Cpu className="w-5 h-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white whitespace-nowrap">
            ASSF
          </span>
        </button>

        {/* Zone 2: 5 Single-line Nav Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
                activeTab === item.id
                  ? 'text-cyan-400 border-cyan-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 border-transparent'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: 1 Primary Action + Utility Controls */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            title={isMuted ? 'Unmute Telemetry Buzzer' : 'Mute Telemetry Buzzer'}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-lg transition-colors border border-slate-800"
            aria-label="Toggle telemetry sound"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          <button
            type="button"
            onClick={() => setIsAirGapped(!isAirGapped)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition-colors whitespace-nowrap ${
              isAirGapped
                ? 'bg-amber-950/60 border-amber-500/50 text-amber-300'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
            }`}
            title="Toggle between Air-Gapped Offline Mode and Connected Gateway Mode"
          >
            {isAirGapped ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">AIR-GAPPED OFFLINE</span>
                <span className="sm:hidden">OFFLINE</span>
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">GATEWAY CONNECTED</span>
                <span className="sm:hidden">ONLINE</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onDeployClick}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors shadow-sm shadow-cyan-950 whitespace-nowrap flex items-center gap-2 shrink-0"
          >
            <ShieldCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Deploy to Chip</span>
            <span className="sm:hidden">Deploy</span>
          </button>
        </div>
      </div>
    </header>
  );
};
