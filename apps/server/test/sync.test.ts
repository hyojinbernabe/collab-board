import {
  addCard,
  ensureDefaultColumns,
  moveCard,
  readBoard,
  renameColumn,
  setCardColor,
  updateCardText,
} from "@collab-board/shared";
import { afterEach, describe, expect, it } from "vitest";
import { startSyncServer, type SyncServer } from "../src/server";
import { MemoryStore } from "../src/store";
import { closeClient, connectClient, sleep, waitFor, waitForSync, type TestClient } from "./helpers";

let server: SyncServer | undefined;
let clients: TestClient[] = [];

async function start(store = new MemoryStore(), compactEvery?: number) {
  server = await startSyncServer({ store, port: 0, compactEvery });
  return server;
}

async function connect(boardId: string, count: number) {
  const created = Array.from({ length: count }, () => connectClient(server!.port, boardId));
  clients.push(...created);
  await Promise.all(created.map(waitForSync));
  return created;
}

const boardJson = (client: TestClient) => JSON.stringify(readBoard(client.doc));
const allSame = (group: TestClient[]) => group.every((client) => boardJson(client) === boardJson(group[0]));
const cardCount = (client: TestClient) => readBoard(client.doc).columns.flatMap((c) => c.cards).length;

afterEach(async () => {
  clients.forEach(closeClient);
  clients = [];
  await server?.close();
  server = undefined;
});

describe("sync server", () => {
  it("gets several clients editing at once to the same board", async () => {
    await start();
    const [alice, bob, carol] = await connect("team", 3);
    ensureDefaultColumns(alice.doc);
    await waitFor(() => readBoard(bob.doc).columns.length === 3 && readBoard(carol.doc).columns.length === 3);

    // everyone edits in the same tick, before any update can travel
    const aliceCard = addCard(alice.doc, "todo", "write tests");
    addCard(bob.doc, "todo", "fix login");
    addCard(carol.doc, "doing", "deploy");
    renameColumn(bob.doc, "done", "Shipped");
    setCardColor(alice.doc, aliceCard, "blue");

    await waitFor(() => cardCount(alice) === 3 && allSame([alice, bob, carol]));
    const board = readBoard(carol.doc);
    expect(board.columns.map((c) => c.title)).toEqual(["To do", "Doing", "Shipped"]);
    expect(board.columns[0].cards.map((c) => c.text).sort()).toEqual(["fix login", "write tests"]);
    expect(board.columns[0].cards.find((c) => c.id === aliceCard)?.color).toBe("blue");
  });

  it("keeps offline edits and merges them on reconnect", async () => {
    await start();
    const [alice, bob] = await connect("offline", 2);
    ensureDefaultColumns(alice.doc);
    const shared = addCard(alice.doc, "todo", "shared card");
    await waitFor(() => cardCount(bob) === 1);

    alice.provider.disconnect();
    addCard(alice.doc, "todo", "made offline");
    updateCardText(alice.doc, shared, "renamed offline");
    // bob stays online and moves the same card alice is renaming
    moveCard(bob.doc, shared, "done", 0);
    addCard(bob.doc, "doing", "made online");

    await sleep(100);
    expect(cardCount(alice)).toBe(2);
    expect(cardCount(bob)).toBe(2);

    alice.provider.connect();
    await waitFor(() => cardCount(alice) === 3 && allSame([alice, bob]));

    const placed = readBoard(bob.doc).columns.flatMap((column) =>
      column.cards.map((card) => `${column.id}: ${card.text}`),
    );
    expect(placed.sort()).toEqual(["doing: made online", "done: renamed offline", "todo: made offline"]);
  });

  it("keeps boards separate", async () => {
    await start();
    const [onA] = await connect("board-a", 1);
    const [onB] = await connect("board-b", 1);
    ensureDefaultColumns(onA.doc);
    addCard(onA.doc, "todo", "only on a");

    const [lateOnA] = await connect("board-a", 1);
    await waitFor(() => cardCount(lateOnA) === 1);
    expect(readBoard(onB.doc).columns).toHaveLength(0);
  });

  it("loads a board back from the store after a restart", async () => {
    const store = new MemoryStore();
    await start(store);
    const [alice] = await connect("saved", 1);
    ensureDefaultColumns(alice.doc);
    addCard(alice.doc, "doing", "survives restart");
    await sleep(100);
    await server!.close();

    await start(store);
    const [later] = await connect("saved", 1);
    expect(readBoard(later.doc).columns[1].cards.map((c) => c.text)).toEqual(["survives restart"]);
  });

  it("compacts stored updates into a snapshot", async () => {
    const store = new MemoryStore();
    await start(store, 10);
    const [alice] = await connect("busy", 1);
    ensureDefaultColumns(alice.doc);
    for (let i = 0; i < 25; i++) addCard(alice.doc, "todo", `card ${i}`);
    await sleep(200);

    const rows = await store.load("busy");
    expect(rows.length).toBeLessThan(10);

    const [bob] = await connect("busy", 1);
    expect(cardCount(bob)).toBe(25);
    expect(readBoard(bob.doc).columns[0].cards.at(-1)?.text).toBe("card 24");
  });

  it("shares cursors and drops them when a client leaves", async () => {
    await start();
    const [alice, bob] = await connect("cursors", 2);
    alice.provider.awareness.setLocalState({ user: { name: "Alice", color: "#e11d48" }, cursor: { x: 10, y: 20 } });

    const aliceId = alice.doc.clientID;
    await waitFor(() => bob.provider.awareness.getStates().has(aliceId));
    expect(bob.provider.awareness.getStates().get(aliceId)).toMatchObject({ cursor: { x: 10, y: 20 } });

    alice.provider.disconnect();
    await waitFor(() => !bob.provider.awareness.getStates().has(aliceId));
  });

  it("rejects a bad board id", async () => {
    await start();
    const socket = new WebSocket(`ws://localhost:${server!.port}/${"x".repeat(100)}`);
    const code = await new Promise<number>((resolve) => {
      socket.addEventListener("close", (event) => resolve(event.code));
    });
    expect(code).toBe(1008);
  });
});
