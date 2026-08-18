import type * as Y from "yjs";
import { useBoard } from "../sync";
import { ColumnView } from "./ColumnView";

export function Board({ doc }: { doc: Y.Doc }) {
  const board = useBoard(doc);

  return (
    <div className="board-scroll">
      <div className="board">
        {board.columns.map((column) => (
          <ColumnView key={column.id} column={column} doc={doc} />
        ))}
      </div>
    </div>
  );
}
