import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Serves question images. Ids are unguessable and images are immutable, so CDNs may cache them forever. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ imageId: string }> }) {
  const { imageId } = await ctx.params;
  if (!/^[a-z0-9]{10,40}$/.test(imageId)) return new Response("Not found", { status: 404 });
  const image = await prisma.image.findUnique({ where: { id: imageId }, select: { data: true, mimeType: true } });
  if (!image) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(image.data), {
    headers: {
      "Content-Type": image.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
