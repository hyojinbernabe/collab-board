import pg from "pg";
import type { UpdateStore } from "./store.js";

// pg.Pool and PGlite (used in tests) both look like this
export interface Queryable {
  query<Row>(text: string, params?: unknown[]): Promise<{ rows: Row[] }>;
}

const schema = `
  create table if not exists board_updates (
    id bigserial primary key,
    board_id text not null,
    data bytea not null,
    created_at timestamptz not null default now()
  );
  create index if not exists board_updates_board_id_idx on board_updates (board_id, id);
`;

export class PostgresStore implements UpdateStore {
  constructor(
    private db: Queryable,
    private onClose?: () => Promise<void>,
  ) {}

  static async connect(connectionString: string): Promise<PostgresStore> {
    const pool = new pg.Pool({ connectionString });
    const store = new PostgresStore(pool, () => pool.end());
    await store.migrate();
    return store;
  }

  async migrate() {
    await this.db.query(schema);
  }

  async load(boardId: string) {
    const { rows } = await this.db.query<{ data: Uint8Array }>(
      "select data from board_updates where board_id = $1 order by id",
      [boardId],
    );
    return rows.map((row) => new Uint8Array(row.data));
  }

  async append(boardId: string, update: Uint8Array) {
    await this.db.query("insert into board_updates (board_id, data) values ($1, $2)", [
      boardId,
      Buffer.from(update),
    ]);
  }

  // one statement, so a crash halfway can't leave the board empty
  async replaceAll(boardId: string, snapshot: Uint8Array) {
    await this.db.query(
      `with removed as (delete from board_updates where board_id = $1)
       insert into board_updates (board_id, data) values ($1, $2)`,
      [boardId, Buffer.from(snapshot)],
    );
  }

  async close() {
    await this.onClose?.();
  }
}
