import http from "node:http";
import type { AddressInfo } from "node:net";
import { WebSocket, WebSocketServer } from "ws";
import { Room } from "./room.js";
import type { UpdateStore } from "./store.js";

export interface SyncServerOptions {
  store: UpdateStore;
  port?: number;
  // how many updates to append before merging them into one snapshot
  compactEvery?: number;
}

export interface SyncServer {
  port: number;
  close(): Promise<void>;
}

const BOARD_ID = /^[\w-]{1,64}$/;
const PING_INTERVAL_MS = 30_000;

export async function startSyncServer({
  store,
  port = 1234,
  compactEvery = 100,
}: SyncServerOptions): Promise<SyncServer> {
  const rooms = new Map<string, Promise<Room>>();
  // a board that is still saving after its last user left. reopening it waits for that.
  const closing = new Map<string, Promise<void>>();

  function openRoom(boardId: string): Promise<Room> {
    let room = rooms.get(boardId);
    if (!room) {
      room = (closing.get(boardId) ?? Promise.resolve()).then(() => Room.load(boardId, store, compactEvery));
      rooms.set(boardId, room);
      room.catch(() => rooms.delete(boardId));
    }
    return room;
  }

  function closeRoomIfEmpty(room: Room) {
    if (room.connectionCount > 0 || closing.has(room.boardId)) return;
    rooms.delete(room.boardId);
    const done = room.close().finally(() => closing.delete(room.boardId));
    closing.set(room.boardId, done);
  }

  const httpServer = http.createServer((request, response) => {
    if (request.url === "/health") {
      response.writeHead(200, { "content-type": "text/plain" }).end("ok");
      return;
    }
    response.writeHead(404).end();
  });

  const wss = new WebSocketServer({ server: httpServer });

  wss.on("connection", async (socket, request) => {
    // the client connects to /<boardId>
    const boardId = decodeURIComponent((request.url ?? "/").slice(1).split("?")[0]);
    if (!BOARD_ID.test(boardId)) {
      socket.close(1008, "bad board id");
      return;
    }

    socket.binaryType = "arraybuffer";
    let room: Room | undefined;
    // messages can arrive while the board is still loading from the store
    const early: Uint8Array[] = [];

    const handle = (message: Uint8Array) => {
      try {
        room!.handleMessage(socket, message);
      } catch (error) {
        console.error(`bad message on board ${boardId}`, error);
        socket.close(1003, "bad message");
      }
    };

    socket.on("message", (data: ArrayBuffer) => {
      const message = new Uint8Array(data);
      if (room) handle(message);
      else early.push(message);
    });

    let alive = true;
    socket.on("pong", () => (alive = true));
    const ping = setInterval(() => {
      if (!alive) return socket.terminate();
      alive = false;
      socket.ping();
    }, PING_INTERVAL_MS);

    socket.on("close", () => {
      clearInterval(ping);
      if (!room) return;
      room.removeConnection(socket);
      closeRoomIfEmpty(room);
    });

    try {
      const loaded = await openRoom(boardId);
      if (socket.readyState !== WebSocket.OPEN) {
        closeRoomIfEmpty(loaded);
        return;
      }
      room = loaded;
      room.addConnection(socket);
      early.forEach(handle);
    } catch (error) {
      console.error(`could not load board ${boardId}`, error);
      socket.close(1011, "could not load board");
    }
  });

  await new Promise<void>((resolve) => httpServer.listen(port, resolve));

  return {
    port: (httpServer.address() as AddressInfo).port,
    async close() {
      for (const socket of wss.clients) socket.terminate();
      const open = await Promise.allSettled(rooms.values());
      rooms.clear();
      await Promise.all([
        ...closing.values(),
        ...open.map((result) => (result.status === "fulfilled" ? result.value.close() : undefined)),
      ]);
      await new Promise((resolve) => wss.close(resolve));
      await new Promise((resolve) => httpServer.close(resolve));
    },
  };
}
