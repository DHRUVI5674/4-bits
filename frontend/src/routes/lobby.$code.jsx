import { useEffect, useState, useRef } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { io } from "socket.io-client";
import {
  beginInvestigation,
  getRoomByCode,
  listPlayers,
  setReady,
  MODE_LABELS
} from "@/lib/rooms";
import { getPlayerId } from "@/lib/player-id";
import GameCanvas from "@/components/GameCanvas";

export const Route = createFileRoute("/lobby/$code")({
  component: Lobby
});

function Lobby() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [playerId, setPlayerId] = useState("");
  const [busy, setBusy] = useState(false);
  const [socket, setSocket] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    setPlayerId(getPlayerId());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await getRoomByCode(code);
        if (cancelled) return;
        setRoom(r);
        const p = await listPlayers(code);
        if (cancelled) return;
        setPlayers(p);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setNotFound(true);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  useEffect(() => {
    if (!room || !playerId) return;

    const API_BASE = import.meta.env.VITE_API_URL || window.location.origin;
    const sock = io(API_BASE, {
      auth: { roomCode: code, playerId }
    });
    socketRef.current = sock;
    setSocket(sock);

    sock.on("connect", () => {
      sock.emit("join-room");
    });

    sock.on("join-success", (data) => {
      setPlayers(data.players);
    });

    sock.on("player-joined", async () => {
      const p = await listPlayers(code);
      setPlayers(p);
    });

    sock.on("room-updated", (game) => {
      setRoom((prev) => prev ? { ...prev, ...game } : prev);
      setPlayers(game.players);
    });

    sock.on("player-ready-updated", async () => {
      const p = await listPlayers(code);
      setPlayers(p);
    });

    sock.on("game-started", () => {
      setRoom((prev) => prev ? { ...prev, status: "started" } : prev);
    });

    sock.on("player-left", async () => {
      const p = await listPlayers(code);
      setPlayers(p);
    });

    sock.on("host-changed", async () => {
      const r = await getRoomByCode(code);
      setRoom(r);
    });

    return () => {
      sock.disconnect();
      setSocket(null);
    };
  }, [room?.roomCode, code, playerId]);

  useEffect(() => {
    if (room?.status === "started") {
      navigate({ to: `/character-dossier/${code}` });
    }
  }, [room?.status, code, navigate]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[color:var(--color-bg-base)] px-6">
        <span className="tracked-caps text-[11px] text-[color:var(--color-text-tertiary)]">
          Retrieving the file…
        </span>
      </main>);

  }

  if (notFound || !room) {
    return (
      <main className="min-h-screen bg-[color:var(--color-bg-base)] px-6 py-16">
        <div className="mx-auto max-w-lg text-center">
          <span className="tracked-caps text-[10px] text-[color:var(--color-text-tertiary)]">
            Case File
          </span>
          <h1 className="font-serif-display mt-3 text-3xl text-[color:var(--color-text-primary)]">
            No such investigation
          </h1>
          <p className="mt-3 text-sm text-[color:var(--color-text-secondary)]">
            The code <span className="font-serif-display">{code}</span> is not on record.
          </p>
          <div className="mt-8">
            <Link
              to="/"
              className="tracked-caps text-[11px] text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)]">
              
              ← Return
            </Link>
          </div>
        </div>
      </main>);

  }

  const me = players.find((p) => p.playerId === playerId);
  const isHost = playerId === room.hostId;
  const maxPlayers = room.settings?.maxPlayers || 8;
  const minPlayers = room.settings?.minPlayers || 4;
  const meetsMin = players.length >= minPlayers;
  const allReady = players.length > 0 && players.every((p) => p.isReady);
  const canBegin = isHost && meetsMin && allReady && room.status === "waiting";

  const onToggleReady = async () => {
    if (!me || !socketRef.current) return;
    setBusy(true);
    socketRef.current.emit("player-ready");
    setBusy(false);
  };

  const onBegin = async () => {
    if (!canBegin || !socketRef.current) return;
    setBusy(true);
    socketRef.current.emit("start-game");
    setBusy(false);
  };

  return (
    <main className="min-h-screen bg-[color:var(--color-bg-base)] px-6 py-6 flex flex-col justify-center overflow-y-auto">
      <div className="mx-auto max-w-5xl w-full">
        <Link
          to="/"
          className="tracked-caps text-[10px] text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)]">
          
          ← Leave
        </Link>

        <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between">
          <div>
            <span className="tracked-caps text-[10px] text-[color:var(--color-text-tertiary)]">
              Investigation · {MODE_LABELS[room.mode] || 'Unknown'}
            </span>
            <h1 className="font-serif-display mt-1 text-2xl md:text-3xl text-[color:var(--color-text-primary)]">
              {room.name || 'Mystery Game'}
            </h1>
            <p className="mt-1 text-xs text-[color:var(--color-text-secondary)] max-w-2xl">
              Host: {room.players.find((p) => p.isHost)?.name || 'Unknown'} · {players.length} / {room.settings?.maxPlayers || 0} investigators
            </p>
          </div>
          <div className="text-right">
            <span className="tracked-caps block text-[9px] text-[color:var(--color-text-tertiary)]">
              Case Code
            </span>
            <span className="font-serif-display mt-0.5 block text-2xl tracking-[0.4em] text-[color:var(--color-accent-blood)]">
              {room.roomCode}
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-col md:flex-row gap-4 justify-center items-stretch">
          {socket && (
            <div className="w-full md:w-[480px] h-[360px] shrink-0 relative overflow-hidden bg-stone-950 border border-[color:var(--color-border-hairline-strong)]">
              <GameCanvas
                sceneKey="LobbyScene"
                socket={socket}
                roomCode={code}
                playerId={playerId}
                players={players}
              />
            </div>
          )}

          <div
            className="w-full md:w-[320px] h-[360px] border p-4 flex flex-col"
            style={{
              backgroundColor: "var(--color-bg-elevated)",
              borderColor: "var(--color-border-hairline-strong)"
            }}>
            
            <div className="flex items-baseline justify-between shrink-0">
              <span className="tracked-caps text-[11px] text-[color:var(--color-text-secondary)]">
                Investigators
              </span>
              <span className="tracked-caps text-[11px] text-[color:var(--color-text-tertiary)]">
                {players.length} / {maxPlayers}
              </span>
            </div>

            <ul className="mt-2 divide-y divide-[color:var(--color-border-hairline)] overflow-y-auto flex-1">
              {players.map((p) =>
              <li key={p.playerId} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-serif-display text-base text-[color:var(--color-text-primary)] truncate max-w-[150px]" title={p.name}>
                      {p.name}
                    </span>
                    {p.isHost &&
                  <span className="tracked-caps text-[8px] text-[color:var(--color-text-tertiary)] shrink-0">
                        Lead
                      </span>
                  }
                    {p.playerId === playerId &&
                  <span className="tracked-caps text-[8px] text-[color:var(--color-accent-blood-hover)] shrink-0">
                        You
                      </span>
                  }
                  </div>
                  <span
                  className="tracked-caps text-[9px] shrink-0"
                  style={{
                    color: p.isReady ?
                    "var(--color-text-primary)" :
                    "var(--color-text-tertiary)"
                  }}>
                  
                    {p.isReady ? "Ready" : "Waiting"}
                  </span>
                </li>
              )}
              {Array.from({ length: Math.max(0, maxPlayers - players.length) }).map((_, i) =>
              <li key={`empty-${i}`} className="flex items-center justify-between py-2 opacity-40">
                  <span className="tracked-caps text-[10px] text-[color:var(--color-text-tertiary)] truncate">
                    Awaiting investigator
                  </span>
                  <span className="tracked-caps text-[9px] text-[color:var(--color-text-tertiary)]">
                    —
                  </span>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          {me ?
          <button
            type="button"
            onClick={onToggleReady}
            disabled={busy}
            className="tracked-caps px-5 py-3 text-[11px] transition-colors"
            style={{
              border: `1px solid ${me.isReady ? "var(--color-accent-blood)" : "var(--color-border-hairline-strong)"}`,
              color: "var(--color-text-primary)",
              backgroundColor: me.isReady ? "rgba(113,26,36,0.15)" : "transparent"
            }}>
            
              {me.isReady ? "Mark as Waiting" : "Mark Ready"}
            </button> :

          <span className="tracked-caps text-[10px] text-[color:var(--color-text-tertiary)]">
              Observing only
            </span>
          }

          {isHost &&
          <button
            type="button"
            onClick={onBegin}
            disabled={!canBegin || busy}
            className="tracked-caps px-6 py-3 text-[11px] transition-colors"
            style={{
              backgroundColor: canBegin ?
              "var(--color-accent-blood)" :
              "transparent",
              color: canBegin ?
              "var(--color-text-primary)" :
              "var(--color-text-tertiary)",
              border: `1px solid ${canBegin ? "var(--color-accent-blood)" : "var(--color-border-hairline)"}`,
              cursor: canBegin ? "pointer" : "not-allowed"
            }}
            title={
            !meetsMin ?
            `Need at least ${minPlayers} investigators` :
            !allReady ?
            "All investigators must be ready" :
            undefined
            }>
            
              Begin the Investigation
            </button>
          }
        </div>

        {room.status === "started" &&
        <p className="mt-6 text-sm text-[color:var(--color-text-secondary)]">
            The investigation has begun.
          </p>
        }

        <p className="mt-4 text-xs text-[color:var(--color-text-tertiary)]">
          Share the code <span className="font-serif-display text-[color:var(--color-text-secondary)]">{room.roomCode}</span> with your fellow investigators so they can join.
        </p>
      </div>
    </main>);

}