import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PostgresStore } from "../src/postgres-store";

// PGlite is real postgres compiled to wasm, so the sql runs for real without a database server
let db: PGlite;
let store: PostgresStore;

beforeAll(async () => {
  db = new PGlite();
  store = new PostgresStore(db);
  await store.migrate();
});

afterAll(async () => {
  await db.close();
});

const bytes = (...values: number[]) => new Uint8Array(values);

describe("PostgresStore", () => {
  it("returns nothing for a new board", async () => {
    expect(await store.load("empty")).toEqual([]);
  });

  it("returns updates in the order they were appended", async () => {
    await store.append("ordered", bytes(1));
    await store.append("ordered", bytes(2, 2));
    await store.append("other", bytes(9));
    expect(await store.load("ordered")).toEqual([bytes(1), bytes(2, 2)]);
  });

  it("replaces every update with one snapshot", async () => {
    await store.append("compacted", bytes(1));
    await store.append("compacted", bytes(2));
    await store.replaceAll("compacted", bytes(7, 7, 7));
    await store.append("compacted", bytes(3));
    expect(await store.load("compacted")).toEqual([bytes(7, 7, 7), bytes(3)]);
  });

  it("can run the migration twice", async () => {
    await expect(store.migrate()).resolves.toBeUndefined();
  });
});
