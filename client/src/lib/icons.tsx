/**
 * Central icon system — Phosphor Icons with Lucide-compatible aliases.
 * Import from here instead of 'lucide-react' everywhere.
 * Phosphor gives us weight control: regular / bold / fill / duotone / thin.
 */

export {
  // Navigation & layout
  SquaresFour as LayoutDashboard,
  Star,
  ArrowsLeftRight as GitCompareArrows,
  Pulse as Activity,
  Newspaper,
  CalendarBlank as CalendarDays,
  Bell,
  BellSlash as BellOff,
  List as Menu,
  X,
  SignOut as LogOut,

  // Learning & academy
  BookOpen,
  TrendUp as TrendingUp,
  Trophy,
  Fire as Flame,
  Medal as Award,
  Lightning as Zap,
  Sparkle as Sparkles,

  // Charts & data
  ChartBar as BarChart2,
  TrendDown as TrendingDown,
  ChartLineUp,

  // Arrows & directional
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  ArrowClockwise as RefreshCw,
  ArrowClockwise as RotateCw,
  ArrowCounterClockwise as RotateCcw,
  ArrowSquareOut as ExternalLink,

  // Carets (thinner, more refined than chevrons)
  CaretDown as ChevronDown,
  CaretRight as ChevronRight,
  CaretUp as ChevronUp,

  // Status & feedback
  WarningCircle as AlertCircle,
  Warning as AlertTriangle,
  CheckCircle as CheckCircle2,
  Check,
  CircleNotch as Loader2,

  // Actions
  Plus,
  Minus,
  Trash as Trash2,
  MagnifyingGlass as Search,
  Camera,
  FloppyDisk as Save,

  // Communication
  EnvelopeSimple as Mail,
  Chat as MessageSquare,
  ChatCircle as MessageCircle,

  // Finance & trading
  Scales as Scale,
  Target,
  CurrencyDollar as DollarSign,

  // Auth & security
  Lock,
  User,

  // Social
  Users,
  Crown,

  // Time
  Clock,

  // Media
  Play,
  Pause,
  Broadcast as Radio,

  // Misc
  Brain,
  Globe,
  Globe as Globe2,
  Bank as Landmark,
  Binoculars as Telescope,
  Sun,
  Moon,
  GitBranch,
} from '@phosphor-icons/react';

// Re-export Icon type for props typing
export type { Icon, IconProps } from '@phosphor-icons/react';
