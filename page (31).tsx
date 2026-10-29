import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTeamFromCookie } from "@/lib/auth/team";
import { TeamGame } from "@/components/game/team-game";

export const metadata: Metadata = { title: "Play" };
export const dynamic = "force-dynamic";

export default async function PlayPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const team = await getTeamFromCookie();
  // The cookie, not the URL, decides which team this device is.
  if (!team || team.sessionId !== sessionId) redirect("/join");
  return <TeamGame sessionId={sessionId} teamName={team.name} />;
}
