import { Schema, model, Document, Types } from 'mongoose';

export interface IStatusPageCustomization {
  themePreset?: string;
  artworkStyle?: string;
  artworkPosition?: string;
  heroHeaderStyle?: string;
  logoEmoji?: string;
  logoUrl?: string;
  heroImageUrl?: string;
  websiteUrl?: string;
  githubUrl?: string;
  backgroundPattern?: string;
  fontFamily?: string;
  layoutStyle?: string;
  cardRadiusStyle?: string;
  announcementBarText?: string;
  announcementBarLink?: string;
  announcementBarType?: string;
  maintenanceNotice?: string;
  supportEmail?: string;
  supportDocsUrl?: string;
  twitterHandle?: string;
  statusBadgeStyle?: string;
  customHealthyText?: string;
  customDegradedText?: string;
  customDownText?: string;
  backgroundColor?: string;
  cardBackgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  fontSize?: string;
  customHeaderBadge?: string;
  customBannerMessage?: string;
  showLogo?: boolean;
  showHeaderBadge?: boolean;
  showTitle?: boolean;
  showDescription?: boolean;
  showBanner?: boolean;
  showIncidents?: boolean;
  showHistoryBars?: boolean;
  showMetrics?: boolean;
  showServicesHeader?: boolean;
  showServiceUrls?: boolean;
  showServiceStatusBadge?: boolean;
  showFooter?: boolean;
  showArtwork?: boolean;
  showTelemetryWidget?: boolean;
  showLatencyBreakdown?: boolean;
  showSupportLinks?: boolean;
  showReactions?: boolean;
  customFooterText?: string;
}

export interface IStatusPage extends Document {
  _id: Types.ObjectId;
  userId: string;
  title: string;
  slug: string;
  description?: string;
  endpointIds: Types.ObjectId[];
  isPublic: boolean;
  customization?: IStatusPageCustomization;
  createdAt: Date;
  updatedAt: Date;
}

const statusPageSchema = new Schema<IStatusPage>(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    description: { type: String, default: '' },
    endpointIds: [{ type: Schema.Types.ObjectId, ref: 'Endpoint' }],
    isPublic: { type: Boolean, default: true },
    customization: {
      themePreset: { type: String, default: 'cyberpunk' },
      artworkStyle: { type: String, default: 'synthwave_sun' },
      artworkPosition: { type: String, default: 'top_hero' },
      heroHeaderStyle: { type: String, default: 'real_telemetry' },
      logoEmoji: { type: String, default: '⚡' },
      logoUrl: { type: String, default: '' },
      heroImageUrl: { type: String, default: '' },
      websiteUrl: { type: String, default: '' },
      githubUrl: { type: String, default: '' },
      backgroundPattern: { type: String, default: 'grid' },
      fontFamily: { type: String, default: 'mono' },
      layoutStyle: { type: String, default: 'standard' },
      cardRadiusStyle: { type: String, default: 'rounded-xl' },
      announcementBarText: { type: String, default: '' },
      announcementBarLink: { type: String, default: '' },
      announcementBarType: { type: String, default: 'info' },
      maintenanceNotice: { type: String, default: '' },
      supportEmail: { type: String, default: '' },
      supportDocsUrl: { type: String, default: '' },
      twitterHandle: { type: String, default: '' },
      statusBadgeStyle: { type: String, default: 'standard' },
      customHealthyText: { type: String, default: '' },
      customDegradedText: { type: String, default: '' },
      customDownText: { type: String, default: '' },
      backgroundColor: { type: String, default: '#050505' },
      cardBackgroundColor: { type: String, default: '#0d0d0d' },
      textColor: { type: String, default: '#ffffff' },
      accentColor: { type: String, default: '#f43f5e' },
      fontSize: { type: String, default: 'standard' },
      customHeaderBadge: { type: String, default: 'PUBLIC STATUS MONITOR' },
      customBannerMessage: { type: String, default: 'ALL SYSTEMS OPERATIONAL' },
      showLogo: { type: Boolean, default: true },
      showHeaderBadge: { type: Boolean, default: true },
      showTitle: { type: Boolean, default: true },
      showDescription: { type: Boolean, default: true },
      showBanner: { type: Boolean, default: true },
      showIncidents: { type: Boolean, default: true },
      showHistoryBars: { type: Boolean, default: true },
      showMetrics: { type: Boolean, default: true },
      showServicesHeader: { type: Boolean, default: true },
      showServiceUrls: { type: Boolean, default: true },
      showServiceStatusBadge: { type: Boolean, default: true },
      showFooter: { type: Boolean, default: true },
      showArtwork: { type: Boolean, default: true },
      showTelemetryWidget: { type: Boolean, default: true },
      showLatencyBreakdown: { type: Boolean, default: true },
      showSupportLinks: { type: Boolean, default: true },
      showReactions: { type: Boolean, default: true },
      customFooterText: { type: String, default: 'POWERED BY WAKEUP MONITORING' },
    },
  },
  {
    timestamps: true,
  }
);

export const StatusPageModel = model<IStatusPage>('StatusPage', statusPageSchema);
