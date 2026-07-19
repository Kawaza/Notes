import type { ReactNode } from 'react';
import type { SimpleIcon } from 'simple-icons';
import {
  siAirbnb,
  siAirtable,
  siAnthropic,
  siAsana,
  siBehance,
  siBluesky,
  siCalendly,
  siClickup,
  siCloudflare,
  siConfluence,
  siDatabricks,
  siDatadog,
  siDiscord,
  siDocker,
  siDribbble,
  siDropbox,
  siEbay,
  siEtsy,
  siFacebook,
  siFigma,
  siFirebase,
  siGitlab,
  siGithub,
  siGmail,
  siGoogle,
  siGooglecalendar,
  siGoogledocs,
  siGoogledrive,
  siGoogleforms,
  siGooglemeet,
  siGooglesheets,
  siGoogleslides,
  siHubspot,
  siInstagram,
  siJira,
  siLinear,
  siLoom,
  siMailchimp,
  siMedium,
  siMiro,
  siMongodb,
  siNetflix,
  siNetlify,
  siNotion,
  siNpm,
  siObsidian,
  siPaypal,
  siPinterest,
  siReddit,
  siShopify,
  siShopware,
  siSnapchat,
  siSnowflake,
  siSpotify,
  siSquarespace,
  siStripe,
  siSupabase,
  siTelegram,
  siThreads,
  siTiktok,
  siTodoist,
  siTrello,
  siTwitch,
  siTypeform,
  siVercel,
  siWhatsapp,
  siWikipedia,
  siWix,
  siWordpress,
  siX,
  siYoutube,
  siZapier,
  siZoom,
} from 'simple-icons';
import { Globe, Mail } from 'lucide-react';

export type LinkServiceId = string;

export interface LinkServiceInfo {
  id: LinkServiceId;
  label: string;
  bg: string;
}

type CustomIconId =
  | 'linkedin'
  | 'slack'
  | 'amazon'
  | 'aws'
  | 'microsoft'
  | 'outlook'
  | 'onedrive'
  | 'canva'
  | 'salesforce'
  | 'monday'
  | 'apple';

interface ServiceRule {
  id: LinkServiceId;
  label?: string;
  icon?: SimpleIcon;
  custom?: CustomIconId;
  bg?: string;
  match: (host: string, path: string) => boolean;
}

function BrandIcon({ icon, size }: { icon: SimpleIcon; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path fill={`#${icon.hex}`} d={icon.path} />
    </svg>
  );
}

function CustomSvg({ size, children }: { size: number; children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      {children}
    </svg>
  );
}

