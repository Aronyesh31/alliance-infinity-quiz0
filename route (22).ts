import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const t0 = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ ok: true, db: "up", dbLatencyMs: Date.now() - t0 }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false, db: "down" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
