import { getDatabase } from "@netlify/database";
import { getUser } from "@netlify/identity";

const db = getDatabase();

const json = (body, status = 200) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });

async function requireAdmin() {
  const user = await getUser();
  const roles = new Set([user?.role, ...(user?.roles ?? [])].filter(Boolean));
  const allowedEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  const matchesAdminEmail = allowedEmail && user?.email?.toLowerCase() === allowedEmail;
  if (!user || (!roles.has("admin") && !matchesAdminEmail)) return null;
  return user;
}

export default async () => {
  const admin = await requireAdmin();
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