const CUSTOM_ICONS: Record<CustomIconId, (size: number) => ReactNode> = {
  linkedin: (size) => (
    <CustomSvg size={size}>
      <rect x="2" y="2" width="20" height="20" rx="2" fill="#0A66C2" />
      <path fill="#fff" d="M7 10v7H5v-7h2zm1-3a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0zM19 17v-4.2c0-2.2-1.2-3.2-2.8-3.2-1.3 0-1.9.7-2.2 1.4V10h-2.2v7h2.2v-3.9c0-1 .2-2 1.5-2s1.3 1.9 1.3 3V17H19z" />
    </CustomSvg>
  ),
  slack: (size) => (
    <CustomSvg size={size}>
      <path fill="#E01E5A" d="M5.5 14.5a1.75 1.75 0 1 1 0-3.5H7V9.5H5.5a1.75 1.75 0 1 1 0-3.5H7v3.5h3.5V7H7.25A1.75 1.75 0 0 1 5.5 5.5V7H2v3.5h3.5V14.5z" />
      <path fill="#36C5F0" d="M9.5 5.5a1.75 1.75 0 1 1 3.5 0V7h3.5V5.5a1.75 1.75 0 1 1 3.5 0V7h-3.5v3.5H17a1.75 1.75 0 1 1 0 3.5h-3.5V17a1.75 1.75 0 1 1-3.5 0v-3.5H9.5V17a1.75 1.75 0 0 1-3.5 0v-3.5H9.5V9.5H7.25A1.75 1.75 0 0 1 5.5 7.75V9.5H9.5V5.5z" />
    </CustomSvg>
  ),
  amazon: (size) => (
    <CustomSvg size={size}>
      <path fill="#FF9900" d="M14.5 18.5c-4.8 3.5-11.8 5.4-17.8 5.4-.7 0-1.4 0-2.1-.1-.4 0-.7-.4-.6-.8.1-.3.4-.5.7-.5 5.6.2 11-.9 15.5-3.8.3-.2.7 0 .8.3.1.3 0 .7-.3.9z" />
      <path fill="#221F1F" d="M6.5 11.5c0-2.8 2.2-5 5-5s5 2.2 5 5-2.2 5-5 5-5-2.2-5-5zm8 0c0-1.7-1.3-3-3-3s-3 1.3-3 3 1.3 3 3 3 3-1.3 3-3z" transform="translate(0 2)" />
    </CustomSvg>
  ),
  aws: (size) => (
    <CustomSvg size={size}>
      <path fill="#FF9900" d="M6 17c4 2 8 2 12 0l-1.5-1c-3 1.5-6 1.5-9 0L6 17z" />
      <ellipse cx="12" cy="8" rx="5.5" ry="4" fill="#252F3E" />
    </CustomSvg>
  ),
  microsoft: (size) => (
    <CustomSvg size={size}>
      <rect x="3" y="3" width="8" height="8" fill="#F25022" />
      <rect x="13" y="3" width="8" height="8" fill="#7FBA00" />
      <rect x="3" y="13" width="8" height="8" fill="#00A4EF" />
      <rect x="13" y="13" width="8" height="8" fill="#FFB900" />
    </CustomSvg>
  ),
  outlook: (size) => (
    <CustomSvg size={size}>
      <rect x="2" y="5" width="20" height="14" rx="2" fill="#0078D4" />
      <path fill="#fff" d="M7 9h10v2H7V9zm0 4h7v2H7v-2z" />
    </CustomSvg>
  ),
  onedrive: (size) => (
    <CustomSvg size={size}>
      <path fill="#0078D4" d="M18.5 8.5A4.5 4.5 0 0 0 9 6.5 4 4 0 0 0 2 10.5 3.5 3.5 0 0 0 5.5 14H18a3.5 3.5 0 0 0 .5-7 3 3 0 0 0-.5-1.5z" />
    </CustomSvg>
  ),
  canva: (size) => (
    <CustomSvg size={size}>
      <circle cx="12" cy="12" r="10" fill="#00C4CC" />
      <circle cx="8" cy="10" r="2.5" fill="#7D2AE8" />
      <circle cx="14" cy="8" r="2" fill="#fff" />
      <circle cx="15" cy="14" r="2.5" fill="#fff" />
    </CustomSvg>
  ),
  salesforce: (size) => (
    <CustomSvg size={size}>
      <path fill="#00A1E0" d="M12 3c-2.5 0-4.7 1.2-6.1 3.1C6.9 5.4 7.9 5 9 5c2.2 0 4 1.5 4.6 3.5C14.8 7.2 16.5 6 18.5 6 20.4 6 22 7.2 22.5 9 21.2 5.8 18 3 12 3z" />
      <path fill="#00A1E0" d="M4 12c0-3.3 2.7-6 6-6 1.8 0 3.4.8 4.5 2.1.8-2.5 3.1-4.1 5.8-4.1 2.2 0 4.1 1.2 5.1 3-3.5-1.5-7.6.3-9.1 3.8C14.8 8.2 13.5 7.5 12 7.5 9 7.5 6.5 10 6.5 13S9 18.5 12 18.5s5.5-2.5 5.5-5.5c1.5 3.5 5.6 5.3 9.1 3.8-1.8 3.2-5.2 5.2-9 5.2-5.5 0-10-4.5-10-10z" opacity="0.85" />
    </CustomSvg>
  ),
  monday: (size) => (
    <CustomSvg size={size}>
      <circle cx="7" cy="12" r="4" fill="#FF3D57" />
      <circle cx="12" cy="12" r="4" fill="#FFCB00" />
      <circle cx="17" cy="12" r="4" fill="#00CA72" />
    </CustomSvg>
  ),
  apple: (size) => (
    <CustomSvg size={size}>
      <path
        fill="currentColor"
        d="M16.13 12.73c-.03-2.87 2.35-4.25 2.45-4.31-1.33-1.95-3.41-2.22-4.15-2.25-1.77-.18-3.45 1.04-4.35 1.04-.91 0-2.31-1.02-3.8-.99-1.95.03-3.76 1.14-4.77 2.89-2.03 3.52-.52 8.73 1.46 11.59 1 1.44 2.18 3.06 3.73 3 1.5-.06 2.07-.97 3.88-.97 1.81 0 2.32.97 3.89.94 1.61-.03 2.63-1.47 3.61-2.91 1.14-1.66 1.61-3.27 1.64-3.35-.04-.02-3.15-1.21-3.18-4.79zM13.64 5.2c.82-1 1.37-2.38 1.22-3.76-1.18.05-2.61.79-3.46 1.79-.76.88-1.42 2.29-1.24 3.64 1.31.1 2.65-.66 3.48-1.67z"
      />
    </CustomSvg>
  ),
};

