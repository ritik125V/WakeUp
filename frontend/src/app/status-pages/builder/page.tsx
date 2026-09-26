'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Layout,
  Palette,
  Type,
  SlidersHorizontal,
  Sparkles,
  Check,
  ExternalLink,
  Activity,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Image as ImageIcon,
  Megaphone,
  Trash2,
  Globe,
  Mail,
  FileText,
  Wrench,
} from 'lucide-react';

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const TwitterIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
);
import { IncidentTimeline } from '@/components/IncidentTimeline';
import {
  createStatusPage,
  updateStatusPage,
  fetchUserStatusPages,
  fetchGroupedEndpoints,
  EndpointData,
  StatusPageCustomization,
  StatusPageRecord,
} from '@/lib/api';
import { StatusArtwork, StatusPatternOverlay } from '@/components/StatusArtwork';
import { StatusTelemetryWidget } from '@/components/StatusTelemetry';

interface DeletablePreviewItemProps {
  label: string;
  onDelete: () => void;
  children: React.ReactNode;
  className?: string;
}

function DeletablePreviewItem({ label, onDelete, children, className = '' }: DeletablePreviewItemProps) {
  return (
    <div className={`relative group/deletable hover:bg-rose-950/20 rounded-xl transition-all ${className}`}>
      <div className="absolute -top-2 right-2 opacity-0 group-hover/deletable:opacity-100 transition-all z-30 flex items-center gap-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-medium px-2 py-0.5 rounded-full shadow-lg cursor-pointer select-none">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="flex items-center gap-1 border-none bg-transparent text-white cursor-pointer"
          title={`Click to remove ${label}`}
        >
          <Trash2 className="w-3 h-3" /> Hide {label}
        </button>
      </div>
      {children}
    </div>
  );
}

const THEME_PRESETS: Array<{
  id: StatusPageCustomization['themePreset'];
  name: string;
  bg: string;
  card: string;
  accent: string;
}> = [
  { id: 'cyberpunk', name: 'Cyber Dark', bg: '#050505', card: '#0d0d0d', accent: '#f43f5e' },
  { id: 'neon_emerald', name: 'Emerald', bg: '#021a12', card: '#052e21', accent: '#10b981' },
  { id: 'discord_gamer', name: 'Slate Blue', bg: '#0b0f19', card: '#111827', accent: '#38bdf8' },
  { id: 'vaporwave', name: 'Violet Dark', bg: '#0f051d', card: '#1a0a33', accent: '#d946ef' },
  { id: 'sunset', name: 'Solar Amber', bg: '#180c02', card: '#2a1707', accent: '#f59e0b' },
  { id: 'matrix_rain', name: 'Matrix Code', bg: '#020b06', card: '#061a0f', accent: '#22c55e' },
  { id: 'minimal_charcoal', name: 'Minimal Charcoal', bg: '#111111', card: '#1c1c1c', accent: '#e5e5e5' },
];

const ARTWORK_STYLES = [
  { id: 'synthwave_sun', label: '🌅 Synthwave Sun' },
  { id: 'cyber_nodes', label: '⚡ Cyber Nodes' },
  { id: 'waveform_pulse', label: '🌊 Waveform Graph' },
  { id: 'matrix_rain', label: '📟 Matrix Streams' },
  { id: 'isometric_servers', label: '🏙️ Cloud Towers' },
  { id: 'constellation', label: '✨ Constellation' },
  { id: 'origami_geometric', label: '📐 Geometric Mesh' },
  { id: 'none', label: '🚫 No Graphic Artwork' },
];

const EMOJI_OPTIONS = ['⚡', '🛡️', '📡', '🌐', '🚀', '💻', '🔒', '🔥'];

function StatusBuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageId = searchParams.get('id');

  const [activeTab, setActiveTab] = useState<'services' | 'theme' | 'artwork' | 'typography' | 'toggles'>('services');

  const [endpoints, setEndpoints] = useState<EndpointData[]>([]);
  const [editingPage, setEditingPage] = useState<StatusPageRecord | null>(null);

  // Core Fields
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [selectedEndpointIds, setSelectedEndpointIds] = useState<string[]>([]);

  // Customization State (including Images & Assets)
  const [themePreset, setThemePreset] = useState<StatusPageCustomization['themePreset']>('cyberpunk');
  const [artworkStyle, setArtworkStyle] = useState<StatusPageCustomization['artworkStyle']>('synthwave_sun');
  const [artworkPosition, setArtworkPosition] = useState<StatusPageCustomization['artworkPosition']>('top_hero');
  const [logoEmoji, setLogoEmoji] = useState<string>('⚡');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [heroImageUrl, setHeroImageUrl] = useState<string>('');
  const [websiteUrl, setWebsiteUrl] = useState<string>('');
  const [githubUrl, setGithubUrl] = useState<string>('');
  const [backgroundPattern, setBackgroundPattern] = useState<StatusPageCustomization['backgroundPattern']>('grid');
  const [fontFamily, setFontFamily] = useState<StatusPageCustomization['fontFamily']>('sans');
  const [cardRadiusStyle, setCardRadiusStyle] = useState<StatusPageCustomization['cardRadiusStyle']>('rounded-xl');
  const [statusBadgeStyle, setStatusBadgeStyle] = useState<StatusPageCustomization['statusBadgeStyle']>('standard');
  const [customHealthyText, setCustomHealthyText] = useState<string>('');
  const [customDegradedText, setCustomDegradedText] = useState<string>('');
  const [customDownText, setCustomDownText] = useState<string>('');

  const [announcementBarText, setAnnouncementBarText] = useState<string>('');
  const [announcementBarLink, setAnnouncementBarLink] = useState<string>('');
  const [announcementBarType, setAnnouncementBarType] = useState<StatusPageCustomization['announcementBarType']>('info');
  const [maintenanceNotice, setMaintenanceNotice] = useState<string>('');

  const [backgroundColor, setBackgroundColor] = useState<string>('#050505');
  const [cardBackgroundColor, setCardBackgroundColor] = useState<string>('#0d0d0d');
  const [textColor, setTextColor] = useState<string>('#ffffff');
  const [accentColor, setAccentColor] = useState<string>('#f43f5e');
  const [fontSize, setFontSize] = useState<'compact' | 'standard' | 'large' | 'genz_display'>('standard');
  const [customHeaderBadge, setCustomHeaderBadge] = useState<string>('Public Status');
  const [customBannerMessage, setCustomBannerMessage] = useState<string>('All Systems Operational');
  const [customFooterText, setCustomFooterText] = useState<string>('Powered by WakeUp Monitoring');

  // Support links & Branding
  const [supportEmail, setSupportEmail] = useState<string>('');
  const [supportDocsUrl, setSupportDocsUrl] = useState<string>('');
  const [twitterHandle, setTwitterHandle] = useState<string>('');

  // Visibility Toggles
  const [showLogo, setShowLogo] = useState(true);
  const [showHeaderBadge, setShowHeaderBadge] = useState(true);
  const [showTitle, setShowTitle] = useState(true);
  const [showDescription, setShowDescription] = useState(true);
  const [showBanner, setShowBanner] = useState(true);
  const [showIncidents, setShowIncidents] = useState(true);
  const [showHistoryBars, setShowHistoryBars] = useState(true);
  const [showMetrics, setShowMetrics] = useState(true);
  const [showServicesHeader, setShowServicesHeader] = useState(true);
  const [showServiceUrls, setShowServiceUrls] = useState(true);
  const [showServiceStatusBadge, setShowServiceStatusBadge] = useState(true);
  const [showFooter, setShowFooter] = useState(true);
  const [showArtwork, setShowArtwork] = useState(true);
  const [showTelemetryWidget, setShowTelemetryWidget] = useState(true);
  const [showLatencyBreakdown, setShowLatencyBreakdown] = useState(true);
  const [showSupportLinks, setShowSupportLinks] = useState(true);
  const [showReactions, setShowReactions] = useState(true);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);


  useEffect(() => {
    async function initData() {
      const token = typeof window !== 'undefined' ? localStorage.getItem('wakeup_auth_token') : null;
      if (!token) {
        router.push('/login');
        return;
      }
      setFetching(true);
      try {
        const epData = await fetchGroupedEndpoints();
        const allEp = Object.values(epData.projects || {}).flat();
        setEndpoints(allEp);

        if (pageId) {
          const spRes = await fetchUserStatusPages();
          const target = (spRes.statusPages || []).find((p) => p._id === pageId);
          if (target) {
            setEditingPage(target);
            setTitle(target.title);
            setSlug(target.slug);
            setDescription(target.description || '');
            setSelectedEndpointIds(target.endpointIds ? target.endpointIds.map((e: any) => e._id || e) : []);

            if (target.customization) {
              const cust = target.customization;
              setThemePreset(cust.themePreset || 'cyberpunk');
              setArtworkStyle(cust.artworkStyle || 'synthwave_sun');
              setArtworkPosition(cust.artworkPosition || 'top_hero');
              setLogoEmoji(cust.logoEmoji || '⚡');
              setLogoUrl(cust.logoUrl || '');
              setHeroImageUrl(cust.heroImageUrl || '');
              setWebsiteUrl(cust.websiteUrl || '');
              setGithubUrl(cust.githubUrl || '');
              setBackgroundPattern(cust.backgroundPattern || 'grid');
              setFontFamily(cust.fontFamily || 'sans');
              setCardRadiusStyle(cust.cardRadiusStyle || 'rounded-xl');
              setStatusBadgeStyle(cust.statusBadgeStyle || 'standard');
              setCustomHealthyText(cust.customHealthyText || '');
              setCustomDegradedText(cust.customDegradedText || '');
              setCustomDownText(cust.customDownText || '');
              setAnnouncementBarText(cust.announcementBarText || '');
              setAnnouncementBarLink(cust.announcementBarLink || '');
              setAnnouncementBarType(cust.announcementBarType || 'info');
              setMaintenanceNotice(cust.maintenanceNotice || '');
              setSupportEmail(cust.supportEmail || '');
              setSupportDocsUrl(cust.supportDocsUrl || '');
              setTwitterHandle(cust.twitterHandle || '');
              setBackgroundColor(cust.backgroundColor || '#050505');
              setCardBackgroundColor(cust.cardBackgroundColor || '#0d0d0d');
              setTextColor(cust.textColor || '#ffffff');
              setAccentColor(cust.accentColor || '#f43f5e');
              setFontSize(cust.fontSize || 'standard');
              setCustomHeaderBadge(cust.customHeaderBadge || 'Public Status');
              setCustomBannerMessage(cust.customBannerMessage || 'All Systems Operational');
              setCustomFooterText(cust.customFooterText || 'Powered by WakeUp Monitoring');
              setShowLogo(cust.showLogo !== false);
              setShowHeaderBadge(cust.showHeaderBadge !== false);
              setShowTitle(cust.showTitle !== false);
              setShowDescription(cust.showDescription !== false);
              setShowBanner(cust.showBanner !== false);
              setShowIncidents(cust.showIncidents !== false);
              setShowHistoryBars(cust.showHistoryBars !== false);
              setShowMetrics(cust.showMetrics !== false);
              setShowServicesHeader(cust.showServicesHeader !== false);
              setShowServiceUrls(cust.showServiceUrls !== false);
              setShowServiceStatusBadge(cust.showServiceStatusBadge !== false);
              setShowFooter(cust.showFooter !== false);
              setShowArtwork(cust.showArtwork !== false);
              setShowTelemetryWidget(cust.showTelemetryWidget !== false);
              setShowLatencyBreakdown(cust.showLatencyBreakdown !== false);
              setShowSupportLinks(cust.showSupportLinks !== false);
              setShowReactions(cust.showReactions !== false);
            }
          }
        } else {
          if (allEp.length > 0) {
            setSelectedEndpointIds(allEp.slice(0, 3).map((e) => e._id));
          }
        }
      } catch (err) {
        console.error('Failed to init builder data:', err);
      } finally {
        setFetching(false);
      }
    }
    initData();
  }, [pageId]);

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
      setError('Please provide a page title, URL slug, and select at least 1 service');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const customization: StatusPageCustomization = {
      themePreset,
      artworkStyle,
      artworkPosition,
      logoEmoji,
      logoUrl,
      heroImageUrl,
      websiteUrl,
      githubUrl,
      backgroundPattern,
      fontFamily,
      cardRadiusStyle,
      statusBadgeStyle,
      customHealthyText,
      customDegradedText,
      customDownText,
      announcementBarText,
      announcementBarLink,
      announcementBarType,
      maintenanceNotice,
      supportEmail,
      supportDocsUrl,
      twitterHandle,
      backgroundColor,
      cardBackgroundColor,
      textColor,
      accentColor,
      fontSize,
      customHeaderBadge,
      customBannerMessage,
      showLogo,
      showHeaderBadge,
      showTitle,
      showDescription,
      showBanner,
      showIncidents,
      showHistoryBars,
      showMetrics,
      showServicesHeader,
      showServiceUrls,
      showServiceStatusBadge,
      showFooter,
      showArtwork,
      showTelemetryWidget,
      showLatencyBreakdown,
      showSupportLinks,
      showReactions,
      customFooterText,
    };

    try {
      if (editingPage) {
        const res = await updateStatusPage(editingPage._id, {
          title,
          slug,
          description,
          endpointIds: selectedEndpointIds,
          customization,
        });
        setEditingPage(res.statusPage);
        setCreatedSlug(res.statusPage.slug);
        setSlug(res.statusPage.slug);
        setSuccessMsg('Status page updated successfully!');
      } else {
        const res = await createStatusPage({
          title,
          slug,
          description,
          endpointIds: selectedEndpointIds,
          customization,
        });
        setEditingPage(res.statusPage);
        setCreatedSlug(res.statusPage.slug);
        setSlug(res.statusPage.slug);
        setSuccessMsg('Status page published successfully!');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to save status page');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen bg-black text-neutral-100 flex items-center justify-center p-6 font-sans">
        <div className="flex items-center gap-2 text-rose-400 text-xs">
          <Activity className="w-4 h-4 animate-spin text-rose-400" /> Loading Status Studio...
        </div>
      </div>
    );
  }

  const selectedEndpointsList = endpoints.filter((e) => selectedEndpointIds.includes(e._id));

  const formatPreviewBadge = (status: string) => {
    if (statusBadgeStyle === 'custom_text') {
      if (status === 'healthy') return customHealthyText || 'Operational';
      if (status === 'down') return customDownText || 'Down';
      return customDegradedText || 'Degraded';
    }
    return status === 'healthy' ? 'Operational' : status === 'down' ? 'Down' : 'Degraded';
  };

  return (
    <div className="min-h-[calc(100vh-60px)] bg-black text-neutral-100 flex flex-col font-sans">
      {/* Studio Top Control Bar */}
      <div className="p-3 sm:px-6 bg-neutral-950 flex items-center justify-between gap-3 shrink-0 border-none touch-manipulation">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => router.push('/status-pages')}
            className="p-2 sm:px-3 sm:py-2 text-neutral-400 hover:text-white rounded-xl bg-neutral-900 flex items-center gap-1.5 text-xs font-semibold border-none cursor-pointer touch-press min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4 text-neutral-400" /> <span className="hidden sm:inline">Back to Pages</span>
          </button>
          <div className="hidden md:block">
            <h1 className="text-xs font-semibold text-white">
              {editingPage ? 'Edit Status Page' : 'Create Status Page'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {createdSlug && (
            <a
              href={`/status/${createdSlug}`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 text-rose-300 text-xs font-semibold rounded-xl flex items-center gap-1 hover:underline border-none bg-neutral-900 touch-press min-h-[44px]"
            >
              <span className="hidden sm:inline">View Live</span> Page <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || selectedEndpointIds.length === 0}
            className="px-4 sm:px-5 py-2 min-h-[44px] bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-800 text-white text-xs font-semibold rounded-xl border-none transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 touch-press shadow-md"
          >
            {loading ? (
              'Saving...'
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-white" />
                <span>{editingPage ? 'Save Changes' : 'Publish Page'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Studio Workspace Split */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Column: Multi-Tab Customization Controls */}
        <div className="w-full lg:w-5/12 flex flex-col bg-neutral-950 overflow-hidden border-none">
          {/* Tabs Navigation Bar */}
          <div className="flex items-center gap-1 p-2 bg-neutral-900 border-none overflow-x-auto text-xs shrink-0 font-medium touch-manipulation">
            <button
              type="button"
              onClick={() => setActiveTab('services')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-colors border-none cursor-pointer touch-press ${
                activeTab === 'services' ? 'bg-neutral-800 text-white font-semibold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Layout className="w-3.5 h-3.5" /> Services
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('theme')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-colors border-none cursor-pointer touch-press ${
                activeTab === 'theme' ? 'bg-rose-950/80 text-rose-300 font-semibold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Palette className="w-3.5 h-3.5" /> Themes
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('artwork')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors border-none ${
                activeTab === 'artwork' ? 'bg-rose-950/80 text-rose-300 font-semibold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" /> Images & Art
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('typography')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors border-none ${
                activeTab === 'typography' ? 'bg-rose-950/80 text-rose-300 font-semibold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Type className="w-3.5 h-3.5" /> Branding & Links
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('toggles')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors border-none ${
                activeTab === 'toggles' ? 'bg-rose-950/80 text-rose-300 font-semibold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" /> Toggles
            </button>
          </div>

          {/* Form Content Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {error && (
              <div className="p-3 text-xs bg-rose-950/80 text-rose-300 rounded-xl font-medium">
                {error}
              </div>
            )}

            {successMsg && (
              <div className="p-3 text-xs bg-emerald-950/80 text-emerald-300 rounded-xl flex items-center justify-between gap-2 font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{successMsg}</span>
                </div>
                {createdSlug && (
                  <a
                    href={`/status/${createdSlug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-emerald-200 font-bold shrink-0 flex items-center gap-1"
                  >
                    View Page <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}


            {/* TAB 1: SERVICES & DETAILS */}
            {activeTab === 'services' && (
              <div className="space-y-4 font-sans">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-neutral-300">Page Title *</label>
                    <input
                      type="text"
                      placeholder="Acme System Status"
                      value={title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      required
                      className="w-full px-3.5 py-2 bg-black border-none rounded-xl text-neutral-100 text-xs outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-neutral-300">URL Slug *</label>
                    <input
                      type="text"
                      placeholder="acme-status"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                      required
                      className="w-full px-3.5 py-2 bg-black border-none rounded-xl text-neutral-100 text-xs outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-300">Description</label>
                  <input
                    type="text"
                    placeholder="Real-time performance metrics and backend system status."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2 bg-black border-none rounded-xl text-neutral-100 text-xs outline-none"
                  />
                </div>

                {/* System Announcements & Notices */}
                <div className="p-3.5 bg-black rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-rose-300 flex items-center gap-1.5">
                      <Megaphone className="w-3.5 h-3.5" /> Announcement Bar & Maintenance Notice
                    </span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-medium text-neutral-400">Announcement Message</label>
                    <input
                      type="text"
                      placeholder="e.g. Scheduled Maintenance Notice: API upgrades this Sunday 2:00 AM UTC"
                      value={announcementBarText}
                      onChange={(e) => setAnnouncementBarText(e.target.value)}
                      className="w-full px-3 py-1.5 bg-neutral-900 border-none rounded-lg text-xs text-white outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-medium text-neutral-400">Notice Link URL</label>
                      <input
                        type="url"
                        placeholder="https://docs.acme.io/notice"
                        value={announcementBarLink}
                        onChange={(e) => setAnnouncementBarLink(e.target.value)}
                        className="w-full px-3 py-1.5 bg-neutral-900 border-none rounded-lg text-xs text-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-neutral-400">Notice Type</label>
                      <select
                        value={announcementBarType}
                        onChange={(e) => setAnnouncementBarType(e.target.value as any)}
                        className="w-full px-3 py-1.5 bg-neutral-900 border-none rounded-lg text-xs text-white outline-none"
                      >
                        <option value="info">Info (Blue/Rose)</option>
                        <option value="warning">Warning (Amber)</option>
                        <option value="success">Operational Notice (Green)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-neutral-400 flex items-center gap-1">
                      <Wrench className="w-3 h-3 text-neutral-500" /> Maintenance Notice Details
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Scheduled database maintenance in progress. Expected resolution time: 30 minutes."
                      value={maintenanceNotice}
                      onChange={(e) => setMaintenanceNotice(e.target.value)}
                      className="w-full px-3 py-1.5 bg-neutral-900 border-none rounded-lg text-xs text-white outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-neutral-300 block">
                    Featured Services ({selectedEndpointIds.length} selected)
                  </label>
                  <div className="max-h-56 overflow-y-auto space-y-2 p-3 bg-black rounded-xl">
                    {endpoints.length === 0 ? (
                      <p className="text-xs text-neutral-500 font-mono">No registered endpoints found.</p>
                    ) : (
                      endpoints.map((ep) => {
                        const isSelected = selectedEndpointIds.includes(ep._id);
                        return (
                          <div
                            key={ep._id}
                            onClick={() => toggleEndpoint(ep._id)}
                            className={`p-3 rounded-xl cursor-pointer transition-colors flex items-center justify-between ${
                              isSelected
                                ? 'bg-rose-950/60 text-rose-300'
                                : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <span className="text-xs font-semibold block text-white">{ep.projectName}</span>
                              <span className="text-[11px] font-mono block text-neutral-500 truncate">{ep.url}</span>
                            </div>
                            <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${isSelected ? 'bg-rose-600 text-white' : 'bg-neutral-800'}`}>
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

            {/* TAB 2: THEME & COLOR PALETTES */}
            {activeTab === 'theme' && (
              <div className="space-y-5 font-sans">
                <div>
                  <label className="text-xs font-medium text-neutral-300 block mb-2">Curated Color Palettes</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {THEME_PRESETS.map((preset) => (
                      <div
                        key={preset.id}
                        onClick={() => applyPreset(preset.id)}
                        style={{ backgroundColor: preset.bg }}
                        className={`p-3 rounded-xl cursor-pointer transition-all space-y-2 relative border-none ${
                          themePreset === preset.id ? 'ring-2 ring-rose-500' : 'opacity-80 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-white">{preset.name}</span>
                          {themePreset === preset.id && (
                            <span style={{ backgroundColor: preset.accent }} className="w-2 h-2 rounded-full" />
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: preset.bg }} />
                          <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: preset.card }} />
                          <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: preset.accent }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-neutral-400 block">Background</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={backgroundColor}
                        onChange={(e) => {
                          setBackgroundColor(e.target.value);
                          setThemePreset('custom');
                        }}
                        className="w-8 h-8 rounded-lg bg-black border-none cursor-pointer"
                      />
                      <input
                        type="text"
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-black rounded-lg text-xs font-mono border-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-neutral-400 block">Card Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={cardBackgroundColor}
                        onChange={(e) => setCardBackgroundColor(e.target.value)}
                        className="w-8 h-8 rounded-lg bg-black border-none cursor-pointer"
                      />
                      <input
                        type="text"
                        value={cardBackgroundColor}
                        onChange={(e) => setCardBackgroundColor(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-black rounded-lg text-xs font-mono border-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-neutral-400 block">Accent Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-8 h-8 rounded-lg bg-black border-none cursor-pointer"
                      />
                      <input
                        type="text"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-black rounded-lg text-xs font-mono border-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: ARTWORK & CUSTOM IMAGE LINKS */}
            {activeTab === 'artwork' && (
              <div className="space-y-5 font-sans">
                {/* Custom Image Links & Brand Assets */}
                <div className="p-3.5 bg-black rounded-xl space-y-3">
                  <span className="text-xs font-semibold text-rose-300 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" /> Custom Image Links & Assets
                  </span>

                  <div className="space-y-2">
                    <label className="text-[11px] font-medium text-neutral-400">Custom Brand Logo Image URL</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        placeholder="https://example.com/logo.png"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        className="w-full px-3 py-1.5 bg-neutral-900 border-none rounded-lg text-xs text-white outline-none"
                      />
                      {logoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logoUrl} alt="Logo Preview" className="w-8 h-8 object-contain rounded-md bg-neutral-900 shrink-0" />
                      )}
                    </div>
                    <span className="text-[10px] text-neutral-500">Overrides emoji logo when specified.</span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-medium text-neutral-400">Custom Hero Banner Image URL</label>
                    <div className="space-y-2">
                      <input
                        type="url"
                        placeholder="https://images.unsplash.com/photo-1518770660439-4636190af475?w=800"
                        value={heroImageUrl}
                        onChange={(e) => setHeroImageUrl(e.target.value)}
                        className="w-full px-3 py-1.5 bg-neutral-900 border-none rounded-lg text-xs text-white outline-none"
                      />
                      {heroImageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={heroImageUrl} alt="Hero Banner Preview" className="w-full h-20 object-cover rounded-lg bg-neutral-900 shrink-0" />
                      )}
                    </div>
                    <span className="text-[10px] text-neutral-500">Replaces SVG graphic artwork with your custom banner image.</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-neutral-300 block">Graphic Artwork Style</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ARTWORK_STYLES.map((art) => (
                      <button
                        key={art.id}
                        type="button"
                        onClick={() => setArtworkStyle(art.id as any)}
                        className={`p-3 text-xs font-medium rounded-xl text-left transition-colors border-none cursor-pointer ${
                          artworkStyle === art.id
                            ? 'bg-rose-950/80 text-rose-300'
                            : 'bg-black text-neutral-400 hover:text-white'
                        }`}
                      >
                        {art.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-neutral-300 block">Background Tech Pattern Overlay</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'grid', label: 'Matrix Grid' },
                      { id: 'dots', label: 'Tech Dots' },
                      { id: 'hexagon', label: 'Hex Mesh' },
                      { id: 'circuit', label: 'Circuit Traces' },
                      { id: 'none', label: 'Solid Color' },
                    ].map((pat) => (
                      <button
                        key={pat.id}
                        type="button"
                        onClick={() => setBackgroundPattern(pat.id as any)}
                        className={`p-2.5 text-xs font-medium rounded-lg text-center transition-colors border-none cursor-pointer ${
                          backgroundPattern === pat.id
                            ? 'bg-rose-950/80 text-rose-300'
                            : 'bg-black text-neutral-400 hover:text-white'
                        }`}
                      >
                        {pat.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: BRANDING, LINKS & TEXT OVERRIDES */}
            {activeTab === 'typography' && (
              <div className="space-y-5 font-sans">
                {/* Brand Emoji Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-neutral-300 block">Brand Emoji (Fallback Logo)</label>
                  <div className="flex flex-wrap gap-2 p-3 bg-black rounded-xl">
                    {EMOJI_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setLogoEmoji(emoji)}
                        className={`w-9 h-9 text-lg rounded-lg flex items-center justify-center transition-transform border-none cursor-pointer ${
                          logoEmoji === emoji ? 'bg-rose-950/80 text-rose-300 scale-110' : 'bg-neutral-900 hover:bg-neutral-850'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Support & Social Asset Links */}
                <div className="p-3.5 bg-black rounded-xl space-y-3">
                  <span className="text-xs font-semibold text-rose-300 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" /> Official Links & Social Assets
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-medium text-neutral-400 flex items-center gap-1">
                        <Globe className="w-3 h-3 text-neutral-500" /> Website Link URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://acme.io"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        className="w-full px-3 py-1.5 bg-neutral-900 border-none rounded-lg text-xs text-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-neutral-400 flex items-center gap-1">
                        <GithubIcon className="w-3 h-3 text-neutral-500" /> GitHub Repo URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://github.com/acme/status"
                        value={githubUrl}
                        onChange={(e) => setGithubUrl(e.target.value)}
                        className="w-full px-3 py-1.5 bg-neutral-900 border-none rounded-lg text-xs text-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-neutral-400 flex items-center gap-1">
                        <Mail className="w-3 h-3 text-neutral-500" /> Support Email
                      </label>
                      <input
                        type="email"
                        placeholder="support@acme.io"
                        value={supportEmail}
                        onChange={(e) => setSupportEmail(e.target.value)}
                        className="w-full px-3 py-1.5 bg-neutral-900 border-none rounded-lg text-xs text-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-neutral-400 flex items-center gap-1">
                        <FileText className="w-3 h-3 text-neutral-500" /> Documentation URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://docs.acme.io"
                        value={supportDocsUrl}
                        onChange={(e) => setSupportDocsUrl(e.target.value)}
                        className="w-full px-3 py-1.5 bg-neutral-900 border-none rounded-lg text-xs text-white outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-neutral-400 flex items-center gap-1">
                      <TwitterIcon className="w-3 h-3 text-neutral-500" /> X / Twitter Handle
                    </label>
                    <input
                      type="text"
                      placeholder="acme_status"
                      value={twitterHandle}
                      onChange={(e) => setTwitterHandle(e.target.value)}
                      className="w-full px-3 py-1.5 bg-neutral-900 border-none rounded-lg text-xs text-white outline-none"
                    />
                  </div>
                </div>

                {/* Status Badge Style Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-neutral-300 block mb-1">Status Badge Style</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { id: 'standard', label: 'Standard (Operational / Down)' },
                      { id: 'custom_text', label: 'Custom Text Override' },
                    ].map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setStatusBadgeStyle(b.id as any)}
                        className={`p-3 text-xs font-medium rounded-xl text-left transition-colors border-none cursor-pointer ${
                          statusBadgeStyle === b.id
                            ? 'bg-rose-950/80 text-rose-300'
                            : 'bg-black text-neutral-400 hover:text-white'
                        }`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Status Text Inputs */}
                {statusBadgeStyle === 'custom_text' && (
                  <div className="p-3 bg-black rounded-xl space-y-2">
                    <span className="text-[11px] text-rose-300 font-semibold block">Custom Badge Text Overrides</span>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Operational"
                        value={customHealthyText}
                        onChange={(e) => setCustomHealthyText(e.target.value)}
                        className="px-2.5 py-1.5 bg-neutral-900 border-none rounded-lg text-xs text-emerald-400 font-medium"
                      />
                      <input
                        type="text"
                        placeholder="Degraded"
                        value={customDegradedText}
                        onChange={(e) => setCustomDegradedText(e.target.value)}
                        className="px-2.5 py-1.5 bg-neutral-900 border-none rounded-lg text-xs text-amber-400 font-medium"
                      />
                      <input
                        type="text"
                        placeholder="Down"
                        value={customDownText}
                        onChange={(e) => setCustomDownText(e.target.value)}
                        className="px-2.5 py-1.5 bg-neutral-900 border-none rounded-lg text-xs text-rose-400 font-medium"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-300 block">Card Corner Radius</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'rounded-none', label: 'Sharp' },
                      { id: 'rounded-lg', label: 'Subtle' },
                      { id: 'rounded-xl', label: 'Smooth' },
                      { id: 'rounded-3xl', label: 'Pill' },
                    ].map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setCardRadiusStyle(r.id as any)}
                        className={`p-2.5 text-xs font-medium rounded-lg text-center transition-colors border-none cursor-pointer ${
                          cardRadiusStyle === r.id ? 'bg-rose-950/80 text-rose-300' : 'bg-black text-neutral-400 hover:text-white'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-300 block">Header Badge Text</label>
                  <input
                    type="text"
                    value={customHeaderBadge}
                    onChange={(e) => setCustomHeaderBadge(e.target.value)}
                    placeholder="Public Status"
                    className="w-full px-3.5 py-2 bg-black border-none rounded-xl text-neutral-100 text-xs outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-300 block">Operational Banner Message</label>
                  <input
                    type="text"
                    value={customBannerMessage}
                    onChange={(e) => setCustomBannerMessage(e.target.value)}
                    placeholder="All Systems Operational"
                    className="w-full px-3.5 py-2 bg-black border-none rounded-xl text-neutral-100 text-xs outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-300 block">Footer Text & Copyright</label>
                  <input
                    type="text"
                    value={customFooterText}
                    onChange={(e) => setCustomFooterText(e.target.value)}
                    placeholder="Powered by WakeUp Monitoring"
                    className="w-full px-3.5 py-2 bg-black border-none rounded-xl text-neutral-100 text-xs outline-none"
                  />
                </div>
              </div>
            )}

            {/* TAB 5: VISIBILITY TOGGLES */}
            {activeTab === 'toggles' && (
              <div className="space-y-4 font-sans">
                <div className="space-y-2">
                  {[
                    { label: 'Hero Graphic Artwork / Image', state: showArtwork, setter: setShowArtwork },
                    { label: 'Real Telemetry & Latency Cards', state: showTelemetryWidget, setter: setShowTelemetryWidget },
                    { label: 'Overall Status Banner', state: showBanner, setter: setShowBanner },
                    { label: 'Brand Logo (Emoji / Image)', state: showLogo, setter: setShowLogo },
                    { label: 'Header Badge Pill', state: showHeaderBadge, setter: setShowHeaderBadge },
                    { label: 'Page Title', state: showTitle, setter: setShowTitle },
                    { label: 'Description Text', state: showDescription, setter: setShowDescription },
                    { label: 'Services Header Label', state: showServicesHeader, setter: setShowServicesHeader },
                    { label: 'Service URL Badges', state: showServiceUrls, setter: setShowServiceUrls },
                    { label: 'Status Badges', state: showServiceStatusBadge, setter: setShowServiceStatusBadge },
                    { label: 'Latency MS Metrics', state: showMetrics, setter: setShowMetrics },
                    { label: '30-Day Timeline Bars', state: showHistoryBars, setter: setShowHistoryBars },
                    { label: 'Incidents Feed', state: showIncidents, setter: setShowIncidents },
                    { label: 'Support & Official Links', state: showSupportLinks, setter: setShowSupportLinks },
                    { label: 'Footer Text', state: showFooter, setter: setShowFooter },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => item.setter(!item.state)}
                      className="p-3 bg-black rounded-xl flex items-center justify-between cursor-pointer hover:bg-neutral-900 transition-colors"
                    >
                      <span className="text-xs text-white font-medium">{item.label}</span>
                      <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${item.state ? 'bg-rose-600' : 'bg-neutral-800'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${item.state ? 'translate-x-4' : 'translate-x-0'}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: ALWAYS VISIBLE REAL-TIME LIVE PREVIEW STUDIO */}
        <div className="w-full lg:w-7/12 flex flex-col bg-black overflow-hidden relative border-none font-sans">
          {/* Live Studio Header */}
          <div className="p-3 bg-neutral-950 flex items-center justify-between border-none">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Live Preview</span>
            </div>
            <span className="text-[10px] text-neutral-400 font-mono px-2 py-0.5 rounded bg-neutral-900">
              /status/{slug || 'acme-status'}
            </span>
          </div>

          {/* Interactive Live Preview Viewport */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex items-start justify-center relative">
            <div
              style={{ backgroundColor, color: textColor || '#ffffff' }}
              className="w-full p-6 sm:p-8 rounded-2xl border-none space-y-6 shadow-2xl transition-all duration-300 font-sans min-h-[500px] relative overflow-hidden"
            >
              {/* Live SVG Background Pattern Overlay */}
              <StatusPatternOverlay pattern={backgroundPattern} />

              <div className="relative z-10 space-y-6">
                {/* Announcement Notice */}
                {announcementBarText && (
                  <DeletablePreviewItem label="Announcement Notice" onDelete={() => setAnnouncementBarText('')}>
                    <div className={`p-3.5 ${cardRadiusStyle} ${
                      announcementBarType === 'warning'
                        ? 'bg-amber-950/80 text-amber-300'
                        : announcementBarType === 'success'
                        ? 'bg-emerald-950/80 text-emerald-300'
                        : 'bg-rose-950/80 text-rose-300'
                    } text-xs font-medium flex items-center justify-between gap-2 shadow-md`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <Megaphone className="w-4 h-4 shrink-0" />
                        <span className="truncate">{announcementBarText}</span>
                      </div>
                      {announcementBarLink && (
                        <a href={announcementBarLink} target="_blank" rel="noreferrer" className="text-xs font-semibold underline shrink-0">
                          Learn More →
                        </a>
                      )}
                    </div>
                  </DeletablePreviewItem>
                )}

                {/* Maintenance Notice */}
                {maintenanceNotice && (
                  <DeletablePreviewItem label="Maintenance Notice" onDelete={() => setMaintenanceNotice('')}>
                    <div className={`p-3.5 ${cardRadiusStyle} bg-amber-950/80 text-amber-300 text-xs font-medium flex items-center gap-2 shadow-md`}>
                      <Wrench className="w-4 h-4 shrink-0" />
                      <span>{maintenanceNotice}</span>
                    </div>
                  </DeletablePreviewItem>
                )}

                {/* Hero Graphic Artwork or Custom Hero Image URL */}
                {showArtwork && (
                  <DeletablePreviewItem label="Hero Artwork" onDelete={() => setShowArtwork(false)}>
                    {heroImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={heroImageUrl} alt="Hero Banner" className="w-full h-40 sm:h-48 object-cover rounded-2xl shadow-lg border-none" />
                    ) : (
                      <StatusArtwork style={artworkStyle} accentColor={accentColor} />
                    )}
                  </DeletablePreviewItem>
                )}

                {/* Preview Header */}
                {(showTitle || showDescription || showLogo || showHeaderBadge) && (
                  <div className="text-center space-y-3">
                    {(showLogo || showHeaderBadge) && (
                      <div className="flex items-center justify-center gap-2">
                        {showLogo && (
                          <DeletablePreviewItem label="Brand Logo" onDelete={() => setShowLogo(false)} className="inline-block">
                            {logoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={logoUrl} alt="Brand Logo" className="w-10 h-10 object-contain rounded-xl shadow-sm inline-block" />
                            ) : (
                              <span className="text-3xl p-1 block">{logoEmoji || '⚡'}</span>
                            )}
                          </DeletablePreviewItem>
                        )}
                        {showHeaderBadge && customHeaderBadge && (
                          <DeletablePreviewItem label="Header Badge" onDelete={() => setShowHeaderBadge(false)} className="inline-block">
                            <div
                              style={{ color: accentColor, backgroundColor: `${accentColor}15` }}
                              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold uppercase rounded-full"
                            >
                              <Activity className="w-3.5 h-3.5" /> {customHeaderBadge}
                            </div>
                          </DeletablePreviewItem>
                        )}
                      </div>
                    )}

                    {showTitle && (
                      <DeletablePreviewItem label="Page Title" onDelete={() => setShowTitle(false)}>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight p-1">
                          {title || 'Acme System Status'}
                        </h2>
                      </DeletablePreviewItem>
                    )}

                    {showDescription && description && (
                      <DeletablePreviewItem label="Description" onDelete={() => setShowDescription(false)}>
                        <p className="text-xs sm:text-sm opacity-70 leading-relaxed max-w-sm mx-auto p-1">{description}</p>
                      </DeletablePreviewItem>
                    )}
                  </div>
                )}

                {/* Real Data-Driven Telemetry Widget Preview */}
                {showTelemetryWidget && (
                  <DeletablePreviewItem label="Telemetry Cards" onDelete={() => setShowTelemetryWidget(false)}>
                    <StatusTelemetryWidget
                      endpoints={
                        selectedEndpointsList.length > 0
                          ? selectedEndpointsList
                          : [
                              { _id: '1', userId: 'u1', projectName: 'AUTH SERVICE API', url: 'https://auth.api.io/health', method: 'GET', expectedStatusCode: 200, checkIntervalMinutes: 5, batchId: 'b1', status: 'healthy', lastResponseTimeMs: 38, createdAt: '' },
                              { _id: '2', userId: 'u1', projectName: 'PAYMENT GATEWAY', url: 'https://pay.api.io/ping', method: 'POST', expectedStatusCode: 200, checkIntervalMinutes: 5, batchId: 'b1', status: 'healthy', lastResponseTimeMs: 84, createdAt: '' },
                            ]
                      }
                      accentColor={accentColor}
                      cardBg={cardBackgroundColor}
                      showBreakdown={showLatencyBreakdown}
                      showSupport={showSupportLinks}
                      supportEmail={supportEmail}
                      supportDocsUrl={supportDocsUrl}
                      twitterHandle={twitterHandle}
                    />
                  </DeletablePreviewItem>
                )}

                {/* Official Social & Asset Links Strip */}
                {showSupportLinks && (websiteUrl || githubUrl || twitterHandle || supportEmail || supportDocsUrl) && (
                  <DeletablePreviewItem label="Social Asset Links" onDelete={() => setShowSupportLinks(false)}>
                    <div className="flex items-center justify-center gap-3 flex-wrap text-xs pt-1">
                      {websiteUrl && (
                        <a href={websiteUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 text-neutral-300 hover:text-white transition-colors">
                          <Globe className="w-3.5 h-3.5 text-rose-400" /> Website
                        </a>
                      )}
                      {githubUrl && (
                        <a href={githubUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 text-neutral-300 hover:text-white transition-colors">
                          <GithubIcon className="w-3.5 h-3.5 text-white" /> GitHub
                        </a>
                      )}
                      {twitterHandle && (
                        <a href={`https://twitter.com/${twitterHandle}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 text-neutral-300 hover:text-white transition-colors">
                          <TwitterIcon className="w-3.5 h-3.5 text-sky-400" /> @{twitterHandle}
                        </a>
                      )}
                      {supportEmail && (
                        <a href={`mailto:${supportEmail}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 text-neutral-300 hover:text-white transition-colors">
                          <Mail className="w-3.5 h-3.5 text-emerald-400" /> Email Support
                        </a>
                      )}
                      {supportDocsUrl && (
                        <a href={supportDocsUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 text-neutral-300 hover:text-white transition-colors">
                          <FileText className="w-3.5 h-3.5 text-amber-400" /> Docs
                        </a>
                      )}
                    </div>
                  </DeletablePreviewItem>
                )}

                {/* Preview Banner */}
                {showBanner && (
                  <DeletablePreviewItem label="Status Banner" onDelete={() => setShowBanner(false)}>
                    <div
                      style={{ backgroundColor: cardBackgroundColor }}
                      className={`p-4 ${cardRadiusStyle} flex items-center gap-3.5 shadow-md border-none`}
                    >
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                      <div>
                        <h4 className="text-xs sm:text-sm font-semibold text-white">
                          {customBannerMessage || 'All Systems Operational'}
                        </h4>
                        <span className="text-[10px] text-neutral-400 font-mono">Last checked: Just now</span>
                      </div>
                    </div>
                  </DeletablePreviewItem>
                )}

                {/* Preview Monitored Services */}
                <div className="space-y-4">
                  {showServicesHeader && (
                    <DeletablePreviewItem label="Services Header" onDelete={() => setShowServicesHeader(false)}>
                      <div className="flex items-center justify-between border-b border-neutral-900 pb-2 text-xs font-semibold text-neutral-400">
                        <span>Monitored Services ({selectedEndpointsList.length || 2})</span>
                        <span className="text-[11px] font-mono">Live</span>
                      </div>
                    </DeletablePreviewItem>
                  )}

                  {(selectedEndpointsList.length > 0 ? selectedEndpointsList : [
                    { _id: '1', projectName: 'AUTH SERVICE API', url: 'https://auth.api.io/health', status: 'healthy', lastResponseTimeMs: 38 },
                    { _id: '2', projectName: 'PAYMENT GATEWAY', url: 'https://pay.api.io/ping', status: 'healthy', lastResponseTimeMs: 84 },
                  ]).map((ep, i) => (
                    <div
                      key={ep._id || i}
                      style={{ backgroundColor: cardBackgroundColor }}
                      className={`p-4 ${cardRadiusStyle} space-y-3 shadow-md border-none`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="text-xs font-semibold text-white block">{ep.projectName}</span>
                          {showServiceUrls && (
                            <DeletablePreviewItem label="Service URL" onDelete={() => setShowServiceUrls(false)}>
                              <span className="text-[11px] font-mono text-neutral-400 truncate block max-w-[240px]">{ep.url}</span>
                            </DeletablePreviewItem>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          {showMetrics && ep.lastResponseTimeMs && (
                            <DeletablePreviewItem label="Latency MS Metric" onDelete={() => setShowMetrics(false)}>
                              <span className="text-xs text-neutral-400 flex items-center gap-1 font-mono">
                                <Clock className="w-3.5 h-3.5 text-rose-400" /> {ep.lastResponseTimeMs}ms
                              </span>
                            </DeletablePreviewItem>
                          )}
                          {showServiceStatusBadge && (
                            <DeletablePreviewItem label="Status Badge" onDelete={() => setShowServiceStatusBadge(false)}>
                              <span className={`px-3 py-1 bg-emerald-950/80 text-emerald-400 ${cardRadiusStyle} text-[11px] font-medium block`}>
                                {formatPreviewBadge(ep.status)}
                              </span>
                            </DeletablePreviewItem>
                          )}
                        </div>
                      </div>

                      {/* 30-Day History Bars Preview */}
                      {showHistoryBars && (
                        <DeletablePreviewItem label="30-Day Timeline Bars" onDelete={() => setShowHistoryBars(false)}>
                          <div className="pt-2 border-t border-neutral-900">
                            <IncidentTimeline incidents={[]} endpointStatus={(ep.status as any) || 'healthy'} />
                          </div>
                        </DeletablePreviewItem>
                      )}
                    </div>
                  ))}
                </div>

                {/* Footer Preview */}
                {showFooter && (
                  <DeletablePreviewItem label="Footer Credit" onDelete={() => setShowFooter(false)}>
                    <div className="text-center text-xs text-neutral-500 pt-6 border-t border-neutral-900">
                      {customFooterText || 'Powered by WakeUp Monitoring'}
                    </div>
                  </DeletablePreviewItem>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StatusBuilderStudioPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-neutral-100 flex items-center justify-center p-6 font-sans">
          <div className="flex items-center gap-2 text-rose-400 text-xs">
            <Activity className="w-4 h-4 text-rose-400 animate-spin" /> Initializing Studio...
          </div>
        </div>
      }
    >
      <StatusBuilderContent />
    </Suspense>
  );
}
