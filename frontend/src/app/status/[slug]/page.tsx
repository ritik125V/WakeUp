'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Activity, Clock, Megaphone, Wrench, ExternalLink, Globe } from 'lucide-react';
import { fetchPublicStatusPage, PublicStatusPageResponse, StatusPageCustomization } from '@/lib/api';
import { IncidentTimeline } from '@/components/IncidentTimeline';
import { StatusArtwork, StatusPatternOverlay } from '@/components/StatusArtwork';
import { StatusTelemetryWidget } from '@/components/StatusTelemetry';
import { PublicStatusSkeleton } from '@/components/Skeleton';

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

export default function PublicStatusPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [data, setData] = useState<PublicStatusPageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Record<string, number>>({
    '🗿': 420,
    '🔥': 890,
    '💯': 1337,
    '💀': 69,
    '⚡': 999,
  });

  const handleReact = (emoji: string) => {
    setReactions((prev) => ({ ...prev, [emoji]: (prev[emoji] || 0) + 1 }));
  };

  useEffect(() => {
    if (!slug) return;
    fetchPublicStatusPage(slug)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Failed to load status page');
        }
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-neutral-100 flex items-center justify-center p-6 font-mono relative">
        <PublicStatusSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-black text-neutral-100 flex items-center justify-center p-6 font-mono">
        <div className="p-6 max-w-md bg-neutral-950 rounded-lg text-center space-y-2">
          <AlertTriangle className="w-8 h-8 text-rose-300 mx-auto" />
          <h2 className="text-sm font-bold uppercase text-white">STATUS PAGE NOT FOUND</h2>
          <p className="text-xs text-neutral-400">{error || 'This status page does not exist or is private.'}</p>
        </div>
      </div>
    );
  }

  const custom: StatusPageCustomization = data.customization || {
    themePreset: 'cyberpunk',
    artworkStyle: 'synthwave_sun',
    artworkPosition: 'top_hero',
    logoEmoji: '⚡',
    logoUrl: '',
    backgroundPattern: 'grid',
    fontFamily: 'mono',
    layoutStyle: 'standard',
    announcementBarText: '',
    announcementBarType: 'info',
    backgroundColor: '#050505',
    cardBackgroundColor: '#0d0d0d',
    textColor: '#ffffff',
    accentColor: '#f43f5e',
    fontSize: 'standard',
    customHeaderBadge: 'PUBLIC STATUS MONITOR',
    customBannerMessage: 'ALL SYSTEMS OPERATIONAL',
    showBanner: true,
    showIncidents: true,
    showHistoryBars: true,
    showMetrics: true,
    showFooter: true,
    showArtwork: true,
    showTelemetryWidget: true,
    showLatencyBreakdown: true,
    showSupportLinks: true,
    showReactions: true,
    customFooterText: 'POWERED BY WAKEUP MONITORING',
  };

  const isGenz = custom.fontSize === 'genz_display';
  const isLarge = custom.fontSize === 'large';
  const isCompact = custom.fontSize === 'compact';

  const titleClass = isGenz
    ? 'text-3xl sm:text-5xl font-extrabold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white via-rose-300 to-rose-500'
    : isLarge
    ? 'text-2xl sm:text-4xl font-bold tracking-wide'
    : isCompact
    ? 'text-lg sm:text-xl font-bold'
    : 'text-2xl sm:text-3xl font-bold uppercase';

  const fontClass =
    custom.fontFamily === 'sans'
      ? 'font-sans'
      : custom.fontFamily === 'display'
      ? 'font-sans tracking-wide'
      : custom.fontFamily === 'code'
      ? 'font-mono'
      : 'font-mono';

  const bgStyle = {
    backgroundColor: custom.backgroundColor || '#050505',
    color: custom.textColor || '#ffffff',
  };

  const cardStyle = {
    backgroundColor: custom.cardBackgroundColor || '#0d0d0d',
  };

  const accentColor = custom.accentColor || '#f43f5e';
  const radiusClass = custom.cardRadiusStyle || 'rounded-xl';

  const formatStatusBadgeText = (status: string) => {
    if (custom.statusBadgeStyle === 'custom_text') {
      if (status === 'healthy') return custom.customHealthyText || 'OPERATIONAL ⚡';
      if (status === 'down') return custom.customDownText || 'DOWN 💀';
      return custom.customDegradedText || 'DEGRADED ⚠️';
    }
    if (custom.statusBadgeStyle === 'genz_slang') {
      return status === 'healthy' ? 'CRACKED 💯' : status === 'down' ? 'DOWN BAD 💀' : 'SLIPPIN 😬';
    }
    if (custom.statusBadgeStyle === 'meme_cooking') {
      return status === 'healthy' ? 'COOKING 🔥' : status === 'down' ? 'COOKED 😭' : 'SIMMERING ♨️';
    }
    if (custom.statusBadgeStyle === 'gamer') {
      return status === 'healthy' ? 'PLAYER 1 ALIVE 🎮' : status === 'down' ? 'GAME OVER 💀' : 'LAGGING 🐢';
    }
    if (custom.statusBadgeStyle === 'chad') {
      return status === 'healthy' ? 'CHAD STATUS 🗿' : status === 'down' ? 'R.I.P. SERVER 🪦' : 'MID STATUS 😐';
    }
    if (custom.statusBadgeStyle === 'kawaii_slang') {
      return status === 'healthy' ? 'SUGOI ✨' : status === 'down' ? 'K.O. 💥' : 'NYAN 😿';
    }
    if (custom.statusBadgeStyle === 'doge_slang') {
      return status === 'healthy' ? 'VERY ONLINE 🐕' : status === 'down' ? 'SUCH BROKEN 💥' : 'MUCH SLOW 🐢';
    }
    return status.toUpperCase();
  };

  return (
    <div
      style={bgStyle}
      className={`min-h-screen flex flex-col items-center justify-start p-4 sm:p-8 relative ${fontClass} transition-colors duration-300`}
    >
      {/* Background SVG Tech Pattern Overlay */}
      <StatusPatternOverlay pattern={custom.backgroundPattern || 'grid'} />

      <div className="w-full max-w-3xl space-y-6 my-6 z-10">
        {/* Optional Global Announcement Bar */}
        {custom.announcementBarText && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-3 ${radiusClass} flex items-center justify-between gap-3 text-xs font-bold ${
              custom.announcementBarType === 'warning'
                ? 'bg-amber-950/80 text-amber-300'
                : custom.announcementBarType === 'success'
                ? 'bg-emerald-950/80 text-emerald-300'
                : 'bg-rose-950/80 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-3 flex-1">
              <Megaphone className="w-4 h-4 shrink-0" />
              <span>{custom.announcementBarText}</span>
            </div>
            {custom.announcementBarLink && (
              <a
                href={custom.announcementBarLink}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:opacity-80 transition-opacity shrink-0 flex items-center gap-1"
              >
                Learn More <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </motion.div>
        )}

        {/* Scheduled Maintenance Notice */}
        {custom.maintenanceNotice && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 ${radiusClass} bg-amber-950/40 text-amber-200 text-xs space-y-1`}
          >
            <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-amber-400">
              <Wrench className="w-4 h-4" /> SCHEDULED MAINTENANCE NOTICE
            </div>
            <p className="leading-relaxed opacity-90">{custom.maintenanceNotice}</p>
          </motion.div>
        )}

        {/* Hero Artwork Graphic or Custom Hero Image Banner */}
        {custom.showArtwork !== false && (custom.artworkPosition === 'top_hero' || !custom.artworkPosition) && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            {custom.heroImageUrl ? (
              <div className={`overflow-hidden ${radiusClass} bg-neutral-900/50 shadow-lg`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={custom.heroImageUrl} alt="Hero Banner" className="w-full h-44 sm:h-56 object-cover" />
              </div>
            ) : (
              <StatusArtwork style={custom.artworkStyle || 'synthwave_sun'} accentColor={accentColor} />
            )}
          </motion.div>
        )}

        {/* Header Section */}
        {(custom.showTitle !== false || custom.showDescription !== false || custom.showLogo !== false || custom.showHeaderBadge !== false) && (
          <div className="text-center space-y-3">
            {(custom.showLogo !== false || custom.showHeaderBadge !== false) && (
              <div className="flex items-center justify-center gap-2">
                {custom.showLogo !== false && (custom.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={custom.logoUrl} alt="Logo" className="w-9 h-9 object-contain rounded-lg" />
                ) : custom.logoEmoji ? (
                  <span className="text-3xl">{custom.logoEmoji}</span>
                ) : null)}

                {custom.showHeaderBadge !== false && custom.customHeaderBadge && (
                  <div
                    style={{ color: accentColor, backgroundColor: `${accentColor}15` }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs uppercase font-bold rounded-full"
                  >
                    <Activity className="w-3.5 h-3.5" style={{ color: accentColor }} />
                    {custom.customHeaderBadge}
                  </div>
                )}
              </div>
            )}

            {custom.showTitle !== false && (
              <h1 className={titleClass} style={{ color: custom.textColor || '#ffffff' }}>
                {data.title}
              </h1>
            )}

            {custom.showDescription !== false && data.description && (
              <p className="text-xs sm:text-sm max-w-lg mx-auto opacity-70 leading-relaxed">
                {data.description}
              </p>
            )}

            {/* Official Brand Links */}
            {(custom.websiteUrl || custom.githubUrl || custom.supportDocsUrl) && (
              <div className="flex items-center justify-center gap-4 pt-1">
                {custom.websiteUrl && (
                  <a
                    href={custom.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-neutral-400 hover:text-white flex items-center gap-1.5 transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5" /> Website
                  </a>
                )}
                {custom.githubUrl && (
                  <a
                    href={custom.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-neutral-400 hover:text-white flex items-center gap-1.5 transition-colors"
                  >
                    <GithubIcon className="w-3.5 h-3.5" /> GitHub
                  </a>
                )}
                {custom.supportDocsUrl && (
                  <a
                    href={custom.supportDocsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-neutral-400 hover:text-white flex items-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Docs
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* Real Data-Driven Telemetry Widget */}
        {custom.showTelemetryWidget !== false && (
          <StatusTelemetryWidget
            endpoints={data.endpoints}
            incidents={data.activeIncidents}
            accentColor={accentColor}
            cardBg={custom.cardBackgroundColor || '#0d0d0d'}
            showBreakdown={custom.showLatencyBreakdown !== false}
            showSupport={custom.showSupportLinks !== false}
            supportEmail={custom.supportEmail}
            supportDocsUrl={custom.supportDocsUrl}
            twitterHandle={custom.twitterHandle}
          />
        )}

        {/* Overall Status Banner */}
        {custom.showBanner !== false && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={cardStyle}
            className={`p-4 ${radiusClass} flex items-center gap-3.5 shadow-lg border-none`}
          >
            {data.overallStatus === 'ALL_SYSTEMS_OPERATIONAL' ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0" />
            )}
            <div>
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wide">
                {data.overallStatus === 'ALL_SYSTEMS_OPERATIONAL'
                  ? custom.customBannerMessage || 'ALL SYSTEMS OPERATIONAL'
                  : 'DEGRADED PERFORMANCE DETECTED'}
              </h2>
              <p className="text-[11px] opacity-50 mt-0.5 uppercase">
                LAST CHECKED: {new Date(data.lastUpdated).toLocaleTimeString()}
              </p>
            </div>
          </motion.div>
        )}

        {/* Monitored Services List */}
        <div className="space-y-4">
          {custom.showServicesHeader !== false && (
            <div className="flex items-center justify-between border-b border-neutral-900 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider opacity-60">
                MONITORED SERVICES ({data.endpoints.length})
              </h3>
              <span className="text-[10px] opacity-40 uppercase">LIVE FEED</span>
            </div>
          )}

          <div className="space-y-3">
            {data.endpoints.map((ep) => {
              const epIncidents = data.incidentsMap ? data.incidentsMap[ep._id] || [] : [];

              return (
                <div key={ep._id} style={cardStyle} className={`p-4 ${radiusClass} space-y-3 shadow-md border-none`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm uppercase tracking-wide">{ep.projectName}</h4>
                      {custom.showServiceUrls !== false && (
                        <span className="text-xs opacity-60 truncate block max-w-sm sm:max-w-md">{ep.url}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {custom.showMetrics !== false && ep.lastResponseTimeMs && (
                        <span className="text-xs opacity-60 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-rose-300" /> {ep.lastResponseTimeMs}MS
                        </span>
                      )}

                      {custom.showServiceStatusBadge !== false && (
                        <span
                          className={`px-3 py-1 text-[10px] font-bold uppercase ${radiusClass} ${
                            ep.status === 'healthy'
                              ? 'bg-emerald-950/80 text-emerald-400'
                              : ep.status === 'down'
                              ? 'bg-rose-950/80 text-rose-300'
                              : 'bg-neutral-900 text-neutral-300'
                          }`}
                        >
                          {formatStatusBadgeText(ep.status)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 30-Day History Bar */}
                  {custom.showHistoryBars !== false && (
                    <div className="pt-2 border-t border-neutral-900">
                      <IncidentTimeline incidents={epIncidents} endpointStatus={ep.status as any} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Incidents Section */}
        {custom.showIncidents !== false && data.activeIncidents && data.activeIncidents.length > 0 && (
          <div className="space-y-3 pt-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 border-b border-rose-900 pb-1 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" /> ACTIVE INCIDENTS
            </h3>
            <div className="space-y-2">
              {data.activeIncidents.map((inc) => (
                <div
                  key={inc._id}
                  style={cardStyle}
                  className={`p-4 ${radiusClass} space-y-1 text-xs border-none`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-300 uppercase">{inc.projectName}</span>
                    <span className="text-[10px] opacity-50">{new Date(inc.startedAt).toLocaleString()}</span>
                  </div>
                  <p className="font-bold text-white uppercase">{inc.errorMessage}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Custom Footer */}
        {custom.showFooter !== false && (
          <div className="text-center pt-8 border-t border-neutral-900 opacity-50 space-y-1">
            <p className="text-[11px] uppercase tracking-widest">
              {custom.customFooterText || 'POWERED BY WAKEUP MONITORING'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
