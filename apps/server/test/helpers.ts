import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";

export interface TestClient {
  doc: Y.Doc;
  provider: WebsocketProvider;
}

export function connectClient(port: number, boardId: string): TestClient {
  const doc = new Y.Doc();
  // disableBc stops clients in the same process from syncing through
  // BroadcastChannel, so everything really goes through the server
  const provider = new WebsocketProvider(`ws://localhost:${port}`, boardId, doc, { disableBc: true });
  return { doc, provider };
}

export function closeClient(client: TestClient) {
  client.provider.destroy();
  client.doc.destroy();
}

export function waitForSync(client: TestClient): Promise<void> {
  if (client.provider.synced) return Promise.resolve();
  return new Promise((resolve) => {
    const onSync = (synced: boolean) => {
      if (!synced) return;
      client.provider.off("sync", onSync);
      resolve();
    };
    client.provider.on("sync", onSync);
  });
}

export async function waitFor(check: () => boolean, timeoutMs = 5000): Promise<void> {
  const started = Date.now();
  while (!check()) {
    if (Date.now() - started > timeoutMs) throw new Error("timed out waiting for condition");
    await sleep(20);
  }
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
