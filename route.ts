import type { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/auth/admin";
import { ApiError, handler, json } from "@/lib/http";
import { IMAGE_MAX_BYTES } from "@/lib/config";

export const dynamic = "force-dynamic";

/** Identifies the real file type from its first bytes (the declared type is not trusted). */
function sniffImageType(bytes: Uint8Array): string | null {
  const b = bytes;
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return "image/gif";
  if (
    b.length > 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export const POST = handler(async (req: NextRequest) => {
  await requireAdminApi(req);
  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > IMAGE_MAX_BYTES + 64 * 1024) throw new ApiError(413, "too_large", "Images can be at most 2 MB.");

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") throw new ApiError(400, "no_file", "Choose an image to upload.");
  if (file.size > IMAGE_MAX_BYTES) throw new ApiError(413, "too_large", "Images can be at most 2 MB.");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = sniffImageType(bytes);
  if (!mimeType) throw new ApiError(415, "bad_type", "Upload a PNG, JPEG, WebP or GIF image.");

  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const existing = await prisma.image.findFirst({ where: { sha256 }, select: { id: true } });
  const image = existing ?? (await prisma.image.create({ data: { mimeType, sizeBytes: bytes.length, sha256, data: bytes }, select: { id: true } }));
  return json({ ok: true, id: image.id, url: `/api/images/${image.id}` }, 201);
});
