import { existsSync } from "node:fs";
import { PostgresStore } from "./postgres-store.js";
import { startSyncServer } from "./server.js";
import { MemoryStore, type UpdateStore } from "./store.js";

if (existsSync(".env")) process.loadEnvFile();

const port = Number(process.env.PORT ?? 1234);
const databaseUrl = process.env.DATABASE_URL;

let store: UpdateStore;
if (databaseUrl) {
  store = await PostgresStore.connect(databaseUrl);
  console.log("saving boards to postgres");
} else {
  store = new MemoryStore();
  console.log("no DATABASE_URL, boards are kept in memory only");
}

const server = await startSyncServer({ port, store });
console.log(`sync server listening on ${server.port}`);

async function shutdown() {
  await server.close();
  await store.close?.();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
