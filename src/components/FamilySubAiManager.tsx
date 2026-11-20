import React, { useState } from 'react';
import {
  FamilyActivityEvent,
  FamilyMemberProfile,
  SUPPORTED_LANGUAGES,
} from '../types/edge';
import { sound } from '../services/soundEffects';
import {
  Users,
  UserPlus,
  Bot,
  Globe,
  Volume2,
  Trash2,
  CheckCircle2,
  MessageSquare,
  Edit3,
  Radio,
  Shield,
} from 'lucide-react';

interface FamilySubAiManagerProps {
  familyName: string;
  onUpdateFamilyName: (name: string) => void;
  members: FamilyMemberProfile[];
  activeMemberId: string;
  onSelectMember: (memberId: string, openConsole?: boolean) => void;
  onAddMember: (member: FamilyMemberProfile) => void;
  onRemoveMember: (memberId: string) => void;
  activityFeed: FamilyActivityEvent[];
  onPostFamilyNotice: (notice: string) => void;
}

const ROLE_OPTIONS = [
  'Parent / Home Lead',
  'Child / Student',
  'Engineer / Architect',
  'Elder Family Member',
  'Plant Operator',
  'Guest',
];

const SPECIALTY_OPTIONS = [
  'All-Rounder · Daily Life, Science & Code',
  'B.Tech Curriculum, Python/C++/Java & Math',
  'Household Chores, Cooking & Smart Appliances',
  'Industrial Automation, PLC & Safety',
  'Health Reminders, Wellness & Multilingual Companion',
];

