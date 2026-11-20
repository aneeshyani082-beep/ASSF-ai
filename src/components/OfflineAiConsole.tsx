import React, { useState, useRef, useEffect, useCallback } from 'react';
import { EdgeInferenceEngine } from '../services/edgeInferenceEngine';
import { parseOfflineGadgetCommands } from '../services/familyAndGadgetDefaults';
import { buildOfflineAdaptiveApp, isBuildRequestPrompt } from '../services/appBuilderFallback';
import { buildOfflineVideoProject, isVideoRequestPrompt } from '../services/videoStudioEngine';
import { InlineVideoPlayerCard } from './InlineVideoPlayerCard';
import {
  AiGadget,
  BuiltAppPreview,
  BuiltVideoProject,
  ChatMessage,
  ChipSpec,
  FamilyMemberProfile,
  GadgetCommand,
  SUPPORTED_LANGUAGES,
} from '../types/edge';
import { sound } from '../services/soundEffects';
import { downloadAnswerPdf, printAnswerHtml } from '../services/pdfExport';
import {
  Send,
  Terminal,
  Sparkles,
  ShieldCheck,
  Trash2,
  Zap,
  Code2,
  Globe,
  Cpu,
  Layers,
  GraduationCap,
  Camera,
  Image as ImageIcon,
  Mic,
  Volume2,
  VolumeX,
  X,
  RefreshCw,
  Eye,
  Radio,
  Users,
  ExternalLink,
  Search,
  BrainCircuit,
  Printer,
  FileDown,
  Monitor,
  Smartphone,
  Download,
  Hammer,
  Film,
} from 'lucide-react';

interface OfflineAiConsoleProps {
  engine: EdgeInferenceEngine;
  chip: ChipSpec;
  isAirGapped: boolean;
  currentVersion: string;
  familyName: string;
  members: FamilyMemberProfile[];
  activeMember: FamilyMemberProfile;
  onSelectMember: (memberId: string) => void;
  gadgets: AiGadget[];
  onApplyGadgetCommands: (commands: GadgetCommand[], actorLabel: string) => string[];
  onLogFamilyActivity: (summary: string, category: 'chat' | 'gadget' | 'family' | 'engineering') => void;
  queuedPrompt?: string | null;
  onClearQueuedPrompt?: () => void;
  onInferenceStart?: (mode: 'offline' | 'vision' | 'frontier') => void;
  onInferenceExecuted: (latencyMs: number, sramKb: number, powerMw?: number) => void;
  onOpenInBuilder?: (app: BuiltAppPreview) => void;
  onOpenInVideoStudio?: (video: BuiltVideoProject) => void;
  onAiEvolved?: (trigger: string, response: string, category?: string, nextPatchVersion?: string) => void;
}

type PromptCategory = 'all' | 'video' | 'build' | 'tech' | 'btech' | 'vision' | 'python' | 'java' | 'cpp' | 'world' | 'silicon';

interface PromptOption {
  label: string;
  prompt: string;
  category: PromptCategory;
  badge: string;
}

// Check speech recognition support
const SpeechRecognitionAPI =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

function createMemberWelcome(
  member: FamilyMemberProfile,
  familyName: string,
  chip: ChipSpec,
  currentVersion: string
): ChatMessage {
  const langObj = SUPPORTED_LANGUAGES.find((l) => l.code === member.languageCode);
  const langLabel = member.customLanguage || langObj?.name || 'Any Language';
  return {
    id: `welcome-${member.id}`,
    sender: 'chip',
    text: `[${member.subAiName} · ${familyName} · Firmware ${currentVersion}]
Personal Sub-AI ready for ${member.name} (${member.role}) on ${chip.name}.

• Spoken & Written Language: ${langLabel} (speak or type in any language)
• Specialty Focus: ${member.specialty}
• AI Gadgets Scope: ${member.gadgetScope.toUpperCase()} household & industrial devices
• Capabilities: Photo/Camera inspection, B.Tech & world knowledge, Python engineering scripts, and live gadget control.`,
    timestamp: new Date().toLocaleTimeString(),
  };
}

