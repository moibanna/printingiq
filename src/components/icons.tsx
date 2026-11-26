import {
  ArrowLeft, ArrowRight, Award, Backpack, BadgeCheck, BatteryCharging, Bell, Box, Calculator, Camera, Car, Check, CircleCheck,
  ClipboardList, Clock, ExternalLink, Globe, RefreshCw, Coffee, Contact, Copy, CupSoda, Cylinder, DoorOpen, Droplet, Droplets, File, Files, Film, Flame, Folder,
  Frame, Gem, Gift, HardHat, Heart, House, IdCard, Image, Inbox, Info, KeyRound, Laptop, Layers, LayoutGrid, Lightbulb, LogOut,
  LucideIcon, Mail, MapPin, Medal, MessageCircle, Minus, Monitor, Newspaper, Notebook, Package, PaintBucket, Palette, PanelTop,
  Paperclip, Pen, Pencil, PenTool, Phone, Plus, Presentation, Printer, Receipt, Scale, Scissors, Send, MessageSquare, Upload, Link2, Scroll, ScrollText, Search, ShieldCheck,
  Shirt, ShoppingBag, ShoppingCart, Signpost, Sparkles, Square, Star, Sticker, Store, Sun, Tags, Trash2, TriangleAlert, Trophy,
  Truck, Usb, User, Wrench, X, Zap,
} from 'lucide-react-native';
import { C } from '../lib/theme';

/** Every icon used in the app, by name. Line style (lucide), so they all match. */
export const ICONS = {
  // UI
  home: House, grid: LayoutGrid, cart: ShoppingCart, plus: Plus, user: User, heart: Heart, search: Search,
  whatsapp: MessageCircle, phone: Phone, pin: MapPin, store: Store, bell: Bell, check: Check, close: X, minus: Minus,
  trash: Trash2, camera: Camera, info: Info, warning: TriangleAlert, mail: Mail, logout: LogOut, edit: Pencil, inbox: Inbox,
  verified: BadgeCheck, ok: CircleCheck, globe: Globe, external: ExternalLink, refresh: RefreshCw, star: Star, truck: Truck, receipt: Receipt, scale: Scale, upload: Upload, file: File, link: Link2, sparkles: Sparkles, send: Send, message: MessageSquare, arrowL: ArrowLeft, arrowR: ArrowRight,
  // Category groups
  sign: Signpost, machines: Printer, ink: Palette, services: Receipt, stationery: Pencil, promo: Gift, awards: Trophy, apparel: Shirt,
  // Subcategories
  acrylic: Square, foam: Layers, acp: PanelTop, flex: Scroll, vinyl: Sticker, paper: File, led: Lightbulb, stands: Presentation,
  'menu-stand': ClipboardList, 'door-sign': DoorOpen,
  'large-format': Printer, 'uv-printer': Sun, 'laser-cnc': Zap, plotter: Scissors, 'heat-press': Flame, 'office-print': Copy,
  screens: Monitor, tools: Wrench,
  'solvent-ink': Droplet, 'uv-ink': Droplets, 'sublimation-ink': PaintBucket, toner: Cylinder, lamination: Film,
  'business-cards': Contact, flyers: Newspaper, 'banner-print': Image, packaging: Package, 'sticker-print': Tags,
  pens: Pen, notebooks: Notebook, folders: Folder, 'office-paper': Files, calculators: Calculator, 'pen-box': PenTool,
  'card-holder': IdCard, 'certificate-holder': ScrollText, 'office-supplies': Paperclip,
  mugs: Coffee, thermos: CupSoda, keychains: KeyRound, flash: Usb, powerbank: BatteryCharging, clocks: Clock, 'gift-box': Gift,
  'gift-bags': ShoppingBag, frames: Frame, 'tissue-box': Box, sunshade: Car, holographic: Sparkles,
  crystal: Gem, 'wood-award': Award, trophies: Trophy, medals: Medal, seals: BadgeCheck,
  't-shirts': Shirt, hats: HardHat, vests: ShieldCheck, bags: Backpack, 'laptop-bags': Laptop,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 20, color = C.text, strokeWidth = 1.8 }: { name: string; size?: number; color?: string; strokeWidth?: number }) {
  const Cmp = (ICONS as Record<string, LucideIcon>)[name] ?? Package;
  return <Cmp size={size} color={color} strokeWidth={strokeWidth} />;
}
