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
