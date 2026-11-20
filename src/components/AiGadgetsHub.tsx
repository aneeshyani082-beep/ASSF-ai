import React, { useState } from 'react';
import { AiGadget, FamilyMemberProfile, GadgetDomain } from '../types/edge';
import { sound } from '../services/soundEffects';
import {
  Home,
  Factory,
  Power,
  Zap,
  ShieldAlert,
  Sliders,
  Send,
  MessageSquare,
} from 'lucide-react';

interface AiGadgetsHubProps {
  gadgets: AiGadget[];
  activeMember: FamilyMemberProfile;
  onToggleGadget: (gadgetId: string) => void;
  onUpdateGadgetMetric: (gadgetId: string, value: number) => void;
  onRunAiGadgetCommand: (commandText: string) => Promise<string>;
  onAskConsoleDiagnostics: (gadget: AiGadget) => void;
}

export const AiGadgetsHub: React.FC<AiGadgetsHubProps> = ({
  gadgets,
  activeMember,
  onToggleGadget,
  onUpdateGadgetMetric,
  onRunAiGadgetCommand,
  onAskConsoleDiagnostics,
}) => {
  const [filter, setFilter] = useState<'all' | GadgetDomain>('all');
  const [aiCommand, setAiCommand] = useState('');
  const [commandResult, setCommandResult] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const visibleGadgets =
    filter === 'all' ? gadgets : gadgets.filter((g) => g.domain === filter);

  const activeGadgetsCount = gadgets.filter((g) => g.isOn).length;
  const totalWatts = gadgets.reduce((acc, g) => acc + (g.isOn ? g.powerWatts : 4), 0);
  const householdCount = gadgets.filter((g) => g.domain === 'household').length;
  const industrialCount = gadgets.filter((g) => g.domain === 'industrial').length;

  const canControl = (domain: GadgetDomain) =>
    activeMember.gadgetScope === 'all' || activeMember.gadgetScope === domain;

  const handleAiDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiCommand.trim() || isExecuting) return;
    setIsExecuting(true);
    sound.playFlashTick();
    try {
      const result = await onRunAiGadgetCommand(aiCommand.trim());
      setCommandResult(result);
      setAiCommand('');
      sound.playChipBuzzer(1560);
    } finally {
      setIsExecuting(false);
    }
  };

  const quickCommands = [
    'Turn on vacuum bot at 85% suction and set AC to 22°C',
    'Turn on kitchen induction at 1400W',
    'Set CNC spindle to 2400 RPM',
    'Stop conveyor belt and check boiler pressure',
  ];

  return (
    <div className="space-y-6">
      {/* Top Overview & Natural-Language AI Gadget Controller */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="text-xs font-mono text-cyan-400">
              Household & Industrial AI Gadget Bus · Active Sub-AI: {activeMember.subAiName} ({activeMember.name})
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Connected AI Gadgets & Automation
            </h1>
            <p className="text-xs text-slate-400">
              Operate home appliances and industrial factory equipment manually or through natural-language instructions in any language.
            </p>
          </div>

          {/* 3 Tabular KPI Readouts */}
          <div className="flex flex-wrap items-center gap-6 font-mono text-xs shrink-0">
            <div>
              <div className="text-slate-500 text-[11px]">Active Nodes</div>
              <div className="text-cyan-300 font-bold text-base tabular-nums">
                {activeGadgetsCount} / {gadgets.length}
              </div>
            </div>
            <div className="border-l border-slate-800 pl-6">
              <div className="text-slate-500 text-[11px]">Estimated Load</div>
              <div className="text-amber-300 font-bold text-base tabular-nums">
                {(totalWatts / 1000).toFixed(2)} kW
              </div>
            </div>
            <div className="border-l border-slate-800 pl-6">
              <div className="text-slate-500 text-[11px]">Permission Scope</div>
              <div className="text-emerald-300 font-semibold text-sm uppercase">
                {activeMember.gadgetScope}
              </div>
            </div>
          </div>
        </div>

        {/* Natural-Language Command Bar */}
        <form onSubmit={handleAiDispatch} className="space-y-2.5">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={aiCommand}
              onChange={(e) => setAiCommand(e.target.value)}
              placeholder={`Command ${activeMember.subAiName} (e.g., "Start vacuum bot and set AC to 22°C" or "Set CNC spindle to 2200 RPM")...`}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              disabled={!aiCommand.trim() || isExecuting}
              className="px-4 py-2.5 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 text-slate-950 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isExecuting ? 'Dispatching...' : 'Execute AI Command'}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
            <span className="text-slate-500">Quick commands:</span>
            {quickCommands.map((cmd, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setAiCommand(cmd)}
                className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-cyan-300 rounded-md transition-colors"
              >
                {cmd}
              </button>
            ))}
          </div>
        </form>

        {commandResult && (
          <div className="bg-slate-950 border border-cyan-500/40 rounded-lg px-3.5 py-2.5 text-xs font-mono text-cyan-200 whitespace-pre-wrap">
            {commandResult}
          </div>
        )}
      </div>

      {/* Domain Filter Segmented Control */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              filter === 'all'
                ? 'bg-cyan-400 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Gadgets ({gadgets.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('household')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              filter === 'household'
                ? 'bg-cyan-400 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Household Work ({householdCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter('industrial')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              filter === 'industrial'
                ? 'bg-cyan-400 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Factory className="w-3.5 h-3.5" />
            <span>Industrial Work ({industrialCount})</span>
          </button>
        </div>

        <span className="text-xs font-mono text-slate-500">
          Protocols: Matter · MQTT · Modbus TCP · OPC-UA · Zigbee
        </span>
      </div>

      {/* Gadgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {visibleGadgets.map((gadget) => {
          const permitted = canControl(gadget.domain);

          return (
            <div
              key={gadget.id}
              className={`bg-slate-900/60 border rounded-xl p-4 flex flex-col justify-between gap-4 transition-colors ${
                gadget.isOn ? 'border-cyan-500/40' : 'border-slate-800'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
                    {gadget.domain === 'household' ? (
                      <Home className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <Factory className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    )}
                    <span className="uppercase">{gadget.domain}</span>
                    <span aria-hidden="true">·</span>
                    <span className="truncate">{gadget.zone}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-white truncate">{gadget.name}</h3>
                  <div className="text-xs font-mono text-slate-400">{gadget.statusText}</div>
                </div>

                <button
                  type="button"
                  disabled={!permitted}
                  onClick={() => {
                    sound.playFlashTick();
                    onToggleGadget(gadget.id);
                  }}
                  className={`p-2 rounded-lg border transition-colors shrink-0 disabled:opacity-35 ${
                    gadget.isOn
                      ? 'bg-cyan-400 border-cyan-300 text-slate-950'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                  title={
                    permitted
                      ? gadget.isOn
                        ? 'Power Off'
                        : 'Power On'
                      : `Locked by ${activeMember.name}'s "${activeMember.gadgetScope}" scope`
                  }
                  aria-label={`Toggle ${gadget.name}`}
                >
                  <Power className="w-4 h-4" />
                </button>
              </div>

              {/* Interactive Parameter Control */}
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Sliders className="w-3 h-3 text-slate-500" />
                    {gadget.metricLabel}
                  </span>
                  <span className="text-cyan-300 font-bold tabular-nums">
                    {gadget.metricValue} {gadget.unit}
                  </span>
                </div>

                <input
                  type="range"
                  disabled={!permitted}
                  min={gadget.minVal}
                  max={gadget.maxVal}
                  step={gadget.stepVal}
                  value={gadget.metricValue}
                  onChange={(e) => onUpdateGadgetMetric(gadget.id, parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 disabled:opacity-35"
                />

                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span className="flex items-center gap-1 tabular-nums">
                    <Zap className="w-3 h-3 text-amber-400" />
                    {gadget.isOn ? `${gadget.powerWatts} W active` : '4 W standby'}
                  </span>
                  <span>{gadget.protocol}</span>
                </div>
              </div>

              {/* Footer Action */}
              <div className="flex items-center justify-between gap-2 pt-1">
                {!permitted ? (
                  <span className="text-[11px] font-mono text-amber-400 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Scope restricted ({activeMember.gadgetScope})
                  </span>
                ) : (
                  <span className={`text-[11px] font-mono ${gadget.isOn ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {gadget.isOn ? 'ONLINE · AI SYNCED' : 'STANDBY'}
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => onAskConsoleDiagnostics(gadget)}
                  className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-md text-[11px] font-mono text-slate-300 hover:text-cyan-300 transition-colors flex items-center gap-1"
                >
                  <MessageSquare className="w-3 h-3" />
                  <span>Ask ASSF</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
