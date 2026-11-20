import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  CHIP_PRESETS,
  ChipSpec,
  PartitionSlot,
  OtaState,
  KnowledgeItem,
  FamilyMemberProfile,
  FamilyActivityEvent,
  AiGadget,
  GadgetCommand,
  BuiltAppPreview,
  BuiltVideoProject,
  LivePulseItem,
  GroundingSource,
} from './types/edge';
import { EdgeInferenceEngine } from './services/edgeInferenceEngine';
import {
  INITIAL_FAMILY_NAME,
  DEFAULT_FAMILY_MEMBERS,
  DEFAULT_AI_GADGETS,
  parseOfflineGadgetCommands,
} from './services/familyAndGadgetDefaults';
import { sound } from './services/soundEffects';
import { Header, MainTab } from './components/Header';
import { TelemetryRibbon } from './components/TelemetryRibbon';
import { ChipPinoutSimulator } from './components/ChipPinoutSimulator';
import { OfflineAiConsole } from './components/OfflineAiConsole';
import { AutoOtaPipeline } from './components/AutoOtaPipeline';
import { FirmwareExporter } from './components/FirmwareExporter';
import { DeployModal } from './components/DeployModal';
import { ActiveTaskType } from './components/CpuPowerWidget';
import { FamilySubAiManager } from './components/FamilySubAiManager';
import { AiGadgetsHub } from './components/AiGadgetsHub';
import { PythonEngineerTools } from './components/PythonEngineerTools';
import { EnteringSplash } from './components/EnteringSplash';
import { GuiderVideoStudio } from './components/GuiderVideoStudio';
import { SectionGuideBanner } from './components/SectionGuideBanner';
import { CreatorBusinessStudio, StudioTab } from './components/CreatorBusinessStudio';
import { LiveWorldTechBar } from './components/LiveWorldTechBar';
import { WifiOff, Cpu, RefreshCw, Download, Compass, Film } from 'lucide-react';

const STORAGE_KEYS = {
  familyName: 'assf_family_name_v1',
  members: 'assf_family_members_v1',
  activeMemberId: 'assf_active_member_v1',
  gadgets: 'assf_ai_gadgets_v1',
  evolvedRules: 'assf_evolved_rules_v1',
  firmwareVersion: 'assf_firmware_version_v1',
};

interface PersistedEvolvedRule {
  trigger: string;
  response: string;
  category: string;
}

function loadStoredJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<MainTab>('console');
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [guideInitialChapter, setGuideInitialChapter] = useState<string>('console');
  const [isBannerCollapsed, setIsBannerCollapsed] = useState<boolean>(false);
  const [hardwareSubTab, setHardwareSubTab] = useState<'silicon' | 'ota' | 'firmware'>('silicon');
  const [selectedChipId, setSelectedChipId] = useState<string>('esp32-s3');
  const selectedChip: ChipSpec = CHIP_PRESETS[selectedChipId] || CHIP_PRESETS['esp32-s3'];

  const engine = useMemo(() => new EdgeInferenceEngine(selectedChip), []);

  useEffect(() => {
    engine.setTargetChip(selectedChip);
  }, [engine, selectedChip]);

  const [activePartition, setActivePartition] = useState<PartitionSlot>('OTA_0');
  const [currentVersion, setCurrentVersion] = useState<string>(engine.getCurrentVersion());
  const [otaState, setOtaState] = useState<OtaState>('IDLE');
  const [isAirGapped, setIsAirGapped] = useState<boolean>(false); // Connected by default so any-language & universal accurate AI works immediately; toggleable anytime
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(true);
  const [sramUsedKb, setSramUsedKb] = useState<number>(24.8);
  const [lastLatencyMs, setLastLatencyMs] = useState<number>(11.2);
  const [lastPowerMw, setLastPowerMw] = useState<number>(selectedChip.idlePowerMw);
  const [isInferencing, setIsInferencing] = useState<boolean>(false);
  const [activeTaskType, setActiveTaskType] = useState<ActiveTaskType>('idle');
  const [inferenceBurstId, setInferenceBurstId] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState<boolean>(false);
  const [queuedConsolePrompt, setQueuedConsolePrompt] = useState<string | null>(null);
  const [incomingBuilderApp, setIncomingBuilderApp] = useState<BuiltAppPreview | null>(null);
  const [incomingVideoProject, setIncomingVideoProject] = useState<BuiltVideoProject | null>(null);
  const [incomingStudioTask, setIncomingStudioTask] = useState<{ tab: StudioTab; prompt: string } | null>(null);

  // Persistent Continuous Advanced AI Self-Evolution & Live 60s World/Tech State
  const [evolvedRules, setEvolvedRules] = useState<PersistedEvolvedRule[]>(() =>
    loadStoredJson<PersistedEvolvedRule[]>(STORAGE_KEYS.evolvedRules, [])
  );
  const [livePulseItems, setLivePulseItems] = useState<LivePulseItem[]>([]);
  const [livePulseSources, setLivePulseSources] = useState<GroundingSource[]>([]);
  const [pulseVersionTag, setPulseVersionTag] = useState<string>(() =>
    loadStoredJson<string>(STORAGE_KEYS.firmwareVersion, 'v1.3.0-pulse')
  );
  const [lastPulseSyncAt, setLastPulseSyncAt] = useState<string | null>(null);
  const [isPulseSyncing, setIsPulseSyncing] = useState<boolean>(false);
  const [nextPulseSec, setNextPulseSec] = useState<number>(60);
  const seenPulseTitlesRef = useRef<Set<string>>(new Set());

  // Hydrate EdgeInferenceEngine on startup with all previously evolved Advanced AI rules
  useEffect(() => {
    const savedVer = loadStoredJson<string>(STORAGE_KEYS.firmwareVersion, '');
    if (savedVer) setCurrentVersion(savedVer);
    evolvedRules.forEach((r) => {
      seenPulseTitlesRef.current.add(r.trigger.trim().toLowerCase());
      engine.addDistilledKnowledge({
        trigger: r.trigger,
        intent: 'ADVANCED_AI_EVOLVED',
        response: r.response,
        category: r.category || 'Science',
      });
    });
    if (evolvedRules.length > 0) {
      setKnowledgeVersion((v) => v + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live Family AI & Personal Sub-AI State
  const [familyName, setFamilyName] = useState<string>(() =>
    loadStoredJson<string>(STORAGE_KEYS.familyName, INITIAL_FAMILY_NAME)
  );
  const [members, setMembers] = useState<FamilyMemberProfile[]>(() => {
    const loaded = loadStoredJson<FamilyMemberProfile[]>(STORAGE_KEYS.members, DEFAULT_FAMILY_MEMBERS);
    return Array.isArray(loaded) && loaded.length > 0 ? loaded : DEFAULT_FAMILY_MEMBERS;
  });
  const [activeMemberId, setActiveMemberId] = useState<string>(() =>
    loadStoredJson<string>(STORAGE_KEYS.activeMemberId, DEFAULT_FAMILY_MEMBERS[0].id)
  );
  const activeMember = useMemo(
    () => members.find((m) => m.id === activeMemberId) || members[0],
    [members, activeMemberId]
  );

  // Live Family Activity Stream
  const [activityFeed, setActivityFeed] = useState<FamilyActivityEvent[]>([
    {
      id: 'init-ev-1',
      timestamp: new Date().toLocaleTimeString(),
      memberName: DEFAULT_FAMILY_MEMBERS[0].name,
      subAiName: DEFAULT_FAMILY_MEMBERS[0].subAiName,
      summary: `Live Family AI Network "${INITIAL_FAMILY_NAME}" online across home & industrial nodes.`,
      category: 'family',
    },
  ]);

  // Household & Industrial AI Gadgets State
  const [gadgets, setGadgets] = useState<AiGadget[]>(() => {
    const loaded = loadStoredJson<AiGadget[]>(STORAGE_KEYS.gadgets, DEFAULT_AI_GADGETS);
    return Array.isArray(loaded) && loaded.length > 0 ? loaded : DEFAULT_AI_GADGETS;
  });

  // Persist Family & Gadget states
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.familyName, JSON.stringify(familyName));
      localStorage.setItem(STORAGE_KEYS.members, JSON.stringify(members));
      localStorage.setItem(STORAGE_KEYS.activeMemberId, JSON.stringify(activeMemberId));
      localStorage.setItem(STORAGE_KEYS.gadgets, JSON.stringify(gadgets));
    } catch {
      // Ignore storage quota errors
    }
  }, [familyName, members, activeMemberId, gadgets]);

  useEffect(() => {
    if (!isInferencing) {
      setLastPowerMw(selectedChip.idlePowerMw);
    }
  }, [selectedChip.id, selectedChip.idlePowerMw, isInferencing]);

  useEffect(() => {
    sound.setMuted(isMuted);
  }, [isMuted]);

  const handleInferenceStart = (mode: 'offline' | 'vision' | 'frontier') => {
    setIsInferencing(true);
    setActiveTaskType(mode);
    setInferenceBurstId((id) => id + 1);
  };

  const handleInferenceExecuted = (latencyMs: number, sramKb: number, powerMw?: number) => {
    setLastLatencyMs(latencyMs);
    setSramUsedKb(sramKb);
    if (typeof powerMw === 'number') {
      setLastPowerMw(powerMw);
    }
    setIsInferencing(false);
    setInferenceBurstId((id) => id + 1);
  };

  const [knowledgeVersion, setKnowledgeVersion] = useState<number>(0);
  const knowledge = useMemo(() => engine.getKnowledgeBank(), [engine, knowledgeVersion]);

  const handleAddKnowledge = (item: KnowledgeItem) => {
    engine.addKnowledgeItem(item);
    setKnowledgeVersion((v) => v + 1);
  };

  const persistEvolvedRules = useCallback(
    (incoming: PersistedEvolvedRule[], nextVersion?: string) => {
      if (incoming.length === 0 && !nextVersion) return;
      if (incoming.length > 0) {
        setEvolvedRules((prev) => {
          const merged = [...incoming, ...prev].slice(0, 60);
          try {
            localStorage.setItem(STORAGE_KEYS.evolvedRules, JSON.stringify(merged));
          } catch {
            // Ignore storage quota errors
          }
          return merged;
        });
      }
      if (nextVersion) {
        setCurrentVersion(nextVersion);
        setPulseVersionTag(nextVersion);
        try {
          localStorage.setItem(STORAGE_KEYS.firmwareVersion, JSON.stringify(nextVersion));
        } catch {
          // Ignore storage quota errors
        }
      }
      setOtaState('HOT_RELOAD_SUCCESS');
      setTimeout(() => setOtaState('IDLE'), 2200);
    },
    []
  );

  const syncLiveWorldTechPulse = useCallback(
    async (force = false) => {
      if (isAirGapped) return;
      setIsPulseSyncing(true);
      try {
        const res = await fetch(`/api/assf/live-pulse${force ? '?force=true' : ''}`);
        if (!res.ok) return;
        const data = await res.json();
        const items: LivePulseItem[] = Array.isArray(data.items) ? data.items : [];
        if (items.length > 0) {
          setLivePulseItems(items);
          setLivePulseSources(Array.isArray(data.sources) ? data.sources : []);
          const nextVer = data.versionTag ? String(data.versionTag) : undefined;
          setLastPulseSyncAt(new Date().toLocaleTimeString());
          setNextPulseSec(60);

          const newlyEvolved: PersistedEvolvedRule[] = [];
          items.forEach((it) => {
            const key = it.title.trim().toLowerCase();
            if (!seenPulseTitlesRef.current.has(key)) {
              seenPulseTitlesRef.current.add(key);
              const cat = it.category === 'World & Economy' ? 'World' : 'Science';
              const resp = `[${it.category} · ${it.timestamp}] ${it.title}: ${it.summary}`;
              const trig = it.triggerKeywords || key;
              engine.addDistilledKnowledge({
                trigger: trig,
                intent: 'LIVE_WORLD_TECH_PULSE',
                response: resp,
                category: cat,
              });
              newlyEvolved.push({ trigger: trig, response: resp, category: cat });
            }
          });

          if (newlyEvolved.length > 0) {
            setKnowledgeVersion((v) => v + 1);
            persistEvolvedRules(newlyEvolved, nextVer);
          } else if (nextVer) {
            setPulseVersionTag(nextVer);
          }
        }
      } catch {
        // Silent background resilience on transient network issue
      } finally {
        setIsPulseSyncing(false);
      }
    },
    [engine, isAirGapped, persistEvolvedRules]
  );

  // Run initial live world & tech sync + automatic every-60-seconds update loop
  useEffect(() => {
    if (isAirGapped) return;
    syncLiveWorldTechPulse(false);
    const syncTimer = setInterval(() => {
      syncLiveWorldTechPulse(true);
    }, 60_000);
    const countdownTimer = setInterval(() => {
      setNextPulseSec((s) => (s <= 1 ? 60 : s - 1));
    }, 1000);
    return () => {
      clearInterval(syncTimer);
      clearInterval(countdownTimer);
    };
  }, [isAirGapped, syncLiveWorldTechPulse]);

  const logFamilyActivity = useCallback(
    (summary: string, category: 'chat' | 'gadget' | 'family' | 'engineering', overrideMember?: FamilyMemberProfile) => {
      const m = overrideMember || activeMember;
      setActivityFeed((prev) => [
        {
          id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toLocaleTimeString(),
          memberName: m.name,
          subAiName: m.subAiName,
          summary,
          category,
        },
        ...prev.slice(0, 29),
      ]);
    },
    [activeMember]
  );

  // Family Member CRUD Handlers
  const handleAddMember = (newMember: FamilyMemberProfile) => {
    setMembers((prev) => [...prev, newMember]);
    setActiveMemberId(newMember.id);
    logFamilyActivity(
      `Added family member "${newMember.name}" with personal Sub-AI "${newMember.subAiName}" (${newMember.role})`,
      'family',
      newMember
    );
  };

  const handleRemoveMember = (memberId: string) => {
    setMembers((prev) => {
      const filtered = prev.filter((m) => m.id !== memberId);
      if (activeMemberId === memberId && filtered.length > 0) {
        setActiveMemberId(filtered[0].id);
      }
      return filtered.length > 0 ? filtered : prev;
    });
  };

  const handleSelectMember = (memberId: string, openConsole?: boolean) => {
    setActiveMemberId(memberId);
    if (openConsole) {
      setActiveTab('console');
    }
  };

  // AI Gadget Control Handlers
  const handleApplyGadgetCommands = useCallback(
    (commands: GadgetCommand[], actorLabel: string): string[] => {
      const appliedMessages: string[] = [];
      setGadgets((prev) =>
        prev.map((g) => {
          const cmd = commands.find((c) => c.gadgetId === g.id);
          if (!cmd) return g;

          if (activeMember.gadgetScope !== 'all' && g.domain !== activeMember.gadgetScope) {
            appliedMessages.push(`Blocked (${activeMember.gadgetScope} scope): ${g.name}`);
            return g;
          }

          const nextIsOn = cmd.isOn !== undefined ? cmd.isOn : g.isOn;
          const nextMetric =
            cmd.metricValue !== undefined
              ? Math.max(g.minVal, Math.min(g.maxVal, cmd.metricValue))
              : g.metricValue;
          const nextStatus =
            cmd.statusText ||
            (nextIsOn ? `Active · ${nextMetric} ${g.unit}` : 'Standby · Off');

          appliedMessages.push(
            `${g.name} [${g.zone}] → ${nextIsOn ? 'ON' : 'OFF'} (${g.metricLabel}: ${nextMetric} ${g.unit})`
          );

          return {
            ...g,
            isOn: nextIsOn,
            metricValue: nextMetric,
            statusText: nextStatus,
          };
        })
      );

      if (appliedMessages.length > 0) {
        logFamilyActivity(`${actorLabel} executed: ${appliedMessages.join('; ')}`, 'gadget');
      }
      return appliedMessages;
    },
    [activeMember.gadgetScope, logFamilyActivity]
  );

  const handleToggleGadget = (gadgetId: string) => {
    const target = gadgets.find((g) => g.id === gadgetId);
    if (!target) return;
    handleApplyGadgetCommands(
      [
        {
          gadgetId,
          isOn: !target.isOn,
          statusText: !target.isOn ? `Active · ${target.metricValue} ${target.unit}` : 'Standby · Off',
        },
      ],
      `${activeMember.subAiName}`
    );
  };

  const handleUpdateGadgetMetric = (gadgetId: string, value: number) => {
    const target = gadgets.find((g) => g.id === gadgetId);
    if (!target) return;
    setGadgets((prev) =>
      prev.map((g) =>
        g.id === gadgetId
          ? {
              ...g,
              metricValue: value,
              isOn: value > 0 ? true : g.isOn,
              statusText: `Set to ${value} ${g.unit}`,
            }
          : g
      )
    );
  };

  const handleRunAiGadgetCommand = async (commandText: string): Promise<string> => {
    if (!isAirGapped) {
      try {
        const res = await fetch('/api/assf/solve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: commandText,
            chipName: selectedChip.name,
            currentVersion,
            language: 'auto',
            familyName,
            activeMember,
            gadgets,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const cmds = Array.isArray(data.distilledDiff?.gadgetCommands)
            ? (data.distilledDiff.gadgetCommands as GadgetCommand[])
            : [];
          if (cmds.length > 0) {
            const summary = handleApplyGadgetCommands(cmds, `${activeMember.subAiName}`);
            return `${data.solution}\n\nExecuted:\n• ${summary.join('\n• ')}`;
          }
          return data.solution;
        }
      } catch {
        // Fall through to offline parser
      }
    }

    const parsed = parseOfflineGadgetCommands(commandText, gadgets, activeMember.gadgetScope);
    if (parsed.commands.length > 0) {
      const applied = handleApplyGadgetCommands(parsed.commands, `${activeMember.subAiName}`);
      return `Executed offline via ${activeMember.subAiName}:\n• ${applied.join('\n• ')}`;
    }
    if (parsed.blockedNotices.length > 0) {
      return parsed.blockedNotices.join('\n');
    }
    return `No matching gadget detected in command "${commandText}". Try specifying a device name (e.g., vacuum, AC, induction, CNC spindle, boiler, conveyor).`;
  };

  const openPromptInConsole = (promptText: string) => {
    setQueuedConsolePrompt(promptText);
    setActiveTab('console');
  };

  const mobileTabs: { id: MainTab; label: string }[] = [
    { id: 'console', label: 'AI Console' },
    { id: 'studio', label: 'Creator & Biz' },
    { id: 'family', label: 'Family' },
    { id: 'gadgets', label: 'Gadgets' },
    { id: 'python', label: 'Python' },
    { id: 'hardware', label: 'Silicon' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      <EnteringSplash isVisible={showSplash} onComplete={() => setShowSplash(false)} />

      {/* 3-zone Header Contract */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isAirGapped={isAirGapped}
        setIsAirGapped={setIsAirGapped}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
        onDeployClick={() => setIsDeployModalOpen(true)}
        onBrandClick={() => setShowSplash(true)}
        chipName={selectedChip.name}
        firmwareVersion={currentVersion}
      />

      {/* Mobile Navigation Bar */}
      <div className="md:hidden border-b border-slate-800 bg-slate-950 px-3 py-2 flex items-center gap-1.5 overflow-x-auto">
        {mobileTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              activeTab === t.id
                ? 'bg-cyan-400 text-slate-950 font-semibold'
                : 'bg-slate-900 text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Top Precision Telemetry Ribbon with Real-Time CPU & Power Graph */}
      <TelemetryRibbon
        chip={selectedChip}
        activePartition={activePartition}
        currentVersion={currentVersion}
        isAirGapped={isAirGapped}
        sramUsedKb={sramUsedKb}
        lastLatencyMs={lastLatencyMs}
        otaState={otaState}
        autoSyncEnabled={autoSyncEnabled}
        isInferencing={isInferencing}
        activeTaskType={activeTaskType}
        lastPowerMw={lastPowerMw}
        inferenceBurstId={inferenceBurstId}
      />

      {/* Main Workspace Frame */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <SectionGuideBanner
          activeTab={activeTab}
          isCollapsed={isBannerCollapsed}
          onToggleCollapse={() => setIsBannerCollapsed((v) => !v)}
          onWatchVideo={(chapterId) => {
            setGuideInitialChapter(chapterId);
            setIsGuideOpen(true);
          }}
          onOpenGuider={() => {
            setGuideInitialChapter(activeTab);
            setIsGuideOpen(true);
          }}
        />

        {isAirGapped && (
          <div className="bg-amber-950/20 border border-amber-800/60 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-amber-300">
            <div className="flex items-center gap-2.5">
              <WifiOff className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                <strong>Air-Gapped Silicon Mode:</strong> Running 100% offline on {selectedChip.name} with local math, gadget bus, and flash rules.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsAirGapped(false)}
              className="text-amber-400 hover:text-amber-200 underline whitespace-nowrap text-[11px]"
            >
              Connect Gateway (Enable Multilingual Universal Solver + Auto-OTA)
            </button>
          </div>
        )}

        <LiveWorldTechBar
          items={livePulseItems}
          sources={livePulseSources}
          lastSyncAt={lastPulseSyncAt}
          versionTag={pulseVersionTag}
          nextSyncSec={nextPulseSec}
          evolvedCount={evolvedRules.length}
          isSyncing={isPulseSyncing}
          isAirGapped={isAirGapped}
          onSyncNow={() => syncLiveWorldTechPulse(true)}
          onAskPrompt={openPromptInConsole}
          onMakeVideo={openPromptInConsole}
          onBuildReport={(topic) => {
            setIncomingStudioTask({ tab: 'report', prompt: topic });
            setActiveTab('studio');
          }}
        />

        {activeTab === 'console' && (
          <OfflineAiConsole
            engine={engine}
            chip={selectedChip}
            isAirGapped={isAirGapped}
            currentVersion={currentVersion}
            familyName={familyName}
            members={members}
            activeMember={activeMember}
            onSelectMember={(id) => handleSelectMember(id, false)}
            gadgets={gadgets}
            onApplyGadgetCommands={handleApplyGadgetCommands}
            onLogFamilyActivity={(summary, cat) => logFamilyActivity(summary, cat)}
            queuedPrompt={queuedConsolePrompt}
            onClearQueuedPrompt={() => setQueuedConsolePrompt(null)}
            onInferenceStart={handleInferenceStart}
            onInferenceExecuted={handleInferenceExecuted}
            onOpenInBuilder={(app) => {
              setIncomingBuilderApp(app);
              setActiveTab('studio');
            }}
            onOpenInVideoStudio={(video) => {
              setIncomingVideoProject(video);
              setActiveTab('studio');
            }}
            onAiEvolved={(trigger, response, category, nextPatchVersion) => {
              setKnowledgeVersion((v) => v + 1);
              persistEvolvedRules(
                [{ trigger, response, category: category || 'General' }],
                nextPatchVersion
              );
            }}
          />
        )}

        {activeTab === 'studio' && (
          <CreatorBusinessStudio
            isAirGapped={isAirGapped}
            onLogActivity={(summary, cat) => logFamilyActivity(summary, cat)}
            incomingApp={incomingBuilderApp}
            onClearIncomingApp={() => setIncomingBuilderApp(null)}
            incomingVideo={incomingVideoProject}
            onClearIncomingVideo={() => setIncomingVideoProject(null)}
            incomingStudioTask={incomingStudioTask}
            onClearIncomingTask={() => setIncomingStudioTask(null)}
          />
        )}

        {activeTab === 'family' && (
          <FamilySubAiManager
            familyName={familyName}
            onUpdateFamilyName={(name) => {
              setFamilyName(name);
              logFamilyActivity(`Renamed Live Family AI Network to "${name}"`, 'family');
            }}
            members={members}
            activeMemberId={activeMember.id}
            onSelectMember={handleSelectMember}
            onAddMember={handleAddMember}
            onRemoveMember={handleRemoveMember}
            activityFeed={activityFeed}
            onPostFamilyNotice={(notice) => logFamilyActivity(notice, 'family')}
          />
        )}

        {activeTab === 'gadgets' && (
          <AiGadgetsHub
            gadgets={gadgets}
            activeMember={activeMember}
            onToggleGadget={handleToggleGadget}
            onUpdateGadgetMetric={handleUpdateGadgetMetric}
            onRunAiGadgetCommand={handleRunAiGadgetCommand}
            onAskConsoleDiagnostics={(g) =>
              openPromptInConsole(
                `Inspect ${g.name} in ${g.zone} (currently ${g.isOn ? 'ON' : 'OFF'}, ${g.metricLabel}: ${g.metricValue} ${g.unit}, ${g.powerWatts}W). Check safety, efficiency, and optimal settings.`
              )
            }
          />
        )}

        {activeTab === 'python' && (
          <PythonEngineerTools onAskAssfPython={openPromptInConsole} />
        )}

        {activeTab === 'hardware' && (
          <div className="space-y-6">
            {/* Hardware Sub-Navigation */}
            <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => setHardwareSubTab('silicon')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  hardwareSubTab === 'silicon'
                    ? 'bg-cyan-400 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Silicon & Pinout</span>
              </button>
              <button
                type="button"
                onClick={() => setHardwareSubTab('ota')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  hardwareSubTab === 'ota'
                    ? 'bg-cyan-400 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Auto-OTA Pipeline</span>
              </button>
              <button
                type="button"
                onClick={() => setHardwareSubTab('firmware')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  hardwareSubTab === 'firmware'
                    ? 'bg-cyan-400 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>C++ Firmware & Knowledge Export</span>
              </button>
            </div>

            {hardwareSubTab === 'silicon' && (
              <ChipPinoutSimulator
                selectedChip={selectedChip}
                onSelectChip={(c) => setSelectedChipId(c.id)}
                activePartition={activePartition}
                currentVersion={currentVersion}
                sramUsedKb={sramUsedKb}
                lastLatencyMs={lastLatencyMs}
              />
            )}

            {hardwareSubTab === 'ota' && (
              <AutoOtaPipeline
                engine={engine}
                chip={selectedChip}
                activePartition={activePartition}
                setActivePartition={setActivePartition}
                currentVersion={currentVersion}
                setCurrentVersion={setCurrentVersion}
                otaState={otaState}
                setOtaState={setOtaState}
                autoSyncEnabled={autoSyncEnabled}
                setAutoSyncEnabled={setAutoSyncEnabled}
              />
            )}

            {hardwareSubTab === 'firmware' && (
              <FirmwareExporter
                chip={selectedChip}
                knowledge={knowledge}
                currentVersion={currentVersion}
                onAddKnowledge={handleAddKnowledge}
              />
            )}
          </div>
        )}
      </main>

      {/* Clean Editorial Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-6 py-4 text-xs font-mono text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
            <span>ASSF Intelligence · {familyName}</span>
            <span aria-hidden="true">·</span>
            <span>Created by ASSF Technology and Enterprise</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300 font-medium">
            <span>Created by Fahad sha</span>
          </div>
        </div>
      </footer>

      <DeployModal
        isOpen={isDeployModalOpen}
        onClose={() => setIsDeployModalOpen(false)}
        chip={selectedChip}
        knowledge={knowledge}
        currentVersion={currentVersion}
      />

      {/* Interactive Video Demonstration & Guider Assistant Studio */}
      <GuiderVideoStudio
        isOpen={isGuideOpen}
        initialChapterId={guideInitialChapter}
        onClose={() => setIsGuideOpen(false)}
        onNavigateTab={(tab) => setActiveTab(tab)}
      />

      {/* Quick Floating Guider & Video Tour Launcher */}
      <button
        type="button"
        onClick={() => {
          setGuideInitialChapter(activeTab);
          setIsGuideOpen(true);
        }}
        className="fixed bottom-5 right-5 z-40 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-cyan-500/50 text-white rounded-full shadow-xl flex items-center gap-2 text-xs font-semibold transition-colors"
        title="Open ASSF Guider Assistant & Video Demonstrations"
      >
        <Film className="w-4 h-4 text-cyan-400" />
        <span>Video Guide & Helper</span>
        <Compass className="w-3.5 h-3.5 text-emerald-400" />
      </button>
    </div>
  );
}
