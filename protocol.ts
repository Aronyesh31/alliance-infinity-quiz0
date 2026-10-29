// Wire protocol between browsers and the realtime server. Shared by both sides.
// Public payloads never contain the correct answer while a question is open.

export type GameState = "LOBBY" | "QUESTION" | "REVEAL" | "PAUSED" | "FINISHED";

export interface PublicQuestion {
  index: number;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE";
  text: string;
  choices: string[];
  imageUrl: string | null;
  points: number;
  timeLimitSec: number;
}

export interface RevealInfo {
  questionIndex: number;
  correctIndex: number;
  /** Answer counts per choice. */
  distribution: number[];
  answeredCount: number;
  explanation: string;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  correctCount: number;
}

export interface PublicSnapshot {
  sessionId: string;
  title: string;
  pin: string;
  state: GameState;
  /** State the game was in before it was paused. */
  pausedFrom: GameState | null;
  registrationOpen: boolean;
  teamCount: number;
  questionCount: number;
  currentIndex: number;
  question: PublicQuestion | null;
  /** Epoch ms on the server clock. */
  questionStartedAt: number | null;
  deadline: number | null;
  revealEndsAt: number | null;
  pausedRemainingMs: number | null;
  answeredCount: number;
  reveal: RevealInfo | null;
  leaderboard: LeaderboardEntry[] | null;
  showTeamStanding: boolean;
  showAnswerFeedback: boolean;
  serverNow: number;
}

export interface TeamSelf {
  teamId: string;
  name: string;
  /** The team's answer to the current question, if any. */
  answer: { questionIndex: number; choiceIndex: number } | null;
  /** Result of the most recently closed question (only when feedback is enabled). */
  result: { questionIndex: number; isCorrect: boolean; points: number; answered: boolean } | null;
  /** Only when standings are enabled. */
  standing: { score: number; rank: number; of: number; correctCount: number } | null;
}

export interface ProgressUpdate {
  questionIndex: number;
  answeredCount: number;
}

export interface LobbyUpdate {
  teamCount: number;
  /** Most recent joiners first, capped. */
  recentNames: string[];
}

export interface AdminTeamRow {
  id: string;
  name: string;
  connected: boolean;
  answeredCurrent: boolean;
  score: number;
  correctCount: number;
  rank: number;
  joinedAt: number;
}

export interface AdminEvent {
  at: number;
  level: "info" | "warn" | "error";
  message: string;
}

export interface AdminSnapshot {
  sessionId: string;
  teams: AdminTeamRow[];
  connectedCount: number;
  answeredCount: number;
  distribution: number[];
  currentCorrectIndex: number | null;
  events: AdminEvent[];
  health: {
    leader: boolean;
    uptimeSec: number;
    sockets: number;
    lastDbWriteMs: number | null;
    failedWrites: number;
  };
}

export type AdminCommand =
  | { type: "start" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "endQuestion" }
  | { type: "endGame" }
  | { type: "setRegistration"; open: boolean }
  | { type: "removeTeam"; teamId: string };

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type Ack<T extends object = {}> = ({ ok: true } & T) | { ok: false; code: string; message: string };

export interface ServerToClientEvents {
  state: (snapshot: PublicSnapshot) => void;
  progress: (update: ProgressUpdate) => void;
  lobby: (update: LobbyUpdate) => void;
  "team:self": (self: TeamSelf) => void;
  "team:removed": () => void;
  "team:superseded": () => void;
  "admin:snapshot": (snapshot: AdminSnapshot) => void;
}

export interface ClientToServerEvents {
  "time:sync": (clientSentAt: number, ack: (serverNow: number) => void) => void;
  "answer:submit": (
    payload: { questionIndex: number; choiceIndex: number },
    ack: (result: Ack<{ choiceIndex: number; duplicate?: boolean }>) => void,
  ) => void;
  "admin:watch": (payload: { sessionId: string }, ack: (result: Ack) => void) => void;
  "admin:command": (payload: { sessionId: string; command: AdminCommand }, ack: (result: Ack) => void) => void;
}

export type InternalNotification =
  | { type: "team.joined"; sessionId: string; teamId: string }
  | { type: "session.updated"; sessionId: string }
  | { type: "session.deleted"; sessionId: string }
  | { type: "admin.loggedOut"; adminSessionId: string };

export const SOCKET_ERRORS = {
  notReady: "not_ready",
  unauthorized: "unauthorized",
  removed: "team_removed",
  sessionMissing: "session_missing",
} as const;
