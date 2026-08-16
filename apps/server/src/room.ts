import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import * as awarenessProtocol from "y-protocols/awareness";
import * as syncProtocol from "y-protocols/sync";
import { WebSocket } from "ws";
import * as Y from "yjs";
import type { UpdateStore } from "./store.js";

// message types from the y-websocket protocol, so the stock client can talk to us
const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

// one open board: the shared doc, who is connected, and their cursors
export class Room {
  readonly doc = new Y.Doc();
  readonly awareness = new awarenessProtocol.Awareness(this.doc);
  // each socket and the awareness client ids it owns, so we can clear them when it leaves
  private connections = new Map<WebSocket, Set<number>>();
  private writes: Promise<void> = Promise.resolve();
  private updatesSinceSnapshot = 0;
  private closed?: Promise<void>;

  private constructor(
    readonly boardId: string,
    private store: UpdateStore,
    private compactEvery: number,
  ) {
    // the server has no cursor of its own
    this.awareness.setLocalState(null);
  }

  static async load(boardId: string, store: UpdateStore, compactEvery: number): Promise<Room> {
    const room = new Room(boardId, store, compactEvery);
    const updates = await store.load(boardId);
    Y.transact(room.doc, () => {
      for (const update of updates) Y.applyUpdate(room.doc, update);
    });
    room.updatesSinceSnapshot = updates.length;
    // listen after loading so stored updates don't get written back
    room.doc.on("update", room.onDocUpdate);
    room.awareness.on("update", room.onAwarenessUpdate);
    return room;
  }

  get connectionCount() {
    return this.connections.size;
  }

  addConnection(socket: WebSocket) {
    this.connections.set(socket, new Set());

    const syncEncoder = encoding.createEncoder();
    encoding.writeVarUint(syncEncoder, MESSAGE_SYNC);
    syncProtocol.writeSyncStep1(syncEncoder, this.doc);
    send(socket, encoding.toUint8Array(syncEncoder));

    const clientIds = [...this.awareness.getStates().keys()];
    if (clientIds.length > 0) {
      send(socket, awarenessMessage(this.awareness, clientIds));
    }
  }

  removeConnection(socket: WebSocket) {
    const clientIds = this.connections.get(socket);
    this.connections.delete(socket);
    if (clientIds && clientIds.size > 0) {
      awarenessProtocol.removeAwarenessStates(this.awareness, [...clientIds], null);
    }
  }

  handleMessage(socket: WebSocket, message: Uint8Array) {
    const decoder = decoding.createDecoder(message);
    const messageType = decoding.readVarUint(decoder);

    if (messageType === MESSAGE_SYNC) {
      const reply = encoding.createEncoder();
      encoding.writeVarUint(reply, MESSAGE_SYNC);
      // applies the client's update with the socket as origin, see onDocUpdate
      syncProtocol.readSyncMessage(decoder, reply, this.doc, socket);
      if (encoding.length(reply) > 1) send(socket, encoding.toUint8Array(reply));
    } else if (messageType === MESSAGE_AWARENESS) {
      awarenessProtocol.applyAwarenessUpdate(this.awareness, decoding.readVarUint8Array(decoder), socket);
    }
  }

  // write everything down and stop. returns once the store has it all.
  close(): Promise<void> {
    this.closed ??= this.saveAndDestroy();
    return this.closed;
  }

  private async saveAndDestroy() {
    this.doc.off("update", this.onDocUpdate);
    if (this.updatesSinceSnapshot > 1) this.compact();
    await this.writes;
    this.awareness.destroy();
    this.doc.destroy();
  }

  private onDocUpdate = (update: Uint8Array, origin: unknown) => {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeUpdate(encoder, update);
    const message = encoding.toUint8Array(encoder);
    for (const socket of this.connections.keys()) {
      if (socket !== origin) send(socket, message);
    }

    this.queueWrite(() => this.store.append(this.boardId, update));
    this.updatesSinceSnapshot++;
    if (this.updatesSinceSnapshot >= this.compactEvery) this.compact();
  };

  private onAwarenessUpdate = (
    { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown,
  ) => {
    const owned = origin instanceof WebSocket ? this.connections.get(origin) : undefined;
    if (owned) {
      added.forEach((id) => owned.add(id));
      removed.forEach((id) => owned.delete(id));
    }
    const message = awarenessMessage(this.awareness, [...added, ...updated, ...removed]);
    for (const socket of this.connections.keys()) send(socket, message);
  };

  // the snapshot is taken now, but written in queue order. every update that came
  // before it is already in the snapshot, and every update after it is appended
  // after the snapshot lands, so nothing gets lost.
  private compact() {
    const snapshot = Y.encodeStateAsUpdate(this.doc);
    this.updatesSinceSnapshot = 1;
    this.queueWrite(() => this.store.replaceAll(this.boardId, snapshot));
  }

  private queueWrite(write: () => Promise<void>) {
    this.writes = this.writes.then(write).catch((error) => {
      console.error(`failed to save board ${this.boardId}`, error);
    });
  }
}

function awarenessMessage(awareness: awarenessProtocol.Awareness, clientIds: number[]) {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
  encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(awareness, clientIds));
  return encoding.toUint8Array(encoder);
}

function send(socket: WebSocket, message: Uint8Array) {
  if (socket.readyState === WebSocket.OPEN) socket.send(message);
}
