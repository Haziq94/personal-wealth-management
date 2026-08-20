import { Utensils, Bus, Zap, Clapperboard, Tag } from 'lucide-react'

const CATEGORY_ICON_MATCH = {
  'food & drink': Utensils,
  transport: Bus,
  'bills & utility': Zap,
  entertainment: Clapperboard
}

export function categoryIcon(category) {
  return CATEGORY_ICON_MATCH[category?.toLowerCase()] ?? Tag
}
