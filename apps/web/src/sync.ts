import { ensureDefaultColumns, readBoard, type BoardState } from "@collab-board/shared";
import { useEffect, useState } from "react";
import { IndexeddbPersistence } from "y-indexeddb";
import type { Awareness } from "y-protocols/awareness";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";
import type { LocalUser } from "./user";

export type ConnectionStatus = "connecting" | "online" | "offline";

export interface BoardConnection {
  doc: Y.Doc;
  awareness: Awareness;
}

export interface Presence {
  clientId: number;
  user: LocalUser;
  cursor: { x: number; y: number } | null;
}

const SYNC_URL =
  import.meta.env.VITE_SYNC_URL ||
  `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.hostname}:1234`;

export function useBoardConnection(boardId: string) {
  const [connection, setConnection] = useState<BoardConnection | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");

  useEffect(() => {
    const doc = new Y.Doc();
    // keeps a copy in the browser, so edits made offline survive a reload
    const localCopy = new IndexeddbPersistence(`collab-board:${boardId}`, doc);
    const provider = new WebsocketProvider(SYNC_URL, boardId, doc);

    provider.on("status", ({ status: next }) => {
      if (next === "connected") setStatus("online");
      else if (next === "disconnected") setStatus("offline");
      // while retrying it flips between connecting and disconnected, keep showing offline
      else setStatus((current) => (current === "offline" ? "offline" : "connecting"));
    });

    localCopy.on("synced", () => ensureDefaultColumns(doc));
    provider.on("sync", (synced) => {
      if (synced) ensureDefaultColumns(doc);
    });

    // a dead socket can take a while to notice on its own, so react to the browser right away
    const goOffline = () => provider.disconnect();
    const goOnline = () => provider.connect();
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);

    setConnection({ doc, awareness: provider.awareness });
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
      provider.destroy();
      localCopy.destroy();
      doc.destroy();
    };
  }, [boardId]);

  return { connection, status };
}

export function useBoard(doc: Y.Doc): BoardState {
  const [board, setBoard] = useState(() => readBoard(doc));

  useEffect(() => {
    const update = () => setBoard(readBoard(doc));
    update();
    doc.on("update", update);
    return () => doc.off("update", update);
  }, [doc]);

  return board;
}

// everyone else on the board, with their name, color and cursor
export function useOthers(awareness: Awareness): Presence[] {
  const [others, setOthers] = useState<Presence[]>([]);

  useEffect(() => {
    const update = () => {
      const list: Presence[] = [];
      awareness.getStates().forEach((state, clientId) => {
        if (clientId === awareness.clientID || !state.user) return;
        list.push({ clientId, user: state.user, cursor: state.cursor ?? null });
      });
      setOthers(list);
    };
    update();
    awareness.on("change", update);
    return () => awareness.off("change", update);
  }, [awareness]);

  return others;
}
