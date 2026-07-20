import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";

export const runtime = "nodejs";

/**
 * GET/PUT /api/sync — synchronisation multi-appareils par code secret.
 *
 * Le client envoie son code dans l'en-tête `x-sync-code` ; la clé de stockage
 * est le SHA-256 du code (le code lui-même n'est jamais stocké). L'état complet
 * du budget est enregistré comme un unique blob JSON dans Upstash Redis, avec
 * un horodatage `updatedAt` : la résolution de conflit est "dernier écrit gagne".
 *
 * Sans base configurée (variables UPSTASH_* absentes) : 503 — le client reste
 * en mode local (localStorage), rien n'est perdu.
 */

const MAX_BODY_BYTES = 1_000_000; // ~1 Mo : très large pour un budget perso

interface SyncPayload {
  updatedAt: number;
  transactions: unknown[];
  categories: unknown[];
  currency: string;
  // Champs additionnels (catalogVersion, currencyUpdatedAt, et les champs par
  // entité updatedAt/deleted) : non validés ici mais conservés — le blob
  // complet est stocké et relu à l'identique, la fusion se fait côté client.
  [key: string]: unknown;
}

function redisEnv() {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

function storageKey(req: NextRequest): string | null {
  const code = req.headers.get("x-sync-code")?.trim();
  if (!code || code.length < 6) return null;
  return "budget:" + createHash("sha256").update(code).digest("hex");
}

export async function GET(req: NextRequest) {
  const redis = redisEnv();
  if (!redis) return NextResponse.json({ error: "sync-unavailable" }, { status: 503 });

  const key = storageKey(req);
  if (!key) return NextResponse.json({ error: "code-invalide" }, { status: 400 });

  const res = await fetch(`${redis.url}/get/${key}`, {
    headers: { Authorization: `Bearer ${redis.token}` },
    signal: AbortSignal.timeout(8000),
    cache: "no-store"
  });
  if (!res.ok) return NextResponse.json({ error: "redis" }, { status: 502 });

  const { result } = (await res.json()) as { result: string | null };
  return NextResponse.json({ data: result ? (JSON.parse(result) as SyncPayload) : null });
}

export async function PUT(req: NextRequest) {
  const redis = redisEnv();
  if (!redis) return NextResponse.json({ error: "sync-unavailable" }, { status: 503 });

  const key = storageKey(req);
  if (!key) return NextResponse.json({ error: "code-invalide" }, { status: 400 });

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "trop-volumineux" }, { status: 413 });
  }

  let data: SyncPayload;
  try {
    data = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "json-invalide" }, { status: 400 });
  }
  if (
    typeof data?.updatedAt !== "number" ||
    !Array.isArray(data.transactions) ||
    !Array.isArray(data.categories) ||
    typeof data.currency !== "string"
  ) {
    return NextResponse.json({ error: "format-invalide" }, { status: 400 });
  }

  const res = await fetch(redis.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${redis.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(["SET", key, JSON.stringify(data)]),
    signal: AbortSignal.timeout(8000)
  });
  if (!res.ok) return NextResponse.json({ error: "redis" }, { status: 502 });

  return NextResponse.json({ ok: true });
}