import { getDatabase } from "@netlify/database";
import { getUser } from "@netlify/identity";
import { getStore } from "@netlify/blobs";

const db = getDatabase();

const defaultSettings = {
  name: "Jaimbo",
  title: "Digital Creator",
  tagline: "Bold political analysis, social commentary, and fact-based content for a better informed Kenya.",
  followers: "84K",
  posts: "1.2K",
  reach: "2M+",
  profileImageUrl: "IMG_9864.jpg",
  facebookUrl: "https://www.facebook.com/profile.php?id=61578836424894",
};

const defaultArticles = [
  {
    title: "Political Analysis",
    excerpt: "Clear breakdowns of public affairs, governance decisions, and the issues shaping civic conversation.",
    body: "Use the admin panel to replace this sample item with a full article, update the image, or publish new commentary.",
    status: "published",
  },
  {
    title: "Social Commentary",
    excerpt: "Thoughtful posts on daily events, citizen concerns, and the stories people are already discussing.",
    body: "This article feed is editable from the admin panel and updates the public website without changing code.",
    status: "published",
  },
];

const json = (body, status = 200) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });

async function ensureDefaults() {
  const settings = await db.sql`SELECT value FROM site_settings WHERE key = ${"profile"} LIMIT 1`;
  if (settings.length === 0) {
    await db.sql`
      INSERT INTO site_settings (key, value)
      VALUES (${"profile"}, ${JSON.stringify(defaultSettings)}::jsonb)
      ON CONFLICT (key) DO NOTHING
    `;
  }

  const articleCount = await db.sql`SELECT COUNT(*)::int AS count FROM articles`;
  if ((articleCount[0]?.count ?? 0) === 0) {
    for (const article of defaultArticles) {
      await db.sql`
        INSERT INTO articles (title, excerpt, body, status)
        VALUES (${article.title}, ${article.excerpt}, ${article.body}, ${article.status})
      `;
    }
  }
}

async function loadContent() {
  await ensureDefaults();
  const settingsRows = await db.sql`SELECT value FROM site_settings WHERE key = ${"profile"} LIMIT 1`;
  const articles = await db.sql`
    SELECT id, title, excerpt, body, image_url AS "imageUrl", status, created_at AS "createdAt", updated_at AS "updatedAt"
    FROM articles
    ORDER BY created_at DESC, id DESC
  `;

  return {
    settings: settingsRows[0]?.value ?? defaultSettings,
    articles,
  };
}

async function requireAdmin() {
  const user = await getUser();
  const roles = new Set([user?.role, ...(user?.roles ?? [])].filter(Boolean));
  const allowedEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  const matchesAdminEmail = allowedEmail && user?.email?.toLowerCase() === allowedEmail;

  if (!user || (!roles.has("admin") && !matchesAdminEmail)) {
    return null;
  }

  return user;
}

function sanitizeText(value, maxLength = 5000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

async function saveImage(dataUrl, folder) {
  if (!dataUrl) return null;
  const match = String(dataUrl).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error("Images must be uploaded as data URLs.");

  const mediaStore = getStore({ name: "admin-media", consistency: "strong" });
  const [, contentType, base64] = match;
  const extension = contentType.split("/")[1].replace("jpeg", "jpg");
  const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
  const bytes = Uint8Array.from(Buffer.from(base64, "base64"));
  await mediaStore.set(key, bytes, { metadata: { contentType } });
  return `/api/media/${encodeURIComponent(key)}`;
}

async function updateSettings(body) {
  const current = (await loadContent()).settings;
  const profileImageUrl = body.profileImageDataUrl
    ? await saveImage(body.profileImageDataUrl, "profile")
    : sanitizeText(body.profileImageUrl || current.profileImageUrl, 1000);

  const settings = {
    name: sanitizeText(body.name || current.name, 80),
    title: sanitizeText(body.title || current.title, 120),
    tagline: sanitizeText(body.tagline || current.tagline, 300),
    followers: sanitizeText(body.followers || current.followers, 20),
    posts: sanitizeText(body.posts || current.posts, 20),
    reach: sanitizeText(body.reach || current.reach, 20),
    profileImageUrl,
    facebookUrl: sanitizeText(body.facebookUrl || current.facebookUrl, 500),
  };

  await db.sql`
    INSERT INTO site_settings (key, value, updated_at)
    VALUES (${"profile"}, ${JSON.stringify(settings)}::jsonb, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `;

  return settings;
}

async function saveArticle(body) {
  const id = Number(body.id || 0);
  const title = sanitizeText(body.title, 180);
  if (!title) throw new Error("Article title is required.");

  const excerpt = sanitizeText(body.excerpt, 500);
  const articleBody = sanitizeText(body.body, 12000);
  const status = body.status === "draft" ? "draft" : "published";
  const imageUrl = body.imageDataUrl ? await saveImage(body.imageDataUrl, "articles") : sanitizeText(body.imageUrl, 1000);

  if (id > 0) {
    const rows = await db.sql`
      UPDATE articles
      SET title = ${title}, excerpt = ${excerpt}, body = ${articleBody}, image_url = ${imageUrl || null}, status = ${status}, updated_at = now()
      WHERE id = ${id}
      RETURNING id, title, excerpt, body, image_url AS "imageUrl", status, created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    return rows[0];
  }

  const rows = await db.sql`
    INSERT INTO articles (title, excerpt, body, image_url, status)
    VALUES (${title}, ${excerpt}, ${articleBody}, ${imageUrl || null}, ${status})
    RETURNING id, title, excerpt, body, image_url AS "imageUrl", status, created_at AS "createdAt", updated_at AS "updatedAt"
  `;
  return rows[0];
}

async function deleteArticle(id) {
  await db.sql`DELETE FROM articles WHERE id = ${Number(id)}`;
}

export default async (request) => {
  try {
    if (request.method === "GET") {
      const content = await loadContent();
      return json({
        ...content,
        articles: content.articles.filter((article) => article.status === "published"),
      });
    }

    const admin = await requireAdmin();
    if (!admin) return json({ error: "Admin access is required." }, 401);

    const body = await request.json();

    if (request.method === "PUT") {
      const settings = await updateSettings(body);
      return json({ settings });
    }

    if (request.method === "POST") {
      const article = await saveArticle(body);
      return json({ article }, body.id ? 200 : 201);
    }

    if (request.method === "DELETE") {
      await deleteArticle(body.id);
      return json({ ok: true });
    }

    return json({ error: "Method not allowed." }, 405);
  } catch (error) {
    return json({ error: error.message || "Content request failed." }, 500);
  }
};

export const config = {
  path: "/api/content",
};
