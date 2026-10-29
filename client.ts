"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  Ack,
  AdminCommand,
  AdminSnapshot,
  ClientToServerEvents,
  LobbyUpdate,
  PublicSnapshot,
  ServerToClientEvents,
  TeamSelf,
} from "./protocol";

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "removed"
  | "superseded"
  | "unauthorized"
  | "missing";

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface Options {
  role: "team" | "admin" | "screen";
  sessionId: string;
}

const REALTIME_URL = process.env.NEXT_PUBLIC_REALTIME_URL ?? "http://localhost:4000";

async function fetchTicket(role: "team" | "admin"): Promise<{ ticket?: string; status: number }> {
  try {
    const res = await fetch("/api/realtime/ticket", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role }),
      credentials: "same-origin",
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as { ticket?: string };
    return { ticket: data.ticket, status: res.status };
  } catch {
    return { status: 0 };
  }
}

/** Estimates serverNow − Date.now() from the lowest-latency of several pings. */
async function measureOffset(socket: GameSocket): Promise<number | null> {
  let best: { rtt: number; offset: number } | null = null;
  for (let i = 0; i < 5; i++) {
    const t0 = Date.now();
    try {
      const serverNow = await socket.timeout(3000).emitWithAck("time:sync", t0);
      const t1 = Date.now();
      const sample = { rtt: t1 - t0, offset: serverNow - (t0 + t1) / 2 };
      if (!best || sample.rtt < best.rtt) best = sample;
    } catch {
      /* skip lost sample */
    }
  }
  return best?.offset ?? null;
}

/**
 * One socket connection to the realtime server with automatic reconnection,
 * fresh tickets on every attempt, and server-clock synchronisation.
 */
export function useGameConnection({ role, sessionId }: Options) {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [snapshot, setSnapshot] = useState<PublicSnapshot | null>(null);
  const [self, setSelf] = useState<TeamSelf | null>(null);
  const [lobby, setLobby] = useState<LobbyUpdate | null>(null);
  const [admin, setAdmin] = useState<AdminSnapshot | null>(null);
  const [offsetMs, setOffsetMs] = useState(0);
  const socketRef = useRef<GameSocket | null>(null);
  const terminalRef = useRef(false);
  const syncedRef = useRef(false);

  useEffect(() => {
    terminalRef.current = false;
    const socket: GameSocket = io(REALTIME_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 600,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.6,
      timeout: 15_000,
      auth: (cb) => {
        if (role === "screen") return cb({ role: "screen", sessionId });
        void fetchTicket(role).then(({ ticket, status: httpStatus }) => {
          if (httpStatus === 401) {
            terminalRef.current = true;
            setStatus("unauthorized");
          }
          cb(ticket ? { ticket } : {});
        });
      },
    });
    socketRef.current = socket;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let syncTimer: ReturnType<typeof setInterval> | null = null;

    const sync = async () => {
      const offset = await measureOffset(socket);
      if (offset !== null) {
        syncedRef.current = true;
        setOffsetMs(offset);
      }
    };

    socket.on("connect", () => {
      setStatus("connected");
      void sync();
      if (role === "admin") {
        socket.emit("admin:watch", { sessionId }, (res: Ack) => {
          if (!res.ok && res.code === "unauthorized") {
            terminalRef.current = true;
            setStatus("unauthorized");
          }
        });
      }
    });
    socket.on("disconnect", () => {
      if (!terminalRef.current) setStatus("reconnecting");
    });
    socket.on("connect_error", (err) => {
      if (terminalRef.current) return;
      const code = err.message;
      if (code === "unauthorized") {
        terminalRef.current = true;
        setStatus("unauthorized");
        return;
      }
      if (code === "team_removed") {
        terminalRef.current = true;
        setStatus("removed");
        return;
      }
      if (code === "session_missing") {
        terminalRef.current = true;
        setStatus("missing");
        return;
      }
      setStatus("reconnecting");
      // Errors from server middleware disable built-in retries; retry ourselves.
      if (!socket.active) {
        retryTimer = setTimeout(() => socket.connect(), 1000 + Math.random() * 2500);
      }
    });
    socket.on("state", (s) => {
      setSnapshot(s);
      if (!syncedRef.current) setOffsetMs(s.serverNow - Date.now());
    });
    socket.on("progress", (p) =>
      setSnapshot((s) => (s && s.currentIndex === p.questionIndex ? { ...s, answeredCount: Math.max(s.answeredCount, p.answeredCount) } : s)),
    );
    socket.on("lobby", setLobby);
    socket.on("team:self", setSelf);
    socket.on("admin:snapshot", setAdmin);
    socket.on("team:removed", () => {
      terminalRef.current = true;
      setStatus("removed");
    });
    socket.on("team:superseded", () => {
      terminalRef.current = true;
      setStatus("superseded");
    });

    socket.connect();
    syncTimer = setInterval(() => {
      if (socket.connected) void sync();
    }, 60_000);

    return () => {
      if (retryTimer) clearTimeout(retryTimer);
      if (syncTimer) clearInterval(syncTimer);
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [role, sessionId]);

  const submitAnswer = useCallback(async (questionIndex: number, choiceIndex: number) => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) return { ok: false, code: "offline", message: "Reconnecting…" } as const;
    try {
      return await socket.timeout(6000).emitWithAck("answer:submit", { questionIndex, choiceIndex });
    } catch {
      return { ok: false, code: "timeout", message: "No response from the server." } as const;
    }
  }, []);

  const sendCommand = useCallback(async (command: AdminCommand): Promise<Ack> => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) return { ok: false, code: "offline", message: "Not connected to the realtime server." };
    try {
      return await socket.timeout(15_000).emitWithAck("admin:command", { sessionId, command });
    } catch {
      return { ok: false, code: "timeout", message: "The realtime server did not respond." };
    }
  }, [sessionId]);

  return { status, snapshot, self, lobby, admin, offsetMs, submitAnswer, sendCommand };
}