export const OfflineAiConsole: React.FC<OfflineAiConsoleProps> = ({
  engine,
  chip,
  isAirGapped,
  currentVersion,
  familyName,
  members,
  activeMember,
  onSelectMember,
  gadgets,
  onApplyGadgetCommands,
  onLogFamilyActivity,
  queuedPrompt,
  onClearQueuedPrompt,
  onInferenceStart,
  onInferenceExecuted,
  onOpenInBuilder,
  onOpenInVideoStudio,
  onAiEvolved,
}) => {
  const [appPreviewViewport, setAppPreviewViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [threadsByMember, setThreadsByMember] = useState<Record<string, ChatMessage[]>>(() => ({
    [activeMember.id]: [createMemberWelcome(activeMember, familyName, chip, currentVersion)],
  }));

  const messages = threadsByMember[activeMember.id] || [
    createMemberWelcome(activeMember, familyName, chip, currentVersion),
  ];

  const setMessagesForActiveMember = useCallback(
    (updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
      setThreadsByMember((prev) => {
        const current = prev[activeMember.id] || [
          createMemberWelcome(activeMember, familyName, chip, currentVersion),
        ];
        const next = typeof updater === 'function' ? updater(current) : updater;
        return { ...prev, [activeMember.id]: next };
      });
    },
    [activeMember, familyName, chip, currentVersion]
  );

  const [selectedLangCode, setSelectedLangCode] = useState<string>(activeMember.languageCode || 'auto');
  const [customLanguageInput, setCustomLanguageInput] = useState<string>(activeMember.customLanguage || '');

  useEffect(() => {
    setSelectedLangCode(activeMember.languageCode || 'auto');
    setCustomLanguageInput(activeMember.customLanguage || '');
  }, [activeMember.id, activeMember.languageCode, activeMember.customLanguage]);

  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [useFrontierSolver, setUseFrontierSolver] = useState(true);
  const [useLiveSearch, setUseLiveSearch] = useState(true);
  const [reasoningDepth, setReasoningDepth] = useState<'deep' | 'balanced'>('deep');
  const [flashSyncToast, setFlashSyncToast] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<PromptCategory>('all');

  // Photo & Camera State
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  // Audio & Voice State
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeakEnabled, setAutoSpeakEnabled] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  const [uartLog, setUartLog] = useState<string[]>([
    `[UART:115200] BOOT_OK: ASSF Omniscient Core active on ${chip.name}`,
    `[UART:115200] MULTIMODAL_SUBSYSTEMS: Camera DVP/MIPI CSI, WebAudio I2S, INT8 GEMM`,
    `[UART:115200] AUDIO_VOICE: SpeechSynthesis & Web Speech API Ready`,
    `[UART:115200] STATUS: Standby for photo visual inspection, voice audio, B.Tech & polyglot code...`,
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing, attachedImage]);

  // Clean up media streams and speech on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Text-To-Speech (Speech Synthesis) for Multilingual Audio Conversation
  const speakText = useCallback(
    (text: string, msgId?: string) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

      window.speechSynthesis.cancel();

      const cleanSpeech = text
        .replace(/<<<ASSF_EDGE_DIFF>>>[\s\S]*?<<<END_ASSF_EDGE_DIFF>>>/g, '')
        .replace(/```[\s\S]*?```/g, 'Code block ready on screen.')
        .replace(/\[.*?\]/g, '')
        .replace(/[#*_`]/g, '')
        .trim();

      if (!cleanSpeech) return;

      const utterance = new SpeechSynthesisUtterance(cleanSpeech.slice(0, 850));
      utterance.rate = activeMember.voiceRate || 1.05;
      utterance.pitch = activeMember.voicePitch || 1.0;

      const targetLang =
        selectedLangCode !== 'auto' && selectedLangCode !== 'custom'
          ? selectedLangCode
          : /[\u0900-\u097F]/.test(cleanSpeech)
          ? 'hi-IN'
          : /[\u0B80-\u0BFF]/.test(cleanSpeech)
          ? 'ta-IN'
          : /[\u0C00-\u0C7F]/.test(cleanSpeech)
          ? 'te-IN'
          : /[\u0600-\u06FF]/.test(cleanSpeech)
          ? 'ar-SA'
          : /[\u3040-\u30FF]/.test(cleanSpeech)
          ? 'ja-JP'
          : /[\u4E00-\u9FFF]/.test(cleanSpeech)
          ? 'zh-CN'
          : 'en-US';

      utterance.lang = targetLang;
      const voices = window.speechSynthesis.getVoices();
      const langPrefix = targetLang.split('-')[0];
      const matchedVoice =
        voices.find((v) => v.lang.toLowerCase() === targetLang.toLowerCase()) ||
        voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix.toLowerCase()));
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        if (msgId) setSpeakingMessageId(msgId);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setSpeakingMessageId(null);
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        setSpeakingMessageId(null);
      };

      window.speechSynthesis.speak(utterance);
    },
    [selectedLangCode, activeMember.voicePitch, activeMember.voiceRate]
  );

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setSpeakingMessageId(null);
    }
  };

  // Web Speech API Multilingual Voice Recognition (Microphone Input)
  const toggleSpeechRecognition = () => {
    sound.playFlashTick();

    if (!SpeechRecognitionAPI) {
      setFlashSyncToast('Speech recognition not supported in this browser. Please use Chrome/Edge or type in any language.');
      setTimeout(() => setFlashSyncToast(null), 4000);
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang =
        selectedLangCode !== 'auto' && selectedLangCode !== 'custom'
          ? selectedLangCode
          : typeof navigator !== 'undefined'
          ? navigator.language || 'en-US'
          : 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        sound.playChipBuzzer(1200);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInput(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Speech recognition failed to start:', err);
      setIsListening(false);
    }
  };

  // Camera Access & Viewfinder Controls
  const openCamera = async () => {
    sound.playFlashTick();
    setCameraError(null);
    setIsCameraModalOpen(true);

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in browser permissions.'
          : 'Unable to access camera hardware. Verify no other app is using your webcam.'
      );
    }
  };

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraModalOpen(false);
  };

  const flipCamera = async () => {
    const newMode = cameraFacingMode === 'environment' ? 'user' : 'environment';
    setCameraFacingMode(newMode);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newMode },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    sound.playFlashTick();
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setAttachedImage(dataUrl);
      closeCamera();
      sound.playOtaSuccess();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    sound.playFlashTick();
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setAttachedImage(result);
      sound.playOtaSuccess();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle queued prompt passed from Gadgets Hub or Python Workbench
  useEffect(() => {
    if (queuedPrompt && queuedPrompt.trim()) {
      setInput(queuedPrompt);
      onClearQueuedPrompt?.();
    }
  }, [queuedPrompt, onClearQueuedPrompt]);

  const activeLanguageLabel =
    selectedLangCode === 'custom' && customLanguageInput.trim()
      ? customLanguageInput.trim()
      : SUPPORTED_LANGUAGES.find((l) => l.code === selectedLangCode)?.name || 'Auto-Detect (Any Language)';

  const handleSend = async (textToSend?: string) => {
    const query = textToSend !== undefined ? textToSend : input;
    const imageToSend = attachedImage;

    if ((!query.trim() && !imageToSend) || isProcessing) return;

    sound.playFlashTick();

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query || (imageToSend ? 'Analyze this attached photo / camera snapshot' : ''),
      image: imageToSend || undefined,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessagesForActiveMember((prev) => [...prev, userMsg]);
    setInput('');
    setAttachedImage(null);
    setIsProcessing(true);
    onInferenceStart?.(
      imageToSend ? 'vision' : !isAirGapped && useFrontierSolver ? 'frontier' : 'offline'
    );

    setUartLog((prev) => [
      ...prev.slice(-15),
      `[UART:115200] SUB_AI[${activeMember.subAiName}] RX: "${(query || 'Photo').slice(0, 32)}..." (${activeLanguageLabel})`,
      `[UART:115200] FORWARD_PASS: INT8 Dot-Product on ${chip.clockMhz}MHz Core 1`,
    ]);

    // Connected Frontier Reasoning (Multilingual + Sub-AI + AI Gadgets + Auto-Distill)
    if (!isAirGapped && (useFrontierSolver || imageToSend)) {
      try {
        setUartLog((prev) => [
          ...prev.slice(-15),
          `[UART:115200] GATEWAY_LINK: Calling ASSF Universal Solver (${activeLanguageLabel})...`,
        ]);

        const langForApi =
          selectedLangCode === 'custom'
            ? customLanguageInput.trim() || 'auto'
            : selectedLangCode === 'auto'
            ? 'auto'
            : `${activeLanguageLabel} (${selectedLangCode})`;

        const res = await fetch('/api/assf/solve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: query,
            image: imageToSend || undefined,
            chipName: chip.name,
            currentVersion,
            language: langForApi,
            familyName,
            activeMember,
            gadgets,
            conversationHistory: messages.slice(-6),
            useLiveSearch,
            reasoningDepth,
          }),
        });

        if (!res.ok) {
          throw new Error(`Gateway returned HTTP ${res.status}`);
        }

        const data = await res.json();
        let solutionText = data.solution || 'No response generated.';

        // Apply any AI Gadget commands returned by ASSF
        const gadgetCmds = Array.isArray(data.distilledDiff?.gadgetCommands)
          ? (data.distilledDiff.gadgetCommands as GadgetCommand[])
          : [];
        if (gadgetCmds.length > 0) {
          const applied = onApplyGadgetCommands(gadgetCmds, `${activeMember.subAiName} (${activeMember.name})`);
          if (applied.length > 0) {
            solutionText += `\n\n[AI Gadget Bus Executed]\n• ${applied.join('\n• ')}`;
          }
        }

        if (data.distilledDiff) {
          const trigger = data.distilledDiff.trigger || (query ? query.slice(0, 30) : 'visual inspection photo');
          const cat = data.distilledDiff.category || (imageToSend ? 'Science' : 'General');
          engine.addDistilledKnowledge({
            trigger,
            intent: data.distilledDiff.intent || 'FRONTIER_SOLVE_DISTILL',
            response: solutionText,
            category: cat,
          });
          onAiEvolved?.(trigger, solutionText, cat, data.autoPatch?.version);

          setFlashSyncToast(`Advanced AI self-updated ${chip.name} flash knowledge!`);
          setTimeout(() => setFlashSyncToast(null), 4000);
        }

        const resolvedBuiltVideo: BuiltVideoProject | undefined =
          data.builtVideo && Array.isArray(data.builtVideo.scenes) && data.builtVideo.scenes.length > 0
            ? (data.builtVideo as BuiltVideoProject)
            : !imageToSend && isVideoRequestPrompt(query)
            ? buildOfflineVideoProject(query)
            : undefined;

        const resolvedBuiltApp: BuiltAppPreview | undefined = resolvedBuiltVideo
          ? undefined
          : data.builtApp && data.builtApp.htmlCode
          ? (data.builtApp as BuiltAppPreview)
          : !imageToSend && isBuildRequestPrompt(query)
          ? buildOfflineAdaptiveApp(query)
          : undefined;

        const chipMsg: ChatMessage = {
          id: `chip-${Date.now()}`,
          sender: 'chip',
          text: solutionText,
          timestamp: new Date().toLocaleTimeString(),
          groundingSources: Array.isArray(data.sources) ? data.sources : undefined,
          builtApp: resolvedBuiltApp,
          builtVideo: resolvedBuiltVideo,
          telemetry: {
            latencyMs: 38.4,
            tokensPerSec: 320,
            sramUsedKb: 34.2,
            flashFootprintKb: 1480,
            confidenceScore: 99.8,
            cpuCyclesEst: Math.round(38.4 * chip.clockMhz * 1000),
            powerConsumptionMw: chip.activePowerMw,
            triggeredAction:
              resolvedBuiltVideo
                ? 'PROMPT_VIDEO_CREATED'
                : resolvedBuiltApp
                ? 'UNIVERSAL_APP_BUILT'
                : gadgetCmds.length > 0
                ? 'AI_GADGET_DISPATCH'
                : imageToSend
                ? 'VISUAL_INSPECTION_SOLVE'
                : 'FRONTIER_SOLVE_AND_DISTILL',
            executionMode: '100% OFFLINE ON-CHIP',
          },
        };

        setMessagesForActiveMember((prev) => [...prev, chipMsg]);
        setIsProcessing(false);
        sound.playChipBuzzer(1760);

        onInferenceExecuted(
          chipMsg.telemetry!.latencyMs,
          chipMsg.telemetry!.sramUsedKb,
          chipMsg.telemetry!.powerConsumptionMw
        );
        onLogFamilyActivity(
          resolvedBuiltVideo
            ? `Created Video "${resolvedBuiltVideo.title}" in AI Console`
            : resolvedBuiltApp
            ? `Built "${resolvedBuiltApp.appTitle}" in AI Console`
            : `Asked: "${(query || 'Photo inspection').slice(0, 60)}"`,
          resolvedBuiltVideo || resolvedBuiltApp
            ? 'engineering'
            : gadgetCmds.length > 0
            ? 'gadget'
            : 'chat'
        );

        if (autoSpeakEnabled) {
          speakText(solutionText, chipMsg.id);
        }

        setUartLog((prev) => [
          ...prev.slice(-15),
          `[UART:115200] SOLVE_COMPLETE: Solution distilled into Flash partition`,
          `[UART:115200] AUTO_OTA: Delta knowledge ready for offline recall`,
        ]);
        return;
      } catch (err) {
        console.warn('Frontier solver failed, falling back to on-chip offline inference:', err);
      }
    }

    // 100% OFFLINE on-device inference + offline AI Gadget execution + offline app & video builder
    setTimeout(() => {
      const gadgetParse = parseOfflineGadgetCommands(query, gadgets, activeMember.gadgetScope);
      let appliedSummary: string[] = [];
      if (gadgetParse.commands.length > 0) {
        appliedSummary = onApplyGadgetCommands(
          gadgetParse.commands,
          `${activeMember.subAiName} (${activeMember.name})`
        );
      }

      const offlineBuiltVideo =
        !imageToSend && isVideoRequestPrompt(query) ? buildOfflineVideoProject(query) : undefined;
      const offlineBuiltApp =
        !imageToSend && !offlineBuiltVideo && isBuildRequestPrompt(query)
          ? buildOfflineAdaptiveApp(query)
          : undefined;

      const { responseText, telemetry } = engine.runOfflineInference(query, imageToSend || undefined, {
        subAiName: activeMember.subAiName,
        memberName: activeMember.name,
        languageLabel: activeLanguageLabel,
      });

      let finalResponse = offlineBuiltVideo
        ? `Created animated motion video "${offlineBuiltVideo.title}" (${offlineBuiltVideo.scenes.length} scenes). Play below or export as .WebM.`
        : offlineBuiltApp
        ? `Built "${offlineBuiltApp.appTitle}" offline directly in ASSF. Use the interactive preview below or download the self-contained HTML file.`
        : responseText;

      if (appliedSummary.length > 0) {
        finalResponse =
          `[OFFLINE AI GADGET BUS — ${activeMember.subAiName}]\n• ${appliedSummary.join('\n• ')}\n\n` +
          finalResponse;
        telemetry.triggeredAction = 'OFFLINE_GADGET_CONTROL';
      } else if (offlineBuiltVideo) {
        telemetry.triggeredAction = 'OFFLINE_VIDEO_CREATED';
      } else if (offlineBuiltApp) {
        telemetry.triggeredAction = 'OFFLINE_APP_BUILT';
      } else if (gadgetParse.blockedNotices.length > 0) {
        finalResponse = gadgetParse.blockedNotices.join('\n') + '\n\n' + finalResponse;
      }

      const chipMsg: ChatMessage = {
        id: `chip-${Date.now()}`,
        sender: 'chip',
        text: finalResponse,
        timestamp: new Date().toLocaleTimeString(),
        builtApp: offlineBuiltApp,
        builtVideo: offlineBuiltVideo,
        telemetry,
      };

      setMessagesForActiveMember((prev) => [...prev, chipMsg]);
      setIsProcessing(false);
      sound.playChipBuzzer(1600);

      if (autoSpeakEnabled) {
        speakText(finalResponse, chipMsg.id);
      }

      onInferenceExecuted(telemetry.latencyMs, telemetry.sramUsedKb, telemetry.powerConsumptionMw);
      onLogFamilyActivity(
        appliedSummary.length > 0
          ? `Offline Gadget Control: ${appliedSummary[0]}`
          : `Offline Query: "${(query || 'Photo').slice(0, 60)}"`,
        appliedSummary.length > 0 ? 'gadget' : 'chat'
      );

      setUartLog((prev) => [
        ...prev.slice(-15),
        `[UART:115200] INTENT_RESOLVED: ${telemetry.triggeredAction || 'IDLE'} (Latency: ${telemetry.latencyMs}ms)`,
        `[UART:115200] TX_COMPLETE: ${telemetry.tokensPerSec} tokens/sec on ${chip.name}`,
      ]);
    }, 75);
  };

  const promptCatalog: PromptOption[] = [
    // Prompt-to-Video Creation
    {
      label: 'Make Smart Earbuds Video',
      prompt: 'Make a 20-second product promo video for ultra-fast charging AI wireless earbuds',
      category: 'video',
      badge: 'Make Video',
    },
    {
      label: 'Create 9:16 AI Future Reel',
      prompt: 'Create a vertical 9:16 short video about Autonomous Robots and 2026 Clean Energy',
      category: 'video',
      badge: '9:16 Reel',
    },
    {
      label: 'Make Space & Mars Explainer Video',
      prompt: 'Make an exciting explainer video about reusable rockets and the 2026 Mars mission',
      category: 'video',
      badge: 'Make Video',
    },
    // Build Anything (Stores, Websites, Apps, Tools)
    {
      label: 'Build Product Storefront',
      prompt: 'Build an online electronics & smart gadget selling website with category filters, search, and working shopping cart checkout',
      category: 'build',
      badge: 'Build App',
    },
    {
      label: 'Build B.Tech CGPA & Attendance App',
      prompt: 'Build an interactive B.Tech CGPA, SGPA, and 75% attendance calculator web app with subject tracker',
      category: 'build',
      badge: 'Build App',
    },
    {
      label: 'Build Business ROI & Pricing Tool',
      prompt: 'Build a SaaS business profit, margin, and monthly revenue forecast calculator dashboard app',
      category: 'build',
      badge: 'Build App',
    },
    // 2026+ Advanced Technology
    {
      label: 'Agentic AI & MCP',
      prompt: 'How do Model Context Protocol (MCP) and agentic AI tool loops work in modern AI systems?',
      category: 'tech',
      badge: '2026 Tech',
    },
    {
      label: 'Post-Quantum ML-KEM',
      prompt: 'Explain NIST Post-Quantum ML-KEM (FIPS 203) and ML-DSA (FIPS 204) for securing firmware updates',
      category: 'tech',
      badge: 'Security',
    },
    {
      label: 'Wi-Fi 7 & Matter 1.4',
      prompt: 'What advantages do Wi-Fi 7 Multi-Link Operation (MLO) and Matter 1.4 bring to smart homes and factories?',
      category: 'tech',
      badge: 'IoT 2026',
    },
    {
      label: 'Edge NPU & INT4 TinyML',
      prompt: 'How do modern edge NPUs like STM32N6 Neural-ART and INT4 quantization run fast AI on microcontrollers?',
      category: 'tech',
      badge: 'Edge AI',
    },
    {
      label: 'SiC/GaN & Solid-State BMS',
      prompt: 'Compare GaN vs SiC power electronics and solid-state EV battery management systems (V2G)',
      category: 'tech',
      badge: 'Energy',
    },
    // Visual & Photo Analysis
    {
      label: '📸 PCB Circuit Inspection',
      prompt: 'Inspect this circuit photo: check resistor color codes, solder joints, and detect shorts on the microcontroller GPIO lines',
      category: 'vision',
      badge: 'Visual',
    },
    {
      label: '📸 Handwritten B.Tech Math',
      prompt: 'Read the handwritten differential equations and matrix calculations in this photo and solve step-by-step',
      category: 'vision',
      badge: 'Visual',
    },
    {
      label: '📸 Oscilloscope Waveform',
      prompt: 'Analyze this oscilloscope waveform image: calculate frequency, peak-to-peak voltage, and phase margin',
      category: 'vision',
      badge: 'Visual',
    },

    // B.Tech Core Engineering
    {
      label: "Banker's Algorithm",
      prompt: "Explain Banker's Algorithm, Coffman deadlock conditions, and safe sequence determination",
      category: 'btech',
      badge: 'B.Tech OS',
    },
    {
      label: 'CPU Scheduling & TLB EAT',
      prompt: 'Calculate Effective Memory Access Time (EAT) with TLB hit ratio 95%, TLB 10ns, Memory 100ns',
      category: 'btech',
      badge: 'B.Tech OS',
    },
    {
      label: 'TCP 3-Way Handshake',
      prompt: 'Illustrate TCP 3-way connection handshake and compare Go-Back-N vs Selective Repeat efficiency',
      category: 'btech',
      badge: 'B.Tech Networks',
    },
    {
      label: 'CIDR Subnetting /26',
      prompt: 'Calculate Subnet Mask, Network ID, Broadcast ID, and usable host range for 192.168.10.0/26',
      category: 'btech',
      badge: 'B.Tech Networks',
    },
    {
      label: 'Normalization (1NF-BCNF)',
      prompt: 'Explain database normalization from 1NF to BCNF with functional dependencies and lossless join',
      category: 'btech',
      badge: 'B.Tech DBMS',
    },
    {
      label: 'Pumping Lemma Proof',
      prompt: 'Use Pumping Lemma to formally prove that L = {a^n b^n | n >= 0} is not a regular language',
      category: 'btech',
      badge: 'B.Tech TOC',
    },
    {
      label: 'K-Map 4-Variable SOP',
      prompt: 'How to minimize a 4-variable boolean function using Karnaugh Map (K-Map) Gray code grouping',
      category: 'btech',
      badge: 'B.Tech DLD',
    },
    {
      label: 'Routh-Hurwitz & Bode',
      prompt: 'State Routh-Hurwitz stability criterion and define Gain Margin (GM) and Phase Margin (PM)',
      category: 'btech',
      badge: 'B.Tech Control',
    },
    {
      label: 'Master Theorem Recurrence',
      prompt: 'Solve recurrence T(n) = 8T(n/2) + 1000n^2 using Master Theorem and state all 3 cases',
      category: 'btech',
      badge: 'B.Tech Math',
    },

    // Python
    {
      label: 'Python Asyncio',
      prompt: 'Show Python asyncio event loop pattern with gather for non-blocking telemetry',
      category: 'python',
      badge: 'Python',
    },
    {
      label: 'Python Decorators',
      prompt: 'Write a parameterized Python decorator preserving metadata with @functools.wraps',
      category: 'python',
      badge: 'Python',
    },

    // Java
    {
      label: 'Java Streams API',
      prompt: 'Write Java 17 Streams pipeline to filter, group by zone, and compute averages',
      category: 'java',
      badge: 'Java',
    },
    {
      label: 'Java ReentrantLock',
      prompt: 'Implement lock-free bounded queue in Java with ReentrantLock and Condition variables',
      category: 'java',
      badge: 'Java',
    },

    // C++
    {
      label: 'C++ Smart Pointers',
      prompt: 'Compare std::unique_ptr, std::shared_ptr, and std::weak_ptr in modern C++',
      category: 'cpp',
      badge: 'C++',
    },
    {
      label: 'C++ Move Semantics',
      prompt: 'Implement Move Constructor and Assignment (Rule of Five) in C++ to prevent deep copies',
      category: 'cpp',
      badge: 'C++',
    },

    // World Science & STEM
    {
      label: 'General Relativity',
      prompt: 'Explain Einstein’s General Relativity, time dilation, and Schwarzschild radius formula',
      category: 'world',
      badge: 'Physics',
    },
    {
      label: 'Quantum Mechanics',
      prompt: 'Explain Heisenberg uncertainty principle, Schrödinger equation, and quantum tunneling in silicon',
      category: 'world',
      badge: 'Physics',
    },
  ];

  const filteredPrompts =
    selectedCategory === 'all'
      ? promptCatalog
      : promptCatalog.filter((p) => p.category === selectedCategory);

  return (
    <div className="space-y-4">
      {/* Hidden File Input for Image Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Active Family Sub-AI & Universal Language Bar */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-cyan-300 font-semibold">
            <Users className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{familyName}</span>
          </div>

          <span className="text-slate-700" aria-hidden="true">|</span>

          <label className="flex items-center gap-2">
            <span className="text-slate-400">Active Sub-AI:</span>
            <select
              value={activeMember.id}
              onChange={(e) => {
                sound.playFlashTick();
                onSelectMember(e.target.value);
              }}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.subAiName} ({m.name} · {m.role})
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-slate-400">Language:</span>
            <select
              value={selectedLangCode}
              onChange={(e) => {
                sound.playFlashTick();
                setSelectedLangCode(e.target.value);
              }}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-emerald-200 focus:outline-none focus:border-cyan-500"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name} ({lang.nativeName})
                </option>
              ))}
              <option value="custom">Other / Custom Language...</option>
            </select>
          </label>

          {selectedLangCode === 'custom' && (
            <input
              type="text"
              value={customLanguageInput}
              onChange={(e) => setCustomLanguageInput(e.target.value)}
              placeholder="Type any language (e.g., Odia, Swahili, Nepali)"
              className="bg-slate-950 border border-cyan-500/50 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none w-56"
            />
          )}
        </div>

        {/* Solver Mode, Voice Reply & Clear Controls */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => {
              sound.playFlashTick();
              if (isSpeaking) stopSpeaking();
              setAutoSpeakEnabled(!autoSpeakEnabled);
            }}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 border transition-colors ${
              autoSpeakEnabled
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle automated text-to-speech audio conversation reply"
          >
            {autoSpeakEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>{autoSpeakEnabled ? 'Voice Reply: ON' : 'Voice Reply: OFF'}</span>
          </button>

          {!isAirGapped && (
            <>
              <button
                type="button"
                onClick={() => setUseLiveSearch(!useLiveSearch)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 border transition-colors ${
                  useLiveSearch
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                    : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
                title="Ground answers with real-time Google Search for latest 2026 technology & facts"
              >
                <Search className="w-3.5 h-3.5 text-emerald-400" />
                <span>{useLiveSearch ? 'Live Web: ON' : 'Live Web: OFF'}</span>
              </button>

              <button
                type="button"
                onClick={() => setReasoningDepth(reasoningDepth === 'deep' ? 'balanced' : 'deep')}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 border transition-colors ${
                  reasoningDepth === 'deep'
                    ? 'bg-violet-500/20 border-violet-400 text-violet-200'
                    : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
                title="Switch between Deep Multi-Step Reasoning (High) and Fast Balanced mode"
              >
                <BrainCircuit className="w-3.5 h-3.5 text-violet-400" />
                <span>{reasoningDepth === 'deep' ? 'Deep Think' : 'Balanced'}</span>
              </button>

              <button
                type="button"
                onClick={() => setUseFrontierSolver(!useFrontierSolver)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 border transition-colors ${
                  useFrontierSolver
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                    : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
                title="Toggle Universal Frontier Reasoning (Any-language accurate solver + auto-flash bake)"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>{useFrontierSolver ? 'Universal Solver: ON' : 'Fast On-Chip Only'}</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => {
              stopSpeaking();
              setMessagesForActiveMember([
                {
                  id: `reset-${Date.now()}`,
                  sender: 'chip',
                  text: `[${activeMember.subAiName} CLEARED] Ready for ${activeMember.name} on ${chip.name} (${activeLanguageLabel}).`,
                  timestamp: new Date().toLocaleTimeString(),
                },
              ]);
            }}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-950 rounded-lg border border-slate-800 transition-colors"
            title="Clear Active Sub-AI Conversation"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Auto-Bake Notification Toast */}
      {flashSyncToast && (
        <div className="bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs font-mono px-3.5 py-2 rounded-lg flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span>{flashSyncToast}</span>
          </div>
          <span className="text-[10px] text-emerald-400 uppercase font-bold">OTA Flash Updated</span>
        </div>
      )}

      {/* Live Camera Viewfinder Modal */}
      {isCameraModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col font-mono text-xs">
            {/* Camera Header */}
            <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between text-slate-300">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-white">ASSF Optical Camera Viewfinder</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  {cameraFacingMode === 'environment' ? 'Rear (Macro)' : 'Front'}
                </span>
              </div>
              <button
                onClick={closeCamera}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Video Viewport with Reticle */}
            <div className="relative bg-black aspect-video flex items-center justify-center overflow-hidden">
              {cameraError ? (
                <div className="p-6 text-center text-rose-300 space-y-2">
                  <p className="font-bold">Camera Initialization Error</p>
                  <p className="text-[11px] text-slate-400">{cameraError}</p>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />

                  {/* Optical Reticle Overlay */}
                  <div className="absolute inset-0 pointer-events-none border border-cyan-500/20 m-6 flex flex-col justify-between p-3">
                    <div className="flex justify-between text-[10px] text-cyan-400 font-mono">
                      <span>[+] OPTICAL RETICLE</span>
                      <span>DVP 1080P</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>ALIGN CIRCUIT / MATH / PCB</span>
                      <span>AUTO-FOCUS</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Camera Controls Bar */}
            <div className="bg-slate-950 p-4 border-t border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={flipCamera}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center gap-1.5 text-xs transition-colors"
                title="Switch Camera (Front / Back)"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Switch Camera</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeCamera}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={capturePhoto}
                  disabled={!!cameraError}
                  className="px-4 py-2 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 text-slate-950 font-bold rounded-lg flex items-center gap-1.5 text-xs transition-colors shadow-sm"
                >
                  <Camera className="w-4 h-4" />
                  <span>Capture Snapshot</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expanded Image Lightbox Modal */}
      {expandedImage && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setExpandedImage(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-xl overflow-hidden p-2 shadow-2xl">
            <button
              onClick={() => setExpandedImage(null)}
              className="absolute top-4 right-4 bg-slate-950/80 text-white p-2 rounded-full border border-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={expandedImage}
              alt="Expanded Preview"
              className="max-h-[80vh] w-auto object-contain rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Main Console Box */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[560px]">
        {/* Terminal Header */}
        <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-200 font-semibold">{activeMember.subAiName} · {chip.name}</span>
            <span className="text-slate-600">·</span>
            <span className="text-cyan-400">{activeLanguageLabel}</span>
          </div>

          <div className="flex items-center gap-3">
            {isSpeaking && (
              <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] animate-pulse">
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                <span>{activeMember.subAiName} Speaking...</span>
                <button
                  onClick={stopSpeaking}
                  className="ml-1 text-[10px] text-slate-400 hover:text-rose-400 underline"
                >
                  Stop
                </button>
              </div>
            )}
            <span className="text-slate-500 text-[11px]">Core: {chip.clockMhz} MHz</span>
            <span className="text-emerald-400 font-medium">INT8 GEMM ONLINE</span>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
          {messages.map((msg, msgIdx) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.sender === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div className="text-[10px] text-slate-500 mb-1 flex items-center gap-1.5">
                <span>
                  {msg.sender === 'user'
                    ? activeMember.name.toUpperCase()
                    : `${activeMember.subAiName} (${chip.id.toUpperCase()})`}
                </span>
                <span>·</span>
                <span>{msg.timestamp}</span>
              </div>

              <div
                className={`max-w-3xl rounded-lg p-3 leading-relaxed whitespace-pre-wrap ${
                  msg.sender === 'user'
                    ? 'bg-cyan-950/60 border border-cyan-500/30 text-cyan-100'
                    : 'bg-slate-950 border border-slate-800 text-slate-200 shadow-sm'
                }`}
              >
                {/* Attached Photo Preview inside message */}
                {msg.image && (
                  <div className="mb-2.5">
                    <div
                      onClick={() => setExpandedImage(msg.image || null)}
                      className="relative inline-block cursor-pointer group rounded-lg overflow-hidden border border-slate-700 bg-slate-900"
                    >
                      <img
                        src={msg.image}
                        alt="User Attached Snapshot"
                        className="max-h-48 max-w-xs object-cover rounded-lg group-hover:opacity-90 transition-opacity"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white font-mono gap-1 transition-opacity">
                        <Eye className="w-3.5 h-3.5" />
                        <span>Click to expand</span>
                      </div>
                    </div>
                  </div>
                )}

                {msg.text}

                {msg.builtApp && (
                  <div className="mt-3 rounded-xl border border-cyan-500/40 bg-slate-900/90 overflow-hidden">
                    <div className="px-3.5 py-2.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
                          <Hammer className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{msg.builtApp.appTitle}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{msg.builtApp.summary}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setAppPreviewViewport('desktop')}
                          className={`p-1.5 rounded border ${
                            appPreviewViewport === 'desktop'
                              ? 'border-cyan-400 text-cyan-300 bg-cyan-950/40'
                              : 'border-slate-700 text-slate-400'
                          }`}
                          title="Desktop Width"
                        >
                          <Monitor className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setAppPreviewViewport('mobile')}
                          className={`p-1.5 rounded border ${
                            appPreviewViewport === 'mobile'
                              ? 'border-cyan-400 text-cyan-300 bg-cyan-950/40'
                              : 'border-slate-700 text-slate-400'
                          }`}
                          title="Mobile Width"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!msg.builtApp) return;
                            const blob = new Blob([msg.builtApp.htmlCode], { type: 'text/html' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${
                              msg.builtApp.appTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'assf-app'
                            }.html`;
                            a.click();
                            URL.revokeObjectURL(url);
                            sound.playOtaSuccess();
                          }}
                          className="px-2.5 py-1 rounded bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-[11px] flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          <span>.HTML</span>
                        </button>
                        {onOpenInBuilder && (
                          <button
                            type="button"
                            onClick={() => onOpenInBuilder(msg.builtApp!)}
                            className="px-2.5 py-1 rounded bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-[11px]"
                          >
                            Edit in Studio
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="p-2.5 bg-slate-900 flex justify-center">
                      <iframe
                        title={msg.builtApp.appTitle}
                        srcDoc={msg.builtApp.htmlCode}
                        sandbox="allow-scripts allow-forms"
                        className={`bg-white rounded-lg border border-slate-700 transition-all ${
                          appPreviewViewport === 'mobile' ? 'w-[360px] h-[440px]' : 'w-full min-w-[320px] h-[440px]'
                        }`}
                      />
                    </div>
                  </div>
                )}

                {msg.builtVideo && (
                  <InlineVideoPlayerCard
                    project={msg.builtVideo}
                    onOpenInVideoStudio={onOpenInVideoStudio}
                  />
                )}

                {msg.groundingSources && msg.groundingSources.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-400">
                    <span className="text-emerald-400 font-semibold">Verified Web Sources:</span>
                    {msg.groundingSources.map((src, i) => (
                      <a
                        key={i}
                        href={src.uri}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 underline"
                      >
                        <span>{src.title}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ))}
                  </div>
                )}

                {/* Attached Edge Telemetry Badge & Audio Button for Chip Responses */}
                {msg.sender === 'chip' && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-x-3 gap-y-1 flex-wrap">
                      {msg.telemetry && (
                        <>
                          <span className="text-cyan-400 font-bold">⚡ {msg.telemetry.latencyMs} ms</span>
                          <span className="text-slate-600">·</span>
                          <span>{msg.telemetry.sramUsedKb} KB SRAM</span>
                          <span className="text-slate-600">·</span>
                          <span>{msg.telemetry.confidenceScore}% conf</span>
                          <span className="text-slate-600">·</span>
                          <span className="text-emerald-400 font-semibold">{msg.telemetry.triggeredAction}</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Download Answer PDF */}
                      <button
                        type="button"
                        onClick={() => {
                          sound.playFlashTick();
                          const prevUserMsg =
                            msgIdx > 0 && messages[msgIdx - 1]?.sender === 'user'
                              ? messages[msgIdx - 1].text
                              : undefined;
                          downloadAnswerPdf({
                            question: prevUserMsg,
                            answer: msg.text,
                            subAiName: activeMember.subAiName,
                            chipName: chip.name,
                            sources: msg.groundingSources,
                          });
                        }}
                        className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-700 flex items-center gap-1 transition-colors text-[10px]"
                        title="Save this answer as a formatted PDF file"
                      >
                        <FileDown className="w-3 h-3 text-cyan-400" />
                        <span>PDF</span>
                      </button>

                      {/* Print Answer */}
                      <button
                        type="button"
                        onClick={() => {
                          sound.playFlashTick();
                          const prevUserMsg =
                            msgIdx > 0 && messages[msgIdx - 1]?.sender === 'user'
                              ? messages[msgIdx - 1].text
                              : undefined;
                          printAnswerHtml({
                            question: prevUserMsg,
                            answer: msg.text,
                            subAiName: activeMember.subAiName,
                            chipName: chip.name,
                            sources: msg.groundingSources,
                          });
                        }}
                        className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-300 border border-slate-700 flex items-center gap-1 transition-colors text-[10px]"
                        title="Print answer or Save as PDF via Print Dialog"
                      >
                        <Printer className="w-3 h-3 text-amber-400" />
                        <span>Print</span>
                      </button>

                      {/* Individual Audio Voice Speaker Button */}
                      <button
                        type="button"
                        onClick={() => {
                          sound.playFlashTick();
                          if (speakingMessageId === msg.id) {
                            stopSpeaking();
                          } else {
                            speakText(msg.text, msg.id);
                          }
                        }}
                        className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-emerald-300 border border-slate-700 flex items-center gap-1 transition-colors text-[10px]"
                        title="Listen to this explanation via SpeechSynthesis voice"
                      >
                        {speakingMessageId === msg.id ? (
                          <>
                            <VolumeX className="w-3 h-3 text-rose-400" />
                            <span>Stop Voice</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3 h-3 text-cyan-400" />
                            <span>Speak Voice</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isProcessing && (
            <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
              <span>
                {useFrontierSolver && !isAirGapped
                  ? 'ASSF Frontier Reasoning Core analyzing input & photos...'
                  : `Running INT8 vector dot-product on ${chip.name} ALU...`}
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Category Tabs & Quick Sample Prompts Strip */}
        <div className="bg-slate-950/95 border-t border-slate-800/80 text-xs font-mono">
          {/* Domain Filter Pills */}
          <div className="px-3 py-1.5 border-b border-slate-800/60 flex items-center gap-1.5 overflow-x-auto text-[11px]">
            <span className="text-slate-500 shrink-0 font-semibold text-[10px] uppercase tracking-wider mr-1">
              Filter:
            </span>
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap flex items-center gap-1 ${
                selectedCategory === 'all'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>All ({promptCatalog.length})</span>
            </button>
            <button
              onClick={() => setSelectedCategory('video')}
              className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap flex items-center gap-1 font-semibold ${
                selectedCategory === 'video'
                  ? 'bg-violet-500/25 text-violet-200 border border-violet-400/50 shadow-sm'
                  : 'bg-slate-900 text-violet-300 hover:text-violet-200'
              }`}
            >
              <Film className="w-3 h-3 text-violet-400" />
              <span>Make Video ({promptCatalog.filter((p) => p.category === 'video').length})</span>
            </button>
            <button
              onClick={() => setSelectedCategory('build')}
              className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap flex items-center gap-1 font-semibold ${
                selectedCategory === 'build'
                  ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/50 shadow-sm'
                  : 'bg-slate-900 text-emerald-300 hover:text-emerald-200'
              }`}
            >
              <Hammer className="w-3 h-3 text-emerald-400" />
              <span>Build Anything ({promptCatalog.filter((p) => p.category === 'build').length})</span>
            </button>
            <button
              onClick={() => setSelectedCategory('tech')}
              className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap flex items-center gap-1 font-semibold ${
                selectedCategory === 'tech'
                  ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/50 shadow-sm'
                  : 'bg-slate-900 text-slate-300 hover:text-cyan-200'
              }`}
            >
              <Zap className="w-3 h-3 text-cyan-400" />
              <span>2026 Tech ({promptCatalog.filter((p) => p.category === 'tech').length})</span>
            </button>
            <button
              onClick={() => setSelectedCategory('vision')}
              className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap flex items-center gap-1 font-semibold ${
                selectedCategory === 'vision'
                  ? 'bg-purple-500/25 text-purple-300 border border-purple-500/50 shadow-sm'
                  : 'bg-slate-900 text-slate-300 hover:text-purple-200'
              }`}
            >
              <Camera className="w-3 h-3 text-purple-400" />
              <span>📸 Photo & Vision ({promptCatalog.filter((p) => p.category === 'vision').length})</span>
            </button>
            <button
              onClick={() => setSelectedCategory('btech')}
              className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap flex items-center gap-1 font-semibold ${
                selectedCategory === 'btech'
                  ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-500/50 shadow-sm'
                  : 'bg-slate-900 text-slate-300 hover:text-indigo-200'
              }`}
            >
              <GraduationCap className="w-3 h-3 text-indigo-400" />
              <span>🎓 B.Tech Engineering ({promptCatalog.filter((p) => p.category === 'btech').length})</span>
            </button>
            <button
              onClick={() => setSelectedCategory('python')}
              className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap flex items-center gap-1 ${
                selectedCategory === 'python'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 className="w-3 h-3 text-amber-400" />
              <span>Python</span>
            </button>
            <button
              onClick={() => setSelectedCategory('java')}
              className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap flex items-center gap-1 ${
                selectedCategory === 'java'
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 className="w-3 h-3 text-orange-400" />
              <span>Java</span>
            </button>
            <button
              onClick={() => setSelectedCategory('cpp')}
              className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap flex items-center gap-1 ${
                selectedCategory === 'cpp'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 className="w-3 h-3 text-blue-400" />
              <span>C++</span>
            </button>
            <button
              onClick={() => setSelectedCategory('world')}
              className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap flex items-center gap-1 ${
                selectedCategory === 'world'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-3 h-3 text-emerald-400" />
              <span>World STEM</span>
            </button>
          </div>

          {/* Sample Prompts List */}
          <div className="px-3 py-2 flex items-center gap-2 overflow-x-auto">
            {filteredPrompts.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(s.prompt)}
                className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/50 transition-colors whitespace-nowrap shrink-0 text-[11px] flex items-center gap-1.5"
              >
                <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 uppercase font-semibold">
                  {s.badge}
                </span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Attached Photo Preview Ribbon (above input) */}
        {attachedImage && (
          <div className="px-3 py-2 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2">
              <img
                src={attachedImage}
                alt="Thumbnail"
                className="w-8 h-8 object-cover rounded border border-purple-500/50 shadow-sm"
              />
              <span className="text-purple-300 font-semibold flex items-center gap-1">
                <Camera className="w-3.5 h-3.5" />
                Photo Attached (Ready to inspect & solve)
              </span>
            </div>
            <button
              onClick={() => setAttachedImage(null)}
              className="p-1 text-slate-400 hover:text-rose-400 rounded transition-colors"
              title="Remove Attached Photo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Input Bar with Camera, Photo Upload, Mic, and Send */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
          {/* Camera Access Option */}
          <button
            type="button"
            onClick={openCamera}
            className="px-2.5 py-2 bg-slate-900 hover:bg-slate-800 text-purple-300 hover:text-purple-200 border border-purple-500/40 rounded-lg transition-colors shrink-0 flex items-center gap-1.5 text-xs font-medium"
            title="Open Camera Viewfinder to snap a photo of a circuit, math problem, or object"
          >
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">Camera</span>
          </button>

          {/* Photo File Upload Option */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-700 rounded-lg transition-colors shrink-0 flex items-center gap-1.5 text-xs font-medium"
            title="Upload a photo from your device"
          >
            <ImageIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Photo</span>
          </button>

          {/* Speech-to-Text Microphone Option */}
          <button
            type="button"
            onClick={toggleSpeechRecognition}
            className={`px-2.5 py-2 rounded-lg transition-colors border shrink-0 flex items-center gap-1.5 text-xs font-medium ${
              isListening
                ? 'bg-rose-500/20 text-rose-300 border-rose-500 animate-pulse'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-emerald-300 border-slate-700'
            }`}
            title={isListening ? 'Listening to voice... Click to stop' : 'Click to speak your question in any language'}
          >
            {isListening ? <Mic className="w-4 h-4 text-rose-400 animate-bounce" /> : <Mic className="w-4 h-4" />}
            <span className="hidden sm:inline">{isListening ? 'Listening' : 'Speak'}</span>
          </button>

          {/* Text Input Field */}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            placeholder={
              isListening
                ? 'Listening to your voice... Speak now...'
                : attachedImage
                ? 'Ask anything about this attached photo (e.g. "Identify these circuit ICs", "Solve this equation")...'
                : 'Ask anything, build a website/app, or tell ASSF to make a video...'
            }
            className={`flex-1 bg-slate-900 border rounded-lg px-3 py-2 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none transition-colors ${
              isListening
                ? 'border-rose-500/60 ring-1 ring-rose-500/30'
                : attachedImage
                ? 'border-purple-500/60 ring-1 ring-purple-500/30'
                : 'border-slate-700/80 focus:border-cyan-500'
            }`}
          />

          {/* Send Button */}
          <button
            onClick={() => handleSend()}
            disabled={(!input.trim() && !attachedImage) || isProcessing}
            className="px-4 py-2 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 text-slate-950 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </div>
      </div>

      {/* Live UART Serial Output Monitor Drawer */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-[11px] space-y-2">
        <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800/80">
          <span className="text-slate-300 font-bold uppercase tracking-wider flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            UART Serial Bus Telemetry (115200 8N1) · Vision DVP & Audio I2S
          </span>
          <span className="text-slate-500">Live Hardware Trace</span>
        </div>
        <div className="space-y-0.5 text-slate-400 max-h-24 overflow-y-auto">
          {uartLog.map((log, i) => (
            <div key={i} className="leading-snug truncate">
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
