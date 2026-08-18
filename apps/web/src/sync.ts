import { ensureDefaultColumns, readBoard, type BoardState } from "@collab-board/shared";
import { useEffect, useState } from "react";
import type { Awareness } from "y-protocols/awareness";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";

export interface BoardConnection {
  doc: Y.Doc;
  awareness: Awareness;
}

const SYNC_URL =
  import.meta.env.VITE_SYNC_URL ||
  `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.hostname}:1234`;

export function useBoardConnection(boardId: string) {
  const [connection, setConnection] = useState<BoardConnection | null>(null);

  useEffect(() => {
    const doc = new Y.Doc();
    const provider = new WebsocketProvider(SYNC_URL, boardId, doc);

    provider.on("sync", (synced) => {
      if (synced) ensureDefaultColumns(doc);
    });

    setConnection({ doc, awareness: provider.awareness });
    return () => {
      provider.destroy();
      doc.destroy();
    };
  }, [boardId]);

  return connection;
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
