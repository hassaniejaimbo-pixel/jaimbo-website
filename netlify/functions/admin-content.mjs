import { getDatabase } from "@netlify/database";
import { getUser } from "@netlify/identity";

const db = getDatabase();

const json = (body, status = 200) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });

function normalizeUser(raw) {
  if (!raw) return null;
  const appMetadata = raw.app_metadata ?? raw.appMetadata ?? {};
  const userMetadata = raw.user_metadata ?? raw.userMetadata ?? {};
  const roles = raw.roles ?? appMetadata.roles ?? [];
  return {
    ...raw,
    email: raw.email,
    name: raw.name ?? userMetadata.full_name ?? userMetadata.name,
    role: raw.role,
    roles: Array.isArray(roles) ? roles : [],
  };
}

async function getBearerUser(request) {
  const header = request.headers.get("authorization") || "";
  const token = header.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;

  const siteUrl = process.env.URL || request.headers.get("origin");
  if (!siteUrl) return null;

  try {
    const response = await fetch(new URL("/.netlify/identity/user", siteUrl), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;
    return normalizeUser(await response.json());
  } catch {
    return null;
  }
}

async function requireAdmin(request) {
  const user = normalizeUser(await getUser()) ?? await getBearerUser(request);
  const roles = new Set([user?.role, ...(user?.roles ?? [])].filter(Boolean));
  const allowedEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  const matchesAdminEmail = allowedEmail && user?.email?.toLowerCase() === allowedEmail;
  if (!user || (!roles.has("admin") && !matchesAdminEmail)) return null;
  return user;
}

export default async (request) => {
  const admin = await requireAdmin(request);
  if (!admin) return json({ error: "Admin access is required." }, 401);

  const settingsRows = await db.sql`SELECT value FROM site_settings WHERE key = ${"profile"} LIMIT 1`;
  const articles = await db.sql`
    SELECT id, title, excerpt, body, image_url AS "imageUrl", status, created_at AS "createdAt", updated_at AS "updatedAt"
    FROM articles
    ORDER BY created_at DESC, id DESC
  `;

  return json({
    user: { email: admin.email, name: admin.name, roles: admin.roles ?? [] },
    settings: settingsRows[0]?.value ?? null,
    articles,
  });
};

export const config = {
  path: "/api/admin/content",
};
