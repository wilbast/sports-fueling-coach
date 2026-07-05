import {
  BarChart3,
  CalendarRange,
  Dumbbell,
  Home,
  MessageCircle,
  SlidersHorizontal,
  Salad,
  Settings,
  type LucideIcon
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { label: "Heute", href: "/today", icon: Home },
  { label: "Coach", href: "/coach", icon: MessageCircle },
  { label: "Planung", href: "/planning", icon: CalendarRange },
  { label: "Training", href: "/training", icon: Dumbbell },
  { label: "Fueling", href: "/fueling", icon: Salad },
  { label: "Insights", href: "/insights", icon: BarChart3 },
  { label: "Standards", href: "/configuration", icon: SlidersHorizontal },
  { label: "Einstellungen", href: "/settings", icon: Settings }
];
