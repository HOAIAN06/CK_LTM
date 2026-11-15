/**
 * Single icon surface for the whole design system.
 *
 * Everything is funneled through this file so icon-library renames only ever
 * touch one module, and so consumers (`shell`, feature screens) stay free of a
 * direct lucide dependency. Icons are decorative by default (`aria-hidden`);
 * icon-only controls must supply an accessible name via `aria-label`.
 *
 * Style contract: stroke 1.75 at 18px, 1.5 at 16px — never mix filled and
 * outline glyphs at the same hierarchy level.
 */
export {
  ArrowRight,
  Bell,
  BookOpen,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Command,
  Copy,
  DoorOpen,
  Eye,
  EyeOff,
  History,
  Home,
  Info,
  Library,
  LogOut,
  Maximize2,
  Menu,
  Minus,
  Monitor,
  Moon,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Square,
  Sun,
  Swords,
  TriangleAlert,
  Trophy,
  User,
  Users,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react'

export type { LucideIcon } from 'lucide-react'
