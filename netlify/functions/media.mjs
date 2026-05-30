import { getStore } from "@netlify/blobs";

export default async (_request, context) => {
  const key = context.params.key ? decodeURIComponent(context.params.key) : "";
  if (!key) return new Response("Missing media key.", { status: 400 });

  const store = getStore({ name: "admin-media", consistency: "strong" });
  const entry = await store.getWithMetadata(key, { type: "arrayBuffer" });
  if (!entry) return new Response("Not found.", { status: 404 });

  return new Response(entry.data, {
    headers: {
      "Content-Type": entry.metadata?.contentType || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
};

export const config = {
  path: "/api/media/:key",
};
