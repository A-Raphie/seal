import { type NextRequest } from "next/server";

/**
 * Self-hosted relayer proxy.
 *
 * The browser SDK points at `/api/relayer/<chainId>` (see app/config.ts). This
 * catch-all forwards every request — method, body, query, and sub-path — to the
 * Zama relayer upstream for that chain. Keeping it server-side means any future
 * API key never ships to the browser (AGENTS.md rule 5).
 *
 * Upstream defaults come from the public Zama relayer presets; override per
 * chain with `ZAMA_RELAYER_URL_<CHAIN_ID>`.
 */
const UPSTREAMS: Record<string, string> = {
  "1": "https://relayer.mainnet.zama.org/v2",
  "11155111": "https://relayer.testnet.zama.org/v2",
};

function upstreamFor(chainId: string): string | null {
  return (
    process.env[`ZAMA_RELAYER_URL_${chainId}`] ??
    UPSTREAMS[chainId] ??
    null
  );
}

async function forward(req: NextRequest, params: { path: string[] }) {
  const { path } = params;
  const chainId = path[0];
  const base = upstreamFor(chainId);
  if (!base) {
    return new Response(`No relayer upstream for chain ${chainId}`, { status: 400 });
  }

  const sub = path.slice(1).join("/");
  const url = new URL(req.url);
  const target = sub ? `${base}/${sub}${url.search}` : `${base}${url.search}`;

  const init: RequestInit = {
    method: req.method,
    headers: {
      "content-type": req.headers.get("content-type") ?? "application/json",
      ...(process.env.ZAMA_RELAYER_API_KEY
        ? { authorization: `Bearer ${process.env.ZAMA_RELAYER_API_KEY}` }
        : {}),
    },
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.text();
  }

  try {
    const upstream = await fetch(target, init);
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
    });
  } catch (e) {
    return new Response(
      e instanceof Error ? `Relayer proxy error: ${e.message}` : "Relayer proxy error",
      { status: 502 },
    );
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, await ctx.params);
}
export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, await ctx.params);
}
export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, await ctx.params);
}
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, await ctx.params);
}
