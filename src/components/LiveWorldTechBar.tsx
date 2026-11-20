import React, { useState } from 'react';
import { LivePulseItem, GroundingSource } from '../types/edge';
import {
  Radio,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Globe,
  Cpu,
  Atom,
  Sparkles,
  ExternalLink,
  MessageSquare,
  FileText,
  Film,
} from 'lucide-react';

interface LiveWorldTechBarProps {
  items: LivePulseItem[];
  sources: GroundingSource[];
  lastSyncAt: string | null;
  versionTag: string;
  nextSyncSec: number;
  evolvedCount: number;
  isSyncing: boolean;
  isAirGapped: boolean;
  onSyncNow: () => void;
  onAskPrompt: (prompt: string) => void;
  onBuildReport: (topic: string) => void;
  onMakeVideo: (topic: string) => void;
}

function getCategoryIcon(category: LivePulseItem['category']) {
  switch (category) {
    case 'Silicon & Hardware':
      return <Cpu className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
    case 'Science & Space':
      return <Atom className="w-3.5 h-3.5 text-violet-400 shrink-0" />;
    case 'World & Economy':
      return <Globe className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    default:
      return <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
  }
}

export const LiveWorldTechBar: React.FC<LiveWorldTechBarProps> = ({
  items,
  sources,
  lastSyncAt,
  versionTag,
  nextSyncSec,
  evolvedCount,
  isSyncing,
  isAirGapped,
  onSyncNow,
  onAskPrompt,
  onBuildReport,
  onMakeVideo,
}) => {
  const [expanded, setExpanded] = useState(false);
  const leadItem = items[0];

  return (
    <section className="bg-slate-900/55 border border-slate-800 rounded-xl overflow-hidden">
      {/* Compact Single-Strip Header */}
      <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-semibold text-[11px] shrink-0 ${
              isAirGapped
                ? 'bg-amber-950/50 text-amber-300 border border-amber-800/60'
                : 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            <Radio className={`w-3 h-3 ${isSyncing ? 'animate-ping' : ''}`} />
            <span>{isAirGapped ? 'OFFLINE SNAPSHOT' : '60S WORLD & TECH SYNC'}</span>
          </span>

          {leadItem ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-left text-slate-200 hover:text-cyan-300 truncate transition-colors"
              title="Expand live technology & world updates"
            >
              <span className="text-cyan-400 font-semibold mr-1.5">[{leadItem.category}]</span>
              <span>{leadItem.title}</span>
              {items.length > 1 && (
                <span className="text-slate-500 ml-2">+{items.length - 1} more updates</span>
              )}
            </button>
          ) : (
            <span className="text-slate-400 truncate">
              {isSyncing
                ? 'Syncing live technology breakthroughs & world news...'
                : 'Ready to sync real-time world & technology updates every 60 seconds.'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 text-[11px]">
          <span
            className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-violet-950/60 border border-violet-500/40 text-violet-200 font-semibold"
            title="Every minute and every prompt automatically updates ASSF with new Advanced AI knowledge"
          >
            <Sparkles className="w-3 h-3 text-violet-400" />
            <span>AI Evolved +{evolvedCount}</span>
          </span>

          {!isAirGapped && (
            <span className="text-slate-400 hidden sm:inline tabular-nums">
              Next sync in <strong className="text-cyan-300">{nextSyncSec}s</strong>
            </span>
          )}

          {lastSyncAt && (
            <span className="text-slate-500 hidden lg:inline">
              · {lastSyncAt} · {versionTag}
            </span>
          )}

          {!isAirGapped && (
            <button
              type="button"
              onClick={onSyncNow}
              disabled={isSyncing}
              className="px-2.5 py-1 rounded-md bg-slate-950 hover:bg-slate-800 border border-slate-700 text-cyan-300 flex items-center gap-1.5 disabled:opacity-50 transition-colors"
              title="Fetch latest world & technology updates right now and bake into ASSF flash memory"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="px-2.5 py-1 rounded-md bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 flex items-center gap-1 transition-colors"
          >
            <span>{expanded ? 'Hide Feed' : `Feed (${items.length})`}</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expandable Live World & Tech Pulse Grid */}
      {expanded && (
        <div className="border-t border-slate-800/80 bg-slate-950/70 p-4 space-y-4">
          {items.length === 0 ? (
            <div className="text-xs text-slate-400 py-3 text-center">
              Waiting for the next 60-second live technology & world sync cycle...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-900/75 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                      <span className="inline-flex items-center gap-1.5 text-slate-300 font-semibold">
                        {getCategoryIcon(item.category)}
                        <span>{item.category}</span>
                      </span>
                      <span className="text-slate-500">{item.timestamp}</span>
                    </div>
                    <h4 className="text-xs font-bold text-white leading-snug">{item.title}</h4>
                    <p className="text-[11px] text-slate-300 leading-relaxed">{item.summary}</p>
                  </div>

                  <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800/80 text-[11px]">
                    <button
                      type="button"
                      onClick={() =>
                        onAskPrompt(
                          `Explain "${item.title}" in full depth with latest verified facts and practical impact.`
                        )
                      }
                      className="flex-1 px-2 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-cyan-300 font-medium flex items-center justify-center gap-1 transition-colors"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>Ask</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onMakeVideo(`Make a concise explainer video about ${item.title}: ${item.summary}`)}
                      className="flex-1 px-2 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-violet-300 font-medium flex items-center justify-center gap-1 transition-colors"
                    >
                      <Film className="w-3 h-3" />
                      <span>Video</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onBuildReport(`${item.title}: ${item.summary}`)}
                      className="flex-1 px-2 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-emerald-300 font-medium flex items-center justify-center gap-1 transition-colors"
                    >
                      <FileText className="w-3 h-3" />
                      <span>Report</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {sources.length > 0 && (
            <div className="pt-2 border-t border-slate-800/70 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
              <span className="font-semibold text-emerald-400">Verified Live Sources:</span>
              {sources.map((src, i) => (
                <a
                  key={i}
                  href={src.uri}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 underline"
                >
                  <span>{src.title}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
