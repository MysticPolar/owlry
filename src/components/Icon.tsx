import type { CSSProperties } from 'react';
import {
  IconArrowLeft,
  IconArrowRight,
  IconBattery3,
  IconBook2,
  IconBooks,
  IconCalendarEvent,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconCloud,
  IconCloudRain,
  IconCoin,
  IconCompass,
  IconCopy,
  IconExternalLink,
  IconFeather,
  IconFileText,
  IconFlame,
  IconHeart,
  IconHeartBroken,
  IconInfoCircle,
  IconLock,
  IconMail,
  IconMailOpened,
  IconMicrophone2,
  IconMoon,
  IconMoonStars,
  IconPencil,
  IconPlayerPlay,
  IconQuote,
  IconRadar2,
  IconRefresh,
  IconSend,
  IconSettings,
  IconShieldLock,
  IconSnowflake,
  IconSparkles,
  IconStar,
  IconSun,
  IconTrophy,
  IconUser,
  IconWifi,
} from '@tabler/icons-react';

/**
 * Tree-shaken SVG icon registry. Replaces the full Tabler icon *webfont*
 * (thousands of glyphs) with only the ~40 we use, keyed by their original
 * `ti-*` names so call sites (and dynamic content) are unchanged.
 *
 * Glyphs render at `1em` so the existing CSS that sizes `.ti` via `font-size`
 * and colours it via `currentColor` keeps working verbatim.
 */
const REGISTRY: Record<string, typeof IconHeart> = {
  'ti-arrow-left': IconArrowLeft,
  'ti-arrow-right': IconArrowRight,
  'ti-battery-3': IconBattery3,
  'ti-book-2': IconBook2,
  'ti-books': IconBooks,
  'ti-calendar-event': IconCalendarEvent,
  'ti-check': IconCheck,
  'ti-chevron-left': IconChevronLeft,
  'ti-chevron-right': IconChevronRight,
  'ti-clock': IconClock,
  'ti-cloud': IconCloud,
  'ti-cloud-rain': IconCloudRain,
  'ti-coin': IconCoin,
  'ti-compass': IconCompass,
  'ti-copy': IconCopy,
  'ti-external-link': IconExternalLink,
  'ti-feather': IconFeather,
  'ti-file-text': IconFileText,
  'ti-flame': IconFlame,
  'ti-heart': IconHeart,
  'ti-heart-broken': IconHeartBroken,
  'ti-info-circle': IconInfoCircle,
  'ti-lock': IconLock,
  'ti-mail': IconMail,
  'ti-mail-opened': IconMailOpened,
  'ti-microphone-2': IconMicrophone2,
  'ti-moon': IconMoon,
  'ti-moon-stars': IconMoonStars,
  'ti-pencil': IconPencil,
  'ti-player-play': IconPlayerPlay,
  'ti-quote': IconQuote,
  'ti-radar-2': IconRadar2,
  'ti-refresh': IconRefresh,
  'ti-send': IconSend,
  'ti-settings': IconSettings,
  'ti-shield-lock': IconShieldLock,
  'ti-snowflake': IconSnowflake,
  'ti-sparkles': IconSparkles,
  'ti-star': IconStar,
  'ti-sun': IconSun,
  'ti-trophy': IconTrophy,
  'ti-user': IconUser,
  'ti-wifi': IconWifi,
};

interface IconProps {
  /** tabler icon name, e.g. "ti-coin" */
  name: string;
  className?: string;
  style?: CSSProperties;
}

/** SVG glyph sized in `em` (font-size driven). Decorative by default. */
export function Icon({ name, className, style }: IconProps) {
  const Glyph = REGISTRY[name];
  const cls = `ti ${name}${className ? ' ' + className : ''}`;
  if (!Glyph) return <i className={cls} aria-hidden="true" />;
  return (
    <Glyph
      className={cls}
      aria-hidden="true"
      style={{ width: '1em', height: '1em', ...style }}
    />
  );
}
