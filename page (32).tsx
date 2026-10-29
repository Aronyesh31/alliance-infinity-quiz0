import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { appOrigin } from "@/lib/config";
import { qrSvg } from "@/lib/qr";
import { PresentScreen } from "@/components/game/present-screen";

export const metadata: Metadata = { title: "Presentation" };
export const dynamic = "force-dynamic";

/**
 * Projector view. Shows only public information: the PIN, team names, the
 * current question, and — after each deadline — the answer and leaderboard.
 */
export default async function PresentPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  if (!/^[a-z0-9]{10,40}$/.test(sessionId)) notFound();
  const session = await prisma.gameSession.findUnique({ where: { id: sessionId }, select: { id: true, pin: true } });
  if (!session) notFound();
  const origin = appOrigin();
  const joinUrl = `${origin}/join/${session.pin}`;
  return <PresentScreen sessionId={session.id} joinHost={origin.replace(/^https?:\/\//, "")} joinUrl={joinUrl} qr={await qrSvg(joinUrl)} />;
}
