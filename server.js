import path from "node:path";
import { stat } from "node:fs/promises";

const links = new Map();
const port = Number(process.env.PORT || 3000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535");
}

const baseUrl = (
  process.env.BASE_URL?.trim() ||
  (process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : `http://localhost:${port}`)
).replace(/\/+$/, "");
const publicDir = process.env.PUBLIC_DIR
  ? path.resolve(process.env.PUBLIC_DIR)
  : null;
const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(body, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}

function newCode() {
  let code = "";
  while (code.length < 6) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    for (const byte of bytes) {
      if (byte < 248) code += alphabet[byte % alphabet.length];
      if (code.length === 6) break;
    }
  }
  return code;
}

async function findStaticFile(pathname) {
  if (!publicDir) return null;

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  const relativePath =
    decodedPath === "/" ? "index.html" : decodedPath.replace(/^[/\\]+/, "");
  const filePath = path.resolve(publicDir, relativePath);
  const relativeToRoot = path.relative(publicDir, filePath);
  if (
    relativeToRoot === ".." ||
    relativeToRoot.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativeToRoot)
  ) {
    return null;
  }

  try {
    if (!(await stat(filePath)).isFile()) return null;
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return null;
    throw error;
  }

  const headers = { ...corsHeaders };
  const file = Bun.file(filePath);
  if (file.type) headers["Content-Type"] = file.type;
  return new Response(file, { headers });
}

async function handleRequest(request) {
  const url = new URL(request.url);
  const { pathname } = url;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (
    request.method === "GET" &&
    (pathname === "/api/links" || pathname === "/api/links/")
  ) {
    return json([...links.values()]);
  }

  if (
    request.method === "POST" &&
    (pathname === "/api/links" || pathname === "/api/links/")
  ) {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Request body must be valid JSON" }, 400);
    }

    if (typeof body?.url !== "string" || !body.url.trim()) {
      return json({ error: "url must be a non-empty HTTP or HTTPS URL" }, 400);
    }

    const originalUrl = body.url.trim();
    let parsedUrl;
    try {
      parsedUrl = new URL(originalUrl);
    } catch {
      return json({ error: "url must be a valid HTTP or HTTPS URL" }, 400);
    }
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return json({ error: "url must use HTTP or HTTPS" }, 400);
    }

    let code;
    do {
      code = newCode();
    } while (links.has(code));

    const link = {
      code,
      url: originalUrl,
      shortUrl: `${baseUrl}/${code}`,
      hits: 0,
      createdAt: new Date().toISOString(),
    };
    links.set(code, link);
    return json(link, 201);
  }

  if (request.method === "GET") {
    const staticResponse = await findStaticFile(pathname);
    if (staticResponse) return staticResponse;

    const match = pathname.match(/^\/([A-Za-z0-9]{6})\/?$/);
    if (match) {
      const link = links.get(match[1]);
      if (!link) return json({ error: "Link not found" }, 404);
      link.hits += 1;
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, Location: link.url },
      });
    }
  }

  return json({ error: "Not found" }, 404);
}

const server = Bun.serve({
  port,
  fetch: handleRequest,
});

console.log(`Snip server listening on http://localhost:${server.port}`);
