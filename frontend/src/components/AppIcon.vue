<script>
// Лінійні іконки Lucide (https://lucide.dev/icons). Щоб додати нову іконку:
// імпортуйте її нижче й допишіть у ICONS під назвою в форматі kebab-case.
import {
  Apple, ArrowRight, Award, BadgeCheck, BookOpen, Bug, Calculator, CalendarDays, Check, ChevronDown,
  ChevronRight, Clock, Download, Droplets, Eye, Factory, FileText, FlaskConical, Flower2, Gauge,
  Globe, Handshake, House, Image, Inbox, Info, Layers, LayoutGrid, Leaf, LogOut, Mail, MapPin, Menu,
  Microscope, Minus, Mountain, Package, Pencil, Percent, Phone, PhoneCall, Plus, Receipt, Search,
  ShieldCheck, ShoppingCart, SlidersHorizontal, Sparkles, Sprout, Star, Sun, Tags, Tractor, Trash2,
  Truck, Users, Wheat, X, Trees, Scissors, TreeDeciduous, Thermometer, CloudRain, TriangleAlert,
  ListChecks, RefreshCw,
} from '@lucide/vue';

export const ICONS = {
  apple: Apple, trees: Trees, scissors: Scissors, 'tree-deciduous': TreeDeciduous,
  thermometer: Thermometer, 'cloud-rain': CloudRain, alert: TriangleAlert, 'list-checks': ListChecks, refresh: RefreshCw,
  'arrow-right': ArrowRight, award: Award, 'badge-check': BadgeCheck, 'book-open': BookOpen, bug: Bug,
  calculator: Calculator, 'calendar-days': CalendarDays, check: Check, 'chevron-down': ChevronDown,
  'chevron-right': ChevronRight, clock: Clock, download: Download, droplets: Droplets, eye: Eye,
  factory: Factory, 'file-text': FileText, 'flask-conical': FlaskConical, 'flower-2': Flower2,
  gauge: Gauge, globe: Globe, handshake: Handshake, home: House, image: Image, inbox: Inbox, info: Info,
  layers: Layers, 'layout-grid': LayoutGrid, leaf: Leaf, 'log-out': LogOut, mail: Mail,
  'map-pin': MapPin, menu: Menu, microscope: Microscope, minus: Minus, mountain: Mountain,
  package: Package, pencil: Pencil, percent: Percent, phone: Phone, 'phone-call': PhoneCall, plus: Plus,
  receipt: Receipt, search: Search, 'shield-check': ShieldCheck, 'shopping-cart': ShoppingCart,
  sliders: SlidersHorizontal, sparkles: Sparkles, sprout: Sprout, star: Star, sun: Sun, tags: Tags,
  tractor: Tractor, trash: Trash2, truck: Truck, users: Users, wheat: Wheat, x: X,
};

// Іконки, які можна обрати для категорій і добірок в адмінці
export const ICON_CHOICES = [
  'shield-check', 'leaf', 'microscope', 'bug', 'flask-conical', 'droplets', 'sprout', 'sun', 'wheat',
  'flower-2', 'layers', 'sparkles', 'tractor', 'mountain', 'package', 'truck', 'star', 'gauge',
  'apple', 'trees', 'tree-deciduous', 'scissors',
];
</script>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  name: { type: String, default: '' },
  size: { type: [Number, String], default: 20 },
  strokeWidth: { type: [Number, String], default: 1.75 },
});

const component = computed(() => ICONS[props.name]);
</script>

<template>
  <component :is="component" v-if="component" :size="size" :stroke-width="strokeWidth" class="icon" aria-hidden="true" />
  <!-- Для старих даних, де замість назви іконки збережено емодзі -->
  <span v-else-if="name" class="icon icon--text" :style="{ fontSize: `${Number(size) * 0.9}px` }" aria-hidden="true">{{ name }}</span>
</template>

<style scoped>
.icon { flex-shrink: 0; display: inline-block; vertical-align: middle; }
.icon--text { line-height: 1; }
</style>
