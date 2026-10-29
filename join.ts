type JoinCheck = {
  state: "LOBBY" | "QUESTION" | "REVEAL" | "PAUSED" | "FINISHED";
  registrationOpen: boolean;
  allowLateJoin: boolean;
  teamCount: number;
  capacity: number;
};

export type Availability = { ok: true } | { ok: false; code: string; message: string };

/** Whether a game currently accepts new teams, with a message teams can act on. */
export function joinAvailability(s: JoinCheck): Availability {
  if (s.state === "FINISHED") return { ok: false, code: "finished", message: "This game has already ended." };
  if (s.state !== "LOBBY" && !s.allowLateJoin) {
    return { ok: false, code: "started", message: "This game has already started and is not accepting new teams." };
  }
  if (!s.registrationOpen) {
    return { ok: false, code: "closed", message: "Registration is closed right now. Ask the host to open it." };
  }
  if (s.teamCount >= s.capacity) return { ok: false, code: "full", message: "This game is full." };
  return { ok: true };
}
