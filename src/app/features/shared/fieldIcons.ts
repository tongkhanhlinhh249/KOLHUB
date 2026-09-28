import {
  BookOpen,
  Brush,
  Cpu,
  Droplet,
  Dumbbell,
  Clapperboard,
  Gamepad2,
  GraduationCap,
  House,
  Languages,
  Mic,
  Mountain,
  Plane,
  Podcast,
  Radio,
  Shirt,
  ShoppingBag,
  Sparkles,
  Sprout,
  Star,
  Tag,
  Landmark,
  UtensilsCrossed,
  ChefHat,
  Wallet,
  Coffee,
  type LucideIcon,
} from 'lucide-react';

/** Icon for "Khác" and for names not in the list. */
export const DEFAULT_FIELD_ICON: LucideIcon = Tag;

/** "Lĩnh vực hoạt động" → icon. Main categories (KOL_CATEGORIES) each have their own; extra fields reuse the closest one. */
const ICONS: Record<string, LucideIcon> = {
  // KOL_CATEGORIES
  'giáo dục': GraduationCap,
  lifestyle: Coffee,
  'du lịch': Plane,
  'ẩm thực': UtensilsCrossed,
  'làm đẹp': Sparkles,
  'thời trang': Shirt,
  'công nghệ': Cpu,
  gaming: Gamepad2,
  'thể thao': Dumbbell,
  'giải trí': Clapperboard,
  'gia đình': House,
  'tài chính': Wallet,
  // Extra fields used in profiles
  mc: Mic,
  'tiếng anh': Languages,
  'phát triển bản thân': Sprout,
  podcast: Podcast,
  'văn hóa': Landmark,
  phượt: Mountain,
  'food review': UtensilsCrossed,
  'nấu ăn': ChefHat,
  family: House,
  fashion: Shirt,
  beauty: Sparkles,
  makeup: Brush,
  skincare: Droplet,
  shopping: ShoppingBag,
  tutorial: BookOpen,
  esports: Gamepad2,
  livestream: Radio,
  review: Star,
};

export function fieldIcon(name: string): LucideIcon {
  return ICONS[name.trim().toLowerCase()] ?? DEFAULT_FIELD_ICON;
}
