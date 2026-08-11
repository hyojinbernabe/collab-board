import { startSyncServer } from "./server.js";
import { MemoryStore } from "./store.js";

const port = Number(process.env.PORT ?? 1234);
const store = new MemoryStore();

const server = await startSyncServer({ port, store });
console.log(`sync server listening on ${server.port}`);

async function shutdown() {
  await server.close();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
