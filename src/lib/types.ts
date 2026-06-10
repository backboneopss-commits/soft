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
