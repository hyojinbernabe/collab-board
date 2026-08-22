import { addColumn } from "@collab-board/shared";
import { useState } from "react";
import type * as Y from "yjs";
import { useBoard } from "../sync";
import { ColumnView } from "./ColumnView";
import { InlineEditor } from "./InlineEditor";

export function Board({ doc }: { doc: Y.Doc }) {
  const board = useBoard(doc);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);

  return (
    <div className="board-scroll">
      <div className="board">
        {board.columns.map((column) => (
          <ColumnView
            key={column.id}
            column={column}
            doc={doc}
            draggingId={draggingId}
            setDraggingId={setDraggingId}
          />
        ))}

        <div className="column column--ghost">
          {addingColumn ? (
            <InlineEditor
              placeholder="Column name"
              className="column__title-editor"
              onSubmit={(title) => {
                addColumn(doc, title);
                setAddingColumn(false);
              }}
              onCancel={() => setAddingColumn(false)}
            />
          ) : (
            <button className="column__add" onClick={() => setAddingColumn(true)}>
              + Add a column
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
