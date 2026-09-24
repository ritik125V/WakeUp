'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Layout,
  Sparkles,
  Check,
  ExternalLink,
  Palette,
  Type,
  ToggleLeft,
  ToggleRight,
  Eye,
  SlidersHorizontal,
  Activity,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import {
  createStatusPage,
  updateStatusPage,
  EndpointData,
  StatusPageCustomization,
  StatusPageRecord,
} from '@/lib/api';

interface StatusBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  endpoints: EndpointData[];
  onSuccess: () => void;
  editingPage?: StatusPageRecord | null;
}

const THEME_PRESETS: Array<{
  id: StatusPageCustomization['themePreset'];
  name: string;
  bg: string;
  card: string;
  accent: string;
  text: string;
}> = [
  { id: 'cyberpunk', name: 'Cyberpunk Dark ⚡', bg: '#050505', card: '#0d0d0d', accent: '#f43f5e', text: '#ffffff' },
  { id: 'neon_emerald', name: 'Neon Emerald 🌿', bg: '#021a12', card: '#052e21', accent: '#10b981', text: '#ffffff' },
  { id: 'discord_gamer', name: 'Discord Gamer Indigo 🎮', bg: '#101226', card: '#1a1d36', accent: '#6366f1', text: '#ffffff' },
  { id: 'meme_doge_pink', name: 'Vaporwave Doge Pink 🐕', bg: '#1a0515', card: '#2e0a26', accent: '#f472b6', text: '#ffffff' },
  { id: 'brainrot_chad', name: 'Brainrot Sigma Chad 🗿', bg: '#08090a', card: '#131517', accent: '#38bdf8', text: '#ffffff' },
  { id: 'tiktok_glitch', name: 'TikTok Neon Glitch ⚡', bg: '#090314', card: '#160829', accent: '#25f4ee', text: '#ffffff' },
  { id: 'goth_dark', name: 'Midnight Goth Vampire 🦇', bg: '#0f0404', card: '#1c0909', accent: '#ef4444', text: '#ffffff' },
  { id: 'anime_pastel', name: 'Kawaii Anime Pastel 🌸', bg: '#160d1b', card: '#281730', accent: '#f472b6', text: '#ffffff' },
  { id: 'cyberpunk_gold', name: 'Crypto Cyber Gold 🪙', bg: '#141003', card: '#241c05', accent: '#eab308', text: '#ffffff' },
  { id: 'pixel_synth', name: '80s Synthwave Cyan 🌆', bg: '#04121a', card: '#092333', accent: '#06b6d4', text: '#ffffff' },
  { id: 'y2k_chrome', name: 'Y2K Chrome & Lime ✨', bg: '#08120b', card: '#0f2415', accent: '#84cc16', text: '#ffffff' },
  { id: 'lofi_chill', name: 'Lo-Fi Chill Lavender ☕', bg: '#0f0a1c', card: '#1d1533', accent: '#a855f7', text: '#ffffff' },
  { id: 'arcade_8bit', name: 'Retro Arcade Red 🕹️', bg: '#170505', card: '#2e0a0a', accent: '#ef4444', text: '#ffffff' },
  { id: 'vaporwave', name: 'Vaporwave Violet 🔮', bg: '#0f051d', card: '#1a0a33', accent: '#d946ef', text: '#ffffff' },
  { id: 'sunset', name: 'Solar Flare Amber 🌅', bg: '#180c02', card: '#2a1707', accent: '#f59e0b', text: '#ffffff' },
  { id: 'matrix_rain', name: 'Matrix Code Green 📟', bg: '#020b06', card: '#061a0f', accent: '#22c55e', text: '#ffffff' },
  { id: 'minimal_charcoal', name: 'Minimal Charcoal 🖤', bg: '#111111', card: '#1c1c1c', accent: '#e5e5e5', text: '#ffffff' },
];

