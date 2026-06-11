// ── Cliente de Instagram Graph API ──────────────────────────────────
// Trae métricas reales de una cuenta de Instagram Business/Creator.
// Requiere: cuenta IG Business vinculada a una página de Facebook, una app
// de Meta con permisos aprobados (instagram_basic, instagram_manage_insights)
// y un access token de larga duración. Ver DEPLOY/Meta para el setup.
//
// Está pensado como "enganche": en cuanto guardás external_id (IG user id) y
// access_token en la cuenta, la sincronización usa estos endpoints.

const GRAPH = "https://graph.facebook.com/v21.0";

export interface InstagramSnapshot {
  followers: number;
  reach: number;
  impressions: number;
  profileViews: number;
  engagement: number;
  posts: {
    externalId: string;
    caption: string | null;
    permalink: string | null;
    mediaType: string | null;
    likes: number;
    comments: number;
    postedAt: string | null;
  }[];
}

interface MediaItem {
  id: string;
  caption?: string;
  permalink?: string;
  media_type?: string;
  like_count?: number;
  comments_count?: number;
  timestamp?: string;
}

async function graphGet<T>(path: string, token: string): Promise<T> {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${GRAPH}/${path}${sep}access_token=${token}`, {
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || json.error) {
    const msg = json?.error?.message ?? `HTTP ${res.status}`;
    throw new Error(`Instagram API: ${msg}`);
  }
  return json as T;
}

// Obtiene un snapshot completo de la cuenta: seguidores, alcance, posts y
// engagement de los últimos posts.
export async function fetchInstagramSnapshot(
  igUserId: string,
  token: string
): Promise<InstagramSnapshot> {
  const errors: string[] = [];

  // 1. Datos básicos de la cuenta (seguidores).
  let followers = 0;
  try {
    const account = await graphGet<{ followers_count?: number }>(
      `${igUserId}?fields=followers_count,media_count`,
      token
    );
    followers = account.followers_count ?? 0;
  } catch (e) {
    errors.push(e instanceof Error ? e.message : "cuenta");
  }

  // 2. Insights de la cuenta (requiere permisos de insights aprobados).
  // Meta fue deprecando métricas; pedimos las más estables y toleramos fallos.
  let reach = 0;
  let impressions = 0;
  let profileViews = 0;
  try {
    const insights = await graphGet<{
      data: { name: string; values: { value: number }[] }[];
    }>(`${igUserId}/insights?metric=reach,impressions,profile_views&period=day`, token);
    for (const m of insights.data ?? []) {
      const v = m.values?.[0]?.value ?? 0;
      if (m.name === "reach") reach = v;
      if (m.name === "impressions") impressions = v;
      if (m.name === "profile_views") profileViews = v;
    }
  } catch {
    // Sin permisos de insights todavía: seguimos con el resto.
  }

  // 3. Últimos posts con likes/comentarios.
  let posts: InstagramSnapshot["posts"] = [];
  try {
    const media = await graphGet<{ data: MediaItem[] }>(
      `${igUserId}/media?fields=id,caption,permalink,media_type,like_count,comments_count,timestamp&limit=25`,
      token
    );
    posts = (media.data ?? []).map((m) => ({
      externalId: m.id,
      caption: m.caption ?? null,
      permalink: m.permalink ?? null,
      mediaType: m.media_type ?? null,
      likes: m.like_count ?? 0,
      comments: m.comments_count ?? 0,
      postedAt: m.timestamp ?? null,
    }));
  } catch (e) {
    errors.push(e instanceof Error ? e.message : "posts");
  }

  const engagement = posts.reduce((s, p) => s + p.likes + p.comments, 0);

  // Si no se obtuvo ningún dato útil, avisamos con el motivo de Meta.
  if (followers === 0 && posts.length === 0 && reach === 0) {
    throw new Error(
      errors[0] ??
        "Meta no devolvió datos. Verificá que el IG user id sea numérico, que la cuenta sea Business/Creator y que el token tenga permisos de insights."
    );
  }

  return { followers, reach, impressions, profileViews, engagement, posts };
}