const DARK_ICON_BG = 'bg-foreground/5';

/** Ordered rules — first match wins. More specific hosts before generic ones. */
const SERVICE_RULES: ServiceRule[] = [
  { id: 'google-drive', icon: siGoogledrive, match: (h) => h === 'drive.google.com' },
  { id: 'google-sheets', icon: siGooglesheets, match: (h, p) => h === 'docs.google.com' && p.includes('/spreadsheets') },
  { id: 'google-slides', icon: siGoogleslides, match: (h, p) => h === 'docs.google.com' && p.includes('/presentation') },
  { id: 'google-forms', icon: siGoogleforms, match: (h, p) => h === 'docs.google.com' && p.includes('/forms') },
  { id: 'google-docs', icon: siGoogledocs, match: (h) => h === 'docs.google.com' },
  { id: 'google-meet', icon: siGooglemeet, match: (h) => h === 'meet.google.com' },
  { id: 'google-calendar', icon: siGooglecalendar, match: (h) => h === 'calendar.google.com' },
  { id: 'gmail', icon: siGmail, match: (h) => h === 'mail.google.com' },
  { id: 'youtube', icon: siYoutube, match: (h) => h === 'youtube.com' || h === 'youtu.be' || h === 'music.youtube.com' },
  { id: 'google', icon: siGoogle, match: (h) => h === 'google.com' },

  { id: 'github', icon: siGithub, bg: DARK_ICON_BG, match: (h) => h === 'github.com' || h === 'gist.github.com' },
  { id: 'gitlab', icon: siGitlab, match: (h) => h === 'gitlab.com' },
  { id: 'notion', icon: siNotion, bg: DARK_ICON_BG, match: (h) => h === 'notion.so' || h.endsWith('.notion.site') },
  { id: 'figma', icon: siFigma, match: (h) => h === 'figma.com' },
  { id: 'slack', custom: 'slack', match: (h) => h.endsWith('slack.com') },
  { id: 'discord', icon: siDiscord, match: (h) => h === 'discord.com' || h === 'discord.gg' || h.endsWith('.discord.com') },
  { id: 'dropbox', icon: siDropbox, match: (h) => h === 'dropbox.com' },
  { id: 'onedrive', custom: 'onedrive', match: (h) => h === 'onedrive.live.com' || h.endsWith('sharepoint.com') },
  { id: 'outlook', custom: 'outlook', match: (h) => h === 'outlook.live.com' || h === 'outlook.office.com' || h === 'outlook.office365.com' },
  { id: 'microsoft', custom: 'microsoft', match: (h) => h.endsWith('office.com') || h.endsWith('microsoft.com') || h.endsWith('live.com') },
  { id: 'trello', icon: siTrello, match: (h) => h === 'trello.com' },
  { id: 'asana', icon: siAsana, match: (h) => h === 'asana.com' },
  { id: 'linear', icon: siLinear, bg: DARK_ICON_BG, match: (h) => h === 'linear.app' },
  { id: 'confluence', icon: siConfluence, match: (h, p) => h.endsWith('atlassian.net') && p.includes('/wiki') },
  { id: 'jira', icon: siJira, match: (h) => h.endsWith('atlassian.net') || h.endsWith('jira.com') },
  { id: 'aws', custom: 'aws', match: (h) => h.endsWith('aws.amazon.com') || h === 'console.aws.amazon.com' || h === 'aws.amazon.com' },
  { id: 'apple', custom: 'apple', bg: DARK_ICON_BG, match: (h) => h === 'icloud.com' || h === 'apple.com' },

  {
    id: 'shopify',
    icon: siShopify,
    bg: 'bg-[#95BF47]/10',
    match: (h) => h === 'shopify.com' || h.endsWith('.myshopify.com') || h === 'admin.shopify.com' || h === 'partners.shopify.com',
  },
  { id: 'shopware', icon: siShopware, match: (h) => h === 'shopware.com' || h.endsWith('.shopware.store') },
  { id: 'stripe', icon: siStripe, match: (h) => h === 'stripe.com' || h === 'dashboard.stripe.com' },
  { id: 'paypal', icon: siPaypal, match: (h) => h === 'paypal.com' || h.endsWith('.paypal.com') },
  { id: 'squarespace', icon: siSquarespace, bg: DARK_ICON_BG, match: (h) => h === 'squarespace.com' || h.endsWith('.squarespace.com') },
  { id: 'wix', icon: siWix, match: (h) => h === 'wix.com' || h.endsWith('.wixsite.com') },
  { id: 'wordpress', icon: siWordpress, match: (h) => h === 'wordpress.com' || h.endsWith('.wordpress.com') },
  { id: 'etsy', icon: siEtsy, match: (h) => h === 'etsy.com' },
  { id: 'ebay', icon: siEbay, match: (h) => h === 'ebay.com' || h.endsWith('.ebay.com') },
  { id: 'amazon', custom: 'amazon', match: (h) => h === 'amazon.com' || h.endsWith('.amazon.com') || /^amazon\./.test(h) },

  { id: 'vercel', icon: siVercel, bg: DARK_ICON_BG, match: (h) => h === 'vercel.com' || h.endsWith('.vercel.app') },
  { id: 'netlify', icon: siNetlify, match: (h) => h === 'netlify.com' || h.endsWith('.netlify.app') },
  { id: 'cloudflare', icon: siCloudflare, match: (h) => h === 'cloudflare.com' || h.endsWith('.cloudflare.com') },
  { id: 'supabase', icon: siSupabase, match: (h) => h === 'supabase.com' || h.endsWith('.supabase.co') },
  { id: 'firebase', icon: siFirebase, match: (h) => h === 'firebase.google.com' || h.endsWith('.firebaseapp.com') || h.endsWith('.web.app') },
  { id: 'mongodb', icon: siMongodb, match: (h) => h === 'mongodb.com' || h.endsWith('.mongodb.com') || h === 'cloud.mongodb.com' },
  { id: 'docker', icon: siDocker, match: (h) => h === 'docker.com' || h === 'hub.docker.com' },
  { id: 'npm', icon: siNpm, match: (h) => h === 'npmjs.com' || h === 'www.npmjs.com' },
  { id: 'obsidian', icon: siObsidian, match: (h) => h === 'obsidian.md' || h.endsWith('.obsidian.md') },

  { id: 'twitter', label: 'X / Twitter', icon: siX, bg: DARK_ICON_BG, match: (h) => h === 'twitter.com' || h === 'x.com' },
  { id: 'threads', icon: siThreads, bg: DARK_ICON_BG, match: (h) => h === 'threads.net' },
  { id: 'bluesky', icon: siBluesky, match: (h) => h === 'bsky.app' || h.endsWith('.bsky.social') },
  { id: 'linkedin', custom: 'linkedin', match: (h) => h === 'linkedin.com' || h.endsWith('.linkedin.com') },
  { id: 'facebook', icon: siFacebook, match: (h) => h === 'facebook.com' || h === 'fb.com' || h === 'm.facebook.com' },
  { id: 'instagram', icon: siInstagram, match: (h) => h === 'instagram.com' },
  { id: 'tiktok', icon: siTiktok, bg: DARK_ICON_BG, match: (h) => h === 'tiktok.com' || h.endsWith('.tiktok.com') },
  { id: 'snapchat', icon: siSnapchat, match: (h) => h === 'snapchat.com' },
  { id: 'pinterest', icon: siPinterest, match: (h) => h === 'pinterest.com' || h.endsWith('.pinterest.com') },
  { id: 'reddit', icon: siReddit, match: (h) => h === 'reddit.com' || h.endsWith('.reddit.com') },
  { id: 'whatsapp', icon: siWhatsapp, match: (h) => h === 'whatsapp.com' || h === 'web.whatsapp.com' || h === 'wa.me' },
  { id: 'telegram', icon: siTelegram, match: (h) => h === 'telegram.org' || h === 't.me' || h.endsWith('.t.me') },
  { id: 'behance', icon: siBehance, match: (h) => h === 'behance.net' },
  { id: 'dribbble', icon: siDribbble, match: (h) => h === 'dribbble.com' },

  { id: 'salesforce', custom: 'salesforce', match: (h) => h.endsWith('.force.com') || h.endsWith('.salesforce.com') || h === 'salesforce.com' },
  { id: 'hubspot', icon: siHubspot, match: (h) => h === 'hubspot.com' || h.endsWith('.hubspot.com') },
  { id: 'mailchimp', icon: siMailchimp, match: (h) => h === 'mailchimp.com' || h.endsWith('.mailchimp.com') },
  { id: 'airtable', icon: siAirtable, match: (h) => h === 'airtable.com' || h.endsWith('.airtable.com') },
  { id: 'clickup', icon: siClickup, match: (h) => h === 'clickup.com' || h.endsWith('.clickup.com') },
  { id: 'monday', custom: 'monday', match: (h) => h === 'monday.com' || h.endsWith('.monday.com') },
  { id: 'miro', icon: siMiro, bg: DARK_ICON_BG, match: (h) => h === 'miro.com' || h.endsWith('.miro.com') },
  { id: 'loom', icon: siLoom, match: (h) => h === 'loom.com' || h.endsWith('.loom.com') },
  { id: 'calendly', icon: siCalendly, match: (h) => h === 'calendly.com' || h.endsWith('.calendly.com') },
  { id: 'typeform', icon: siTypeform, match: (h) => h === 'typeform.com' || h.endsWith('.typeform.com') },
  { id: 'todoist', icon: siTodoist, match: (h) => h === 'todoist.com' },
  { id: 'zapier', icon: siZapier, match: (h) => h === 'zapier.com' || h.endsWith('.zapier.com') },

  { id: 'canva', custom: 'canva', match: (h) => h === 'canva.com' || h.endsWith('.canva.com') },
  { id: 'wikipedia', icon: siWikipedia, bg: DARK_ICON_BG, match: (h) => h.endsWith('wikipedia.org') },
  { id: 'medium', icon: siMedium, bg: DARK_ICON_BG, match: (h) => h === 'medium.com' || h.endsWith('.medium.com') },
  { id: 'spotify', icon: siSpotify, match: (h) => h === 'open.spotify.com' || h === 'spotify.com' },
  { id: 'netflix', icon: siNetflix, match: (h) => h === 'netflix.com' || h.endsWith('.netflix.com') },
  { id: 'twitch', icon: siTwitch, match: (h) => h === 'twitch.tv' || h.endsWith('.twitch.tv') },
  { id: 'zoom', icon: siZoom, match: (h) => h.endsWith('zoom.us') },
  { id: 'airbnb', icon: siAirbnb, match: (h) => h === 'airbnb.com' || h.endsWith('.airbnb.com') },

  { id: 'anthropic', icon: siAnthropic, match: (h) => h === 'anthropic.com' || h === 'claude.ai' },
  { id: 'datadog', icon: siDatadog, match: (h) => h === 'datadoghq.com' || h.endsWith('.datadoghq.com') },
  { id: 'databricks', icon: siDatabricks, match: (h) => h.endsWith('databricks.com') },
  { id: 'snowflake', icon: siSnowflake, match: (h) => h.endsWith('snowflake.com') },
];

