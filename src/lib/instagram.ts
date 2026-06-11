// ── Cliente de Instagram (Instagram API con Instagram Login) ─────────
// Trae métricas reales de una cuenta de Instagram Business/Creator que haya
// autorizado nuestra app mediante el login de Instagram (OAuth).
//
// Flujo: el usuario hace clic en "Conectar con Instagram" → autoriza → Meta
// nos devuelve un código → lo cambiamos por un token de larga duración (60
// días) → con ese token leemos sus métricas. No se pueden leer métricas de
// cuentas que no autorizaron la app (política de Meta).

const GRAPH = "https://graph.instagram.com";
const OAUTH_AUTHORIZE = "https://www.instagram.com/oauth/authorize";
const OAUTH_TOKEN = "https://api.instagram.com/oauth/access_token";

// Permisos que pedimos al conectar: datos básicos + insights (métricas).
const SCOPES = "instagram_business_basic,instagram_business_manage_insights";

// URL a la que mandamos al usuario para que autorice la conexión.
export function getInstagramAuthUrl(
  appId: string,
  redirectUri: string,
  state: string
): string {
  const p = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    state,
  });
  return `${OAUTH_AUTHORIZE}?${p.toString()}`;
}

// Cambia el código de autorización por un token de larga duración + user id.
export async function exchangeCodeForToken(
  appId: string,
  appSecret: string,
  redirectUri: string,
  code: string
): Promise<{ token: string; userId: string }> {
  // 1. Código → token de corta duración.
  const body = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  });
  const res = await fetch(OAUTH_TOKEN, { method: "POST", body });
  const json = await res.json();
  if (!res.ok || json.error_type || json.error_message) {
    throw new Error(json.error_message ?? `No se pudo autenticar (HTTP ${res.status})`);
  }
  const shortToken: string = json.access_token;
  const userId = String(json.user_id ?? "");

  // 2. Token corto → token largo (60 días).
  const longRes = await fetch(
    `${GRAPH}/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${shortToken}`
  );
  const longJson = await longRes.json();
  return { token: longJson.access_token ?? shortToken, userId };
}

// Devuelve el @usuario de la cuenta conectada.
export async function fetchInstagramUsername(token: string): Promise<string> {
  try {
    const me = await graphGet<{ username?: string }>(`me?fields=username`, token);
    return me.username ?? "instagram";
  } catch {
    return "instagram";
  }
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
  // Con Instagram Login se puede usar el id numérico o "me".
  const id = igUserId && igUserId.trim() ? igUserId.trim() : "me";

  // 1. Datos básicos de la cuenta (seguidores).
  let followers = 0;
  try {
    const account = await graphGet<{ followers_count?: number }>(
      `${id}?fields=followers_count,media_count`,
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
    }>(`${id}/insights?metric=reach,impressions,profile_views&period=day`, token);
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
      `${id}/media?fields=id,caption,permalink,media_type,like_count,comments_count,timestamp&limit=25`,
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
