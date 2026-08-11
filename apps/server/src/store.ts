// where a board's yjs updates live between restarts.
// the server only ever appends updates, and now and then swaps them all
// for a single merged snapshot so loading stays fast.
export interface UpdateStore {
  load(boardId: string): Promise<Uint8Array[]>;
  append(boardId: string, update: Uint8Array): Promise<void>;
  replaceAll(boardId: string, snapshot: Uint8Array): Promise<void>;
  close?(): Promise<void>;
}

export class MemoryStore implements UpdateStore {
  private boards = new Map<string, Uint8Array[]>();

  async load(boardId: string) {
    return [...(this.boards.get(boardId) ?? [])];
  }

  async append(boardId: string, update: Uint8Array) {
    const updates = this.boards.get(boardId) ?? [];
    updates.push(update);
    this.boards.set(boardId, updates);
  }

  async replaceAll(boardId: string, snapshot: Uint8Array) {
    this.boards.set(boardId, [snapshot]);
  }
}
