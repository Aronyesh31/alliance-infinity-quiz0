import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth/admin";
import { appOrigin } from "@/lib/config";
import { qrSvg } from "@/lib/qr";
import { GameControl } from "@/components/admin/game-control";

export const metadata: Metadata = { title: "Control room" };
export const dynamic = "force-dynamic";

export default async function GameControlPage({ params }: { params: Promise<{ sessionId: string }> }) {
  await requireAdminPage();
  const { sessionId } = await params;
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      title: true,
      pin: true,
      questionCount: true,
      capacity: true,
      revealSeconds: true,
      showTeamStanding: true,
      showAnswerFeedback: true,
      allowLateJoin: true,
    },
  });
  if (!session) notFound();
  const joinUrl = `${appOrigin()}/join/${session.pin}`;
  return <GameControl session={session} joinUrl={joinUrl} qr={await qrSvg(joinUrl)} />;
}