export function StatusBuilderModal({
  isOpen,
  onClose,
  endpoints,
  onSuccess,
  editingPage,
}: StatusBuilderModalProps) {
  const [activeTab, setActiveTab] = useState<'services' | 'theme' | 'typography' | 'toggles'>('services');

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [selectedEndpointIds, setSelectedEndpointIds] = useState<string[]>([]);

  // Customization State
  const [themePreset, setThemePreset] = useState<StatusPageCustomization['themePreset']>('cyberpunk');
  const [backgroundColor, setBackgroundColor] = useState<string>('#050505');
  const [cardBackgroundColor, setCardBackgroundColor] = useState<string>('#0d0d0d');
  const [accentColor, setAccentColor] = useState<string>('#f43f5e');
  const [fontSize, setFontSize] = useState<'compact' | 'standard' | 'large' | 'genz_display'>('standard');
  const [customHeaderBadge, setCustomHeaderBadge] = useState<string>('⚡ PUBLIC STATUS MONITOR');
  const [customBannerMessage, setCustomBannerMessage] = useState<string>('ALL SYSTEMS OPERATIONAL & VIBING 💯');
  const [customFooterText, setCustomFooterText] = useState<string>('POWERED BY WAKEUP MONITORING');

  const [showBanner, setShowBanner] = useState(true);
  const [showIncidents, setShowIncidents] = useState(true);
  const [showHistoryBars, setShowHistoryBars] = useState(true);
  const [showMetrics, setShowMetrics] = useState(true);
  const [showFooter, setShowFooter] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);

  useEffect(() => {
    if (editingPage) {
      setTitle(editingPage.title);
      setSlug(editingPage.slug);
      setDescription(editingPage.description || '');
      setSelectedEndpointIds(editingPage.endpointIds ? editingPage.endpointIds.map((e: any) => e._id || e) : []);

      if (editingPage.customization) {
        const cust = editingPage.customization;
        setThemePreset(cust.themePreset || 'cyberpunk');
        setBackgroundColor(cust.backgroundColor || '#050505');
        setCardBackgroundColor(cust.cardBackgroundColor || '#0d0d0d');
        setAccentColor(cust.accentColor || '#f43f5e');
        setFontSize(cust.fontSize || 'standard');
        setCustomHeaderBadge(cust.customHeaderBadge || '⚡ PUBLIC STATUS MONITOR');
        setCustomBannerMessage(cust.customBannerMessage || 'ALL SYSTEMS OPERATIONAL');
        setCustomFooterText(cust.customFooterText || 'POWERED BY WAKEUP MONITORING');
        setShowBanner(cust.showBanner !== false);
        setShowIncidents(cust.showIncidents !== false);
        setShowHistoryBars(cust.showHistoryBars !== false);
        setShowMetrics(cust.showMetrics !== false);
        setShowFooter(cust.showFooter !== false);
      }
    } else {
      setTitle('');
      setSlug('');
      setDescription('');
      setSelectedEndpointIds([]);
      setThemePreset('cyberpunk');
      setBackgroundColor('#050505');
      setCardBackgroundColor('#0d0d0d');
      setAccentColor('#f43f5e');
      setFontSize('standard');
      setCustomHeaderBadge('⚡ PUBLIC STATUS MONITOR');
      setCustomBannerMessage('ALL SYSTEMS OPERATIONAL & VIBING 💯');
      setCustomFooterText('POWERED BY WAKEUP MONITORING');
      setShowBanner(true);
      setShowIncidents(true);
      setShowHistoryBars(true);
      setShowMetrics(true);
      setShowFooter(true);
    }
    setCreatedSlug(null);
  }, [editingPage, isOpen]);

  const applyPreset = (presetId: StatusPageCustomization['themePreset']) => {
    const found = THEME_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setThemePreset(found.id);
      setBackgroundColor(found.bg);
      setCardBackgroundColor(found.card);
      setAccentColor(found.accent);
    }
  };

  const toggleEndpoint = (id: string) => {
    setSelectedEndpointIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!slug && !editingPage) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !slug || selectedEndpointIds.length === 0) {
      setError('Please provide a title, URL slug, and select at least 1 service');
      return;
    }

    setLoading(true);
    setError(null);

    const customization: StatusPageCustomization = {
      themePreset,
      backgroundColor,
      cardBackgroundColor,
      textColor: '#ffffff',
      accentColor,
      fontSize,
      customHeaderBadge,
      customBannerMessage,
      showBanner,
      showIncidents,
      showHistoryBars,
      showMetrics,
      showFooter,
      customFooterText,
    };

    try {
      if (editingPage) {
        await updateStatusPage(editingPage._id, {
          title,
          slug,
          description,
          endpointIds: selectedEndpointIds,
          customization,
        });
        setCreatedSlug(slug);
      } else {
        await createStatusPage({
          title,
          slug,
          description,
          endpointIds: selectedEndpointIds,
          customization,
        });
        setCreatedSlug(slug);
      }

      onSuccess();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to save status page');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedEndpointsList = endpoints.filter((e) => selectedEndpointIds.includes(e._id));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md font-mono">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          className="w-full max-w-6xl max-h-[92vh] flex flex-col bg-neutral-950 border border-neutral-800 rounded-xl relative text-neutral-100 shadow-2xl overflow-hidden"
        >
          {/* Modal Top Header */}
          <div className="p-4 border-b border-neutral-900 flex items-center justify-between gap-4 bg-black">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-950/60 text-rose-300 rounded-lg">
                <SlidersHorizontal className="w-5 h-5 text-rose-300" />
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                  {editingPage ? 'EDIT STATUS PAGE STUDIO' : 'GENZ STATUS PAGE BUILDER'}
                </h2>
                <p className="text-[11px] text-neutral-400">
                  Custom colors, themes, display typography, and real-time layout options
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-md bg-neutral-900"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 2-Column Main Split View: Left Controls, Right ALWAYS VISIBLE Live Preview */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Left Controls Column */}
            <div className="w-full lg:w-1/2 flex flex-col border-r border-neutral-900 overflow-hidden">
              {/* Controls Tabs */}
              <div className="flex items-center gap-1 p-2 bg-neutral-900 border-b border-neutral-850 overflow-x-auto text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('services')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition-all border-none ${
                    activeTab === 'services' ? 'bg-rose-950 text-rose-300' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Layout className="w-3.5 h-3.5" /> Services & Details
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('theme')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition-all border-none ${
                    activeTab === 'theme' ? 'bg-rose-950 text-rose-300' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5" /> Theme & Colors
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('typography')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition-all border-none ${
                    activeTab === 'typography' ? 'bg-rose-950 text-rose-300' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Type className="w-3.5 h-3.5" /> Text & Badges
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('toggles')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition-all border-none ${
                    activeTab === 'toggles' ? 'bg-rose-950 text-rose-300' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" /> Toggles
                </button>
              </div>

              {/* Form & Controls Container */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {createdSlug ? (
                  <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-xl text-center space-y-4">
                    <Sparkles className="w-10 h-10 text-rose-300 mx-auto" />
                    <div>
                      <h3 className="text-base font-bold text-white uppercase">Status Page Saved & Live!</h3>
                      <p className="text-xs text-neutral-400 mt-1">Your status page URL is active at:</p>
                      <a
                        href={`/status/${createdSlug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 mt-3 text-xs font-mono font-bold text-rose-300 hover:underline bg-black px-4 py-2 border border-rose-500/30 rounded-lg shadow-lg"
                      >
                        /status/{createdSlug} <ExternalLink className="w-4 h-4 text-rose-300" />
                      </a>
                    </div>
                    <button
                      onClick={() => {
                        setCreatedSlug(null);
                        onClose();
                      }}
                      className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-750 text-white text-xs font-mono uppercase rounded-lg border-none cursor-pointer"
                    >
                      Close Window
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                      <div className="p-3 text-xs bg-rose-950/60 text-rose-300 rounded-lg border border-rose-800/60">
                        {error}
                      </div>
                    )}

                    {/* Tab 1: Services & Details */}
                    {activeTab === 'services' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs text-neutral-300 uppercase">PAGE TITLE *</label>
                            <input
                              type="text"
                              placeholder="Acme System Status"
                              value={title}
                              onChange={(e) => handleTitleChange(e.target.value)}
                              required
                              className="w-full px-3.5 py-2 bg-black border border-neutral-800 focus:border-rose-400 rounded-lg text-neutral-100 text-xs outline-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs text-neutral-300 uppercase">URL SLUG *</label>
                            <input
                              type="text"
                              placeholder="acme-status"
                              value={slug}
                              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                              required
                              className="w-full px-3.5 py-2 bg-black border border-neutral-800 focus:border-rose-400 rounded-lg text-neutral-100 text-xs outline-none"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs text-neutral-300 uppercase">DESCRIPTION</label>
                          <input
                            type="text"
                            placeholder="Real-time performance metrics and backend system status."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-3.5 py-2 bg-black border border-neutral-800 focus:border-rose-400 rounded-lg text-neutral-100 text-xs outline-none"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs text-neutral-300 uppercase block">
                            FEATURED SERVICES ({selectedEndpointIds.length} SELECTED)
                          </label>
                          <div className="max-h-52 overflow-y-auto space-y-2 p-3 bg-black border border-neutral-850 rounded-lg">
                            {endpoints.length === 0 ? (
                              <p className="text-xs text-neutral-500 font-mono">No registered endpoints available.</p>
                            ) : (
                              endpoints.map((ep) => {
                                const isSelected = selectedEndpointIds.includes(ep._id);
                                return (
                                  <div
                                    key={ep._id}
                                    onClick={() => toggleEndpoint(ep._id)}
                                    className={`p-3 border rounded-lg cursor-pointer transition-all flex items-center justify-between ${
                                      isSelected
                                        ? 'bg-rose-950/40 border-rose-500/50 text-rose-300'
                                        : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                                    }`}
                                  >
                                    <div>
                                      <span className="text-xs font-bold uppercase block text-white">{ep.projectName}</span>
                                      <span className="text-[11px] block text-neutral-400 truncate max-w-xs">{ep.url}</span>
                                    </div>
                                    <div className={`w-5 h-5 rounded-md flex items-center justify-center ${isSelected ? 'bg-rose-600 text-white' : 'bg-neutral-800'}`}>
                                      {isSelected && <Check className="w-3.5 h-3.5" />}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tab 2: Theme & Colors */}
                    {activeTab === 'theme' && (
                      <div className="space-y-5">
                        <div>
                          <label className="text-xs text-neutral-300 uppercase block mb-2">GENZ THEME PRESETS</label>
                          <div className="grid grid-cols-2 gap-2.5">
                            {THEME_PRESETS.map((preset) => (
                              <div
                                key={preset.id}
                                onClick={() => applyPreset(preset.id)}
                                style={{ backgroundColor: preset.bg, borderColor: themePreset === preset.id ? preset.accent : '#333' }}
                                className={`p-3 rounded-xl border-2 cursor-pointer transition-all space-y-2 relative ${
                                  themePreset === preset.id ? 'shadow-lg shadow-rose-500/10' : 'opacity-80 hover:opacity-100'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-white">{preset.name}</span>
                                  {themePreset === preset.id && (
                                    <span style={{ backgroundColor: preset.accent }} className="w-2 h-2 rounded-full" />
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: preset.bg }} />
                                  <span className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: preset.card }} />
                                  <span className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: preset.accent }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                          <div className="space-y-1">
                            <label className="text-[11px] text-neutral-400 uppercase block">BACKGROUND</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={backgroundColor}
                                onChange={(e) => {
                                  setBackgroundColor(e.target.value);
                                  setThemePreset('custom');
                                }}
                                className="w-8 h-8 rounded-lg bg-black border border-neutral-800 cursor-pointer"
                              />
                              <input
                                type="text"
                                value={backgroundColor}
                                onChange={(e) => setBackgroundColor(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-black border border-neutral-800 rounded-lg text-xs font-mono"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] text-neutral-400 uppercase block">CARD BG</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={cardBackgroundColor}
                                onChange={(e) => setCardBackgroundColor(e.target.value)}
                                className="w-8 h-8 rounded-lg bg-black border border-neutral-800 cursor-pointer"
                              />
                              <input
                                type="text"
                                value={cardBackgroundColor}
                                onChange={(e) => setCardBackgroundColor(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-black border border-neutral-800 rounded-lg text-xs font-mono"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] text-neutral-400 uppercase block">ACCENT GLOW</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={accentColor}
                                onChange={(e) => setAccentColor(e.target.value)}
                                className="w-8 h-8 rounded-lg bg-black border border-neutral-800 cursor-pointer"
                              />
                              <input
                                type="text"
                                value={accentColor}
                                onChange={(e) => setAccentColor(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-black border border-neutral-800 rounded-lg text-xs font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tab 3: Text & Badges */}
                    {activeTab === 'typography' && (
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-xs text-neutral-300 uppercase block">FONT SIZE & TYPOGRAPHY STYLE</label>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { id: 'compact', name: 'Compact Micro' },
                              { id: 'standard', name: 'Standard Mono' },
                              { id: 'large', name: 'Large Bold' },
                              { id: 'genz_display', name: 'GenZ Display ⚡' },
                            ].map((style) => (
                              <button
                                key={style.id}
                                type="button"
                                onClick={() => setFontSize(style.id as any)}
                                className={`p-2.5 text-xs font-bold rounded-lg border text-center transition-all ${
                                  fontSize === style.id
                                    ? 'bg-rose-950 text-rose-300 border-rose-500'
                                    : 'bg-black text-neutral-400 border-neutral-800 hover:text-white'
                                }`}
                              >
                                {style.name}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs text-neutral-300 uppercase block">CUSTOM HEADER BADGE TEXT</label>
                          <input
                            type="text"
                            value={customHeaderBadge}
                            onChange={(e) => setCustomHeaderBadge(e.target.value)}
                            placeholder="⚡ PUBLIC STATUS MONITOR"
                            className="w-full px-3.5 py-2 bg-black border border-neutral-800 focus:border-rose-400 rounded-lg text-neutral-100 text-xs outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs text-neutral-300 uppercase block">CUSTOM OPERATIONAL BANNER MESSAGE</label>
                          <input
                            type="text"
                            value={customBannerMessage}
                            onChange={(e) => setCustomBannerMessage(e.target.value)}
                            placeholder="ALL SYSTEMS OPERATIONAL & VIBING 💯"
                            className="w-full px-3.5 py-2 bg-black border border-neutral-800 focus:border-rose-400 rounded-lg text-neutral-100 text-xs outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs text-neutral-300 uppercase block">CUSTOM FOOTER TEXT</label>
                          <input
                            type="text"
                            value={customFooterText}
                            onChange={(e) => setCustomFooterText(e.target.value)}
                            placeholder="POWERED BY WAKEUP MONITORING"
                            className="w-full px-3.5 py-2 bg-black border border-neutral-800 focus:border-rose-400 rounded-lg text-neutral-100 text-xs outline-none"
                          />
                        </div>
                      </div>
                    )}

                    {/* Tab 4: Layout Toggles */}
                    {activeTab === 'toggles' && (
                      <div className="space-y-3">
                        <label className="text-xs text-neutral-300 uppercase block mb-1">COMPONENT VISIBILITY TOGGLES</label>
                        {[
                          { label: 'Show Status Banner', state: showBanner, setter: setShowBanner },
                          { label: 'Show 30-Day Timeline History Bars', state: showHistoryBars, setter: setShowHistoryBars },
                          { label: 'Show Response Time Latency (MS)', state: showMetrics, setter: setShowMetrics },
                          { label: 'Show Active Incidents Feed', state: showIncidents, setter: setShowIncidents },
                          { label: 'Show Footer Credit', state: showFooter, setter: setShowFooter },
                        ].map((item, idx) => (
                          <div
                            key={idx}
                            onClick={() => item.setter(!item.state)}
                            className="p-3 bg-black border border-neutral-850 rounded-lg flex items-center justify-between cursor-pointer hover:bg-neutral-900 transition-colors"
                          >
                            <span className="text-xs text-white font-bold">{item.label}</span>
                            {item.state ? (
                              <ToggleRight className="w-6 h-6 text-rose-300" />
                            ) : (
                              <ToggleLeft className="w-6 h-6 text-neutral-600" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Submit Action Bar */}
                    <div className="pt-3 border-t border-neutral-900 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-bold rounded-lg border-none cursor-pointer"
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        disabled={loading || selectedEndpointIds.length === 0}
                        className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase rounded-lg border-none transition-all flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                      >
                        {loading ? (
                          'SAVING...'
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            {editingPage ? 'UPDATE STATUS PAGE' : 'PUBLISH STATUS PAGE'}
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Right Column: ALWAYS VISIBLE LIVE PREVIEW STUDIO */}
            <div className="w-full lg:w-1/2 flex flex-col bg-black/60 overflow-hidden">
              <div className="p-3 bg-neutral-900 border-b border-neutral-850 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-white uppercase">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>LIVE PREVIEW STUDIO (REAL-TIME)</span>
                </div>
                <span className="text-[10px] text-rose-300 bg-rose-950/60 border border-rose-500/30 px-2 py-0.5 rounded font-mono">
                  {fontSize.toUpperCase()}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex items-start justify-center">
                <div
                  style={{ backgroundColor, color: '#ffffff' }}
                  className="w-full p-5 rounded-2xl border border-white/10 space-y-5 shadow-2xl transition-all duration-300 font-mono min-h-[350px]"
                >
                  {/* Preview Header */}
                  <div className="text-center space-y-2">
                    {customHeaderBadge && (
                      <div
                        style={{ color: accentColor, backgroundColor: `${accentColor}20`, borderColor: `${accentColor}40` }}
                        className="inline-flex items-center gap-1.5 px-3 py-0.5 text-[10px] font-bold rounded-full border uppercase shadow-sm"
                      >
                        <Activity className="w-3 h-3" /> {customHeaderBadge}
                      </div>
                    )}
                    <h2
                      className={
                        fontSize === 'genz_display'
                          ? 'text-2xl font-extrabold uppercase text-transparent bg-clip-text bg-gradient-to-r from-white via-rose-300 to-rose-500 tracking-wider'
                          : fontSize === 'large'
                          ? 'text-xl font-bold uppercase'
                          : fontSize === 'compact'
                          ? 'text-sm font-bold uppercase'
                          : 'text-lg font-bold uppercase'
                      }
                    >
                      {title || 'Acme System Status'}
                    </h2>
                    {description && <p className="text-xs opacity-70 leading-relaxed max-w-sm mx-auto">{description}</p>}
                  </div>

                  {/* Preview Banner */}
                  {showBanner && (
                    <div
                      style={{ backgroundColor: cardBackgroundColor }}
                      className="p-3.5 rounded-xl border border-emerald-500/30 flex items-center gap-3 shadow-md"
                    >
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase">
                          {customBannerMessage || 'ALL SYSTEMS OPERATIONAL & VIBING 💯'}
                        </h4>
                        <span className="text-[9px] opacity-40 uppercase">LAST CHECKED: JUST NOW</span>
                      </div>
                    </div>
                  )}

                  {/* Preview Monitored Services */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-white/10 pb-1.5 text-[10px] opacity-60 font-bold uppercase">
                      <span>MONITORED SERVICES ({selectedEndpointsList.length || 2})</span>
                      <span>STATUS</span>
                    </div>

                    {(selectedEndpointsList.length > 0 ? selectedEndpointsList : [
                      { _id: '1', projectName: 'AUTH SERVICE API', url: 'https://auth.api.io/health', status: 'healthy', lastResponseTimeMs: 38 },
                      { _id: '2', projectName: 'PAYMENT GATEWAY', url: 'https://pay.api.io/ping', status: 'healthy', lastResponseTimeMs: 84 },
                    ]).map((ep, i) => (
                      <div
                        key={ep._id || i}
                        style={{ backgroundColor: cardBackgroundColor }}
                        className="p-3 rounded-xl border border-white/10 space-y-2 shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <span className="text-xs font-bold uppercase text-white block">{ep.projectName}</span>
                            <span className="text-[10px] opacity-60 truncate block max-w-[200px]">{ep.url}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {showMetrics && ep.lastResponseTimeMs && (
                              <span className="text-[10px] opacity-60 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-rose-300" /> {ep.lastResponseTimeMs}MS
                              </span>
                            )}
                            <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800/60 rounded text-[9px] font-bold uppercase">
                              OPERATIONAL
                            </span>
                          </div>
                        </div>

                        {/* Timeline Bar Preview */}
                        {showHistoryBars && (
                          <div className="pt-1.5 border-t border-white/5 flex items-center gap-0.5">
                            {Array.from({ length: 24 }).map((_, idx) => (
                              <div
                                key={idx}
                                className={`h-3 flex-1 rounded-xs ${
                                  idx === 20 ? 'bg-emerald-500/80 relative overflow-hidden flex items-center justify-center' : 'bg-emerald-500/80'
                                }`}
                              >
                                {idx === 20 && <div className="w-1 h-full bg-amber-400" />}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Active Incidents Preview */}
                  {showIncidents && (
                    <div className="pt-2 border-t border-white/10 space-y-2">
                      <span className="text-[10px] font-bold text-rose-400 uppercase flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> ACTIVE INCIDENTS FEED
                      </span>
                      <div style={{ backgroundColor: cardBackgroundColor }} className="p-3 rounded-xl border border-rose-500/20 text-xs space-y-1">
                        <span className="text-[10px] text-rose-300 font-bold uppercase">AUTH SERVICE • RESOLVED INCIDENT</span>
                        <p className="text-[11px] opacity-70">Minor 5m latency surge detected & automatically resolved.</p>
                      </div>
                    </div>
                  )}

                  {/* Footer Preview */}
                  {showFooter && (
                    <div className="text-center text-[9px] opacity-40 uppercase pt-4 border-t border-white/10">
                      {customFooterText || 'POWERED BY WAKEUP MONITORING'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
