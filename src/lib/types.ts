// Tipos compartidos del dominio Backbone.

export type UserRole = "admin" | "closer" | "setter";

export type DealStage =
  | "lead"
  | "contactado"
  | "agendado"
  | "presentado"
  | "ganado"
  | "perdido";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface Profile {
  id: string;
  organization_id: string | null;
  full_name: string | null;
  role: UserRole;
  created_at: string;
}

export interface Contact {
  id: string;
  organization_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  instagram: string | null;
  source: string | null;
  notes: string | null;
  owner_id: string | null;
  created_at: string;
}

export interface Deal {
  id: string;
  organization_id: string;
  contact_id: string | null;
  title: string;
  stage: DealStage;
  value: number;
  owner_id: string | null;
  closed_at: string | null;
  created_at: string;
}

export interface ContentAsset {
  id: string;
  organization_id: string;
  title: string;
  kind: string;
  url: string | null;
  description: string | null;
  created_by: string | null;
  created_at: string;
}

export interface GuionThread {
  id: string;
  organization_id: string;
  created_by: string | null;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface GuionMessage {
  id: string;
  thread_id: string;
  organization_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export type SocialPlatform = "instagram" | "tiktok" | "facebook";

export interface SocialAccount {
  id: string;
  organization_id: string;
  platform: SocialPlatform;
  handle: string;
  external_id: string | null;
  access_token: string | null;
  connected_by: string | null;
  last_synced_at: string | null;
  created_at: string;
}

export interface SocialMetric {
  id: string;
  account_id: string;
  organization_id: string;
  snapshot_date: string;
  followers: number;
  reach: number;
  impressions: number;
  profile_views: number;
  engagement: number;
}

export interface SocialPost {
  id: string;
  account_id: string;
  organization_id: string;
  external_id: string;
  caption: string | null;
  permalink: string | null;
  media_type: string | null;
  likes: number;
  comments: number;
  reach: number;
  posted_at: string | null;
}

export const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
};

export type LeadCalificacion = "CALIFICADO" | "NO CALIFICADO" | "PENDIENTE";
export type LeadShowUp = "SI" | "NO" | "REAGENDÓ";
export type LeadEstado =
  | "COMPRÓ"
  | "SEÑÓ"
  | "SEGUIMIENTO"
  | "NO COMPRÓ"
  | "NO SHOW"
  | "NO CALIFICA";

export const CALIFICACION_OPTIONS: LeadCalificacion[] = [
  "CALIFICADO",
  "NO CALIFICADO",
  "PENDIENTE",
];
export const SHOW_UP_OPTIONS: LeadShowUp[] = ["SI", "NO", "REAGENDÓ"];
export const ESTADO_OPTIONS: LeadEstado[] = [
  "COMPRÓ",
  "SEÑÓ",
  "SEGUIMIENTO",
  "NO COMPRÓ",
  "NO SHOW",
  "NO CALIFICA",
];

// Fuentes de lead sugeridas (datalist; el campo admite texto libre).
export const FUENTE_OPTIONS = [
  "Instagram DM",
  "Instagram Ads",
  "TikTok",
  "YouTube",
  "Landing",
  "WhatsApp",
  "Referido",
  "Manual",
];

// Color por estado para los badges del pipeline.
export const ESTADO_COLORS: Record<LeadEstado, string> = {
  "COMPRÓ": "bg-emerald-500/20 text-emerald-300",
  "SEÑÓ": "bg-teal-500/20 text-teal-300",
  "SEGUIMIENTO": "bg-amber-500/20 text-amber-300",
  "NO COMPRÓ": "bg-red-500/20 text-red-300",
  "NO SHOW": "bg-zinc-500/20 text-zinc-300",
  "NO CALIFICA": "bg-zinc-500/20 text-zinc-300",
};

export interface Lead {
  id: string;
  organization_id: string;
  fecha_agenda: string | null;
  fecha_llamada: string | null;
  setter_id: string | null;
  closer_id: string | null;
  nombre: string;
  contacto: string | null;
  audio: string | null;
  fuente: string | null;
  calificacion: LeadCalificacion;
  show_up: LeadShowUp | null;
  estado: LeadEstado | null;
  programa: string | null;
  precio_pactado: number;
  cash_collected: number;
  monto_restante: number;
  nota_setter: string | null;
  nota_closer: string | null;
  grabacion: string | null;
  created_at: string;
}

export interface Program {
  id: string;
  organization_id: string;
  name: string;
  price: number;
  active: boolean;
  created_at: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  closer: "Closer",
  setter: "Setter",
};

export const STAGE_LABELS: Record<DealStage, string> = {
  lead: "Lead",
  contactado: "Contactado",
  agendado: "Agendado",
  presentado: "Presentado",
  ganado: "Ganado",
  perdido: "Perdido",
};

export const STAGE_ORDER: DealStage[] = [
  "lead",
  "contactado",
  "agendado",
  "presentado",
  "ganado",
  "perdido",
];
