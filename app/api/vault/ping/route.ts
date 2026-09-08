export const runtime = "edge";

export async function HEAD() {
  return new Response(null, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-Vault-Probe": "ok",
    },
  });
}

export async function GET() {
  return new Response("ok", {
    status: 200,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Content-Type": "text/plain",
    },
  });
}