export const FamilySubAiManager: React.FC<FamilySubAiManagerProps> = ({
  familyName,
  onUpdateFamilyName,
  members,
  activeMemberId,
  onSelectMember,
  onAddMember,
  onRemoveMember,
  activityFeed,
  onPostFamilyNotice,
}) => {
  const [isEditingFamilyName, setIsEditingFamilyName] = useState(false);
  const [draftFamilyName, setDraftFamilyName] = useState(familyName);

  // New Member & Sub-AI Form State
  const [memberName, setMemberName] = useState('');
  const [role, setRole] = useState(ROLE_OPTIONS[0]);
  const [subAiName, setSubAiName] = useState('');
  const [languageCode, setLanguageCode] = useState('auto');
  const [customLanguage, setCustomLanguage] = useState('');
  const [specialty, setSpecialty] = useState(SPECIALTY_OPTIONS[0]);
  const [gadgetScope, setGadgetScope] = useState<'all' | 'household' | 'industrial'>('all');
  const [voicePitch, setVoicePitch] = useState(1.0);
  const [voiceRate, setVoiceRate] = useState(1.0);
  const [familyNotice, setFamilyNotice] = useState('');
  const [formFeedback, setFormFeedback] = useState<string | null>(null);

  const handleSaveFamilyName = () => {
    const clean = draftFamilyName.trim();
    if (clean) {
      onUpdateFamilyName(clean);
      sound.playFlashTick();
    }
    setIsEditingFamilyName(false);
  };

  const handleMemberNameChange = (val: string) => {
    setMemberName(val);
    if (!subAiName || subAiName.endsWith('-AI')) {
      const cleanPrefix = val.trim().split(/\s+/)[0];
      setSubAiName(cleanPrefix ? `${cleanPrefix}-AI` : '');
    }
  };

  const handleCreateMember = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = memberName.trim();
    if (!cleanName) return;

    const cleanSubAi = subAiName.trim() || `${cleanName.split(/\s+/)[0]}-AI`;
    const newMember: FamilyMemberProfile = {
      id: `member-${Date.now()}`,
      name: cleanName,
      role,
      subAiName: cleanSubAi,
      languageCode: customLanguage.trim() ? 'custom' : languageCode,
      customLanguage: customLanguage.trim() || undefined,
      specialty,
      voicePitch,
      voiceRate,
      gadgetScope,
      createdAt: new Date().toISOString().split('T')[0],
    };

    onAddMember(newMember);
    sound.playChipBuzzer(1500);
    setFormFeedback(`Created personal Sub-AI "${cleanSubAi}" for ${cleanName} inside ${familyName}.`);
    setTimeout(() => setFormFeedback(null), 4000);

    setMemberName('');
    setSubAiName('');
    setCustomLanguage('');
  };

  const testSubAiVoice = (member: FamilyMemberProfile) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const langObj = SUPPORTED_LANGUAGES.find((l) => l.code === member.languageCode);
    const langLabel = member.customLanguage || langObj?.name || 'English';
    const text = `Hello ${member.name}. I am ${member.subAiName}, your personal assistant in ${familyName}, ready in ${langLabel}.`;
    const utter = new SpeechSynthesisUtterance(text);
    if (member.languageCode !== 'auto' && member.languageCode !== 'custom') {
      utter.lang = member.languageCode;
    }
    utter.pitch = member.voicePitch;
    utter.rate = member.voiceRate;
    window.speechSynthesis.speak(utter);
  };

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyNotice.trim()) return;
    onPostFamilyNotice(familyNotice.trim());
    setFamilyNotice('');
    sound.playFlashTick();
  };

  return (
    <div className="space-y-6">
      {/* Live Family Network Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-mono text-cyan-400 flex items-center gap-2">
            <Radio className="w-3.5 h-3.5" />
            <span>Live Family AI Network</span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span className="text-slate-400 tabular-nums">{members.length} Active Sub-AIs</span>
          </div>

          {isEditingFamilyName ? (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={draftFamilyName}
                onChange={(e) => setDraftFamilyName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveFamilyName()}
                className="bg-slate-950 border border-cyan-500/60 rounded-lg px-3 py-1.5 text-base font-semibold text-white focus:outline-none"
                placeholder="Enter Family AI Name..."
                autoFocus
              />
              <button
                type="button"
                onClick={handleSaveFamilyName}
                className="px-3 py-1.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-semibold rounded-lg"
              >
                Save Name
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-white tracking-tight">{familyName}</h1>
              <button
                type="button"
                onClick={() => {
                  setDraftFamilyName(familyName);
                  setIsEditingFamilyName(true);
                }}
                className="p-1.5 text-slate-400 hover:text-cyan-300 rounded-lg hover:bg-slate-800/70 transition-colors"
                title="Rename Live Family AI Network"
                aria-label="Rename Live Family AI Network"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
          )}

          <p className="text-xs text-slate-400">
            Create a dedicated Sub-AI for each family member or team operator with their preferred spoken language, voice profile, and gadget access permissions.
          </p>
        </div>

        {/* Family Broadcast Quick Input */}
        <form onSubmit={handleBroadcast} className="flex items-center gap-2 w-full md:w-auto md:min-w-[340px]">
          <input
            type="text"
            value={familyNotice}
            onChange={(e) => setFamilyNotice(e.target.value)}
            placeholder="Broadcast live message to family feed..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            disabled={!familyNotice.trim()}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-100 text-xs font-medium rounded-lg border border-slate-700 whitespace-nowrap"
          >
            Share Update
          </button>
        </form>
      </div>

      {formFeedback && (
        <div className="bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs font-mono px-4 py-2.5 rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{formFeedback}</span>
        </div>
      )}

      {/* Two-Column Split: Add Member Form + Active Sub-AI Profiles */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Add Family Member & Spawn Personal Sub-AI */}
        <form
          onSubmit={handleCreateMember}
          className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4"
        >
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <UserPlus className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-white">Add Family Member & Personal Sub-AI</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Member Name</label>
              <input
                type="text"
                required
                value={memberName}
                onChange={(e) => handleMemberNameChange(e.target.value)}
                placeholder="e.g., Aarav, Mom, Priya"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Personal Sub-AI Name</label>
              <input
                type="text"
                value={subAiName}
                onChange={(e) => setSubAiName(e.target.value)}
                placeholder="e.g., Aarav-Nova"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-cyan-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Family Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Gadget Permission Scope</label>
              <select
                value={gadgetScope}
                onChange={(e) => setGadgetScope(e.target.value as 'all' | 'household' | 'industrial')}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="all">All Gadgets (Home + Industrial)</option>
                <option value="household">Household Work Gadgets Only</option>
                <option value="industrial">Industrial Gadgets Only</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Primary Language</label>
              <select
                value={languageCode}
                onChange={(e) => setLanguageCode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name} ({lang.nativeName})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Or Any Custom Language</label>
              <input
                type="text"
                value={customLanguage}
                onChange={(e) => setCustomLanguage(e.target.value)}
                placeholder="e.g., Odia, Assamese, Swahili..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">Sub-AI Specialty & Knowledge Focus</label>
            <select
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              {SPECIALTY_OPTIONS.map((sp) => (
                <option key={sp} value={sp}>
                  {sp}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                <span>Voice Pitch</span>
                <span className="tabular-nums text-cyan-300">{voicePitch.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.7"
                max="1.4"
                step="0.05"
                value={voicePitch}
                onChange={(e) => setVoicePitch(parseFloat(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                <span>Voice Speed</span>
                <span className="tabular-nums text-cyan-300">{voiceRate.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.35"
                step="0.05"
                value={voiceRate}
                onChange={(e) => setVoiceRate(parseFloat(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Bot className="w-4 h-4" />
            <span>Add Member & Spawn Sub-AI</span>
          </button>
        </form>

        {/* Right: Active Family Sub-AIs & Live Family Feed */}
        <div className="lg:col-span-7 space-y-6">
          {/* Member Sub-AI Directory */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-semibold text-white">Family Members & Personal Sub-AIs</h2>
              </div>
              <span className="text-xs font-mono text-slate-400 tabular-nums">{members.length} profiles</span>
            </div>

            <div className="divide-y divide-slate-800/80">
              {members.map((member) => {
                const isActive = member.id === activeMemberId;
                const langInfo = SUPPORTED_LANGUAGES.find((l) => l.code === member.languageCode);
                const langLabel = member.customLanguage || langInfo?.name || member.languageCode;

                return (
                  <div
                    key={member.id}
                    className={`py-3.5 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                      isActive ? 'bg-cyan-950/20 -mx-3 px-3 rounded-lg' : ''
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-white">{member.name}</span>
                        <span className="text-slate-600" aria-hidden="true">·</span>
                        <span className="text-xs font-mono text-cyan-300 font-semibold">{member.subAiName}</span>
                        <span className="text-slate-600" aria-hidden="true">·</span>
                        <span className="text-xs text-slate-400">{member.role}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono">
                        <span className="flex items-center gap-1 text-emerald-300">
                          <Globe className="w-3 h-3" />
                          {langLabel}
                        </span>
                        <span className="text-slate-600" aria-hidden="true">·</span>
                        <span className="flex items-center gap-1">
                          <Shield className="w-3 h-3 text-slate-400" />
                          Gadgets: {member.gadgetScope}
                        </span>
                      </div>

                      <div className="text-xs text-slate-400 truncate">{member.specialty}</div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => testSubAiVoice(member)}
                        className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 hover:text-cyan-300 transition-colors"
                        title={`Preview ${member.subAiName} voice`}
                        aria-label={`Preview ${member.subAiName} voice`}
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onSelectMember(member.id, true)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                          isActive
                            ? 'bg-cyan-400 text-slate-950'
                            : 'bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-700'
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{isActive ? 'Active · Open Chat' : 'Talk to Sub-AI'}</span>
                      </button>

                      {members.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onRemoveMember(member.id)}
                          className="p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-950 rounded-lg transition-colors"
                          title={`Remove ${member.name}`}
                          aria-label={`Remove ${member.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Family Activity Stream */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h2 className="text-sm font-semibold text-white">Live Family & Sub-AI Activity Feed</h2>
              <span className="text-xs font-mono text-slate-500 tabular-nums">{activityFeed.length} events</span>
            </div>

            {activityFeed.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                No activity recorded yet. Start a conversation or operate a smart gadget to see live family updates.
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1 font-mono text-xs">
                {activityFeed.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-start justify-between gap-3 py-2 border-b border-slate-800/60 last:border-b-0"
                  >
                    <div className="space-y-0.5">
                      <div className="text-slate-300">
                        <span className="text-cyan-300 font-semibold">{ev.subAiName}</span>
                        <span className="text-slate-600 mx-1.5">·</span>
                        <span className="text-slate-400">{ev.memberName}</span>
                        <span className="text-slate-600 mx-1.5">·</span>
                        <span className="text-slate-500 uppercase text-[10px]">{ev.category}</span>
                      </div>
                      <div className="text-slate-200">{ev.summary}</div>
                    </div>
                    <span className="text-slate-500 text-[11px] tabular-nums shrink-0">{ev.timestamp}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