const FALLBACK = {
  mail: { label: 'Email', bg: 'bg-blue-500/10' },
  web: { label: 'Website', bg: 'bg-muted' },
} as const;

interface ResolvedService extends LinkServiceInfo {
  icon?: SimpleIcon;
  custom?: CustomIconId;
}

function resolveRule(rule: ServiceRule): ResolvedService {
  return {
    id: rule.id,
    label: rule.label ?? rule.icon?.title ?? rule.id,
    bg: rule.bg ?? (rule.icon ? `bg-[#${rule.icon.hex}]/10` : 'bg-muted/60'),
    icon: rule.icon,
    custom: rule.custom,
  };
}

export function detectLinkService(url: string): ResolvedService {
  if (url.startsWith('mailto:')) {
    return { id: 'mail', label: FALLBACK.mail.label, bg: FALLBACK.mail.bg };
  }

  let host = '';
  let path = '';
  try {
    const parsed = new URL(url);
    host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    path = parsed.pathname.toLowerCase();
  } catch {
    return { id: 'web', label: FALLBACK.web.label, bg: FALLBACK.web.bg };
  }

  for (const rule of SERVICE_RULES) {
    if (rule.match(host, path)) {
      return resolveRule(rule);
    }
  }

  return { id: 'web', label: host || FALLBACK.web.label, bg: FALLBACK.web.bg };
}

interface LinkIconProps {
  url: string;
  size?: number;
  className?: string;
}

export function LinkIcon({ url, size = 18, className = '' }: LinkIconProps) {
  const service = detectLinkService(url);

  return (
    <div
      className={`flex items-center justify-center shrink-0 rounded-lg ${service.bg} ${className}`}
      style={{ width: size + 14, height: size + 14 }}
      title={service.label}
    >
      {service.id === 'mail' ? (
        <Mail size={size} strokeWidth={2} className="text-blue-500" />
      ) : service.id === 'web' ? (
        <Globe size={size} strokeWidth={2} className="text-muted-foreground" />
      ) : service.icon ? (
        <BrandIcon icon={service.icon} size={size} />
      ) : service.custom ? (
        CUSTOM_ICONS[service.custom](size)
      ) : null}
    </div>
  );
}

export function getLinkServiceLabel(url: string): string {
  return detectLinkService(url).label;
}
