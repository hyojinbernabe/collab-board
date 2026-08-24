import { addColumn } from "@collab-board/shared";
import { useRef, useState, type MouseEvent } from "react";
import type { Awareness } from "y-protocols/awareness";
import type * as Y from "yjs";
import { useBoard, type Presence } from "../sync";
import { ColumnView } from "./ColumnView";
import { Cursors } from "./Cursors";
import { InlineEditor } from "./InlineEditor";

interface Props {
  doc: Y.Doc;
  awareness: Awareness;
  others: Presence[];
}

export function Board({ doc, awareness, others }: Props) {
  const board = useBoard(doc);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  // cursor positions are relative to the board canvas, not the window, so they
  // line up for people with different window sizes or scroll positions
  const shareCursor = (event: MouseEvent) => {
    const { clientX, clientY } = event;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      awareness.setLocalStateField("cursor", { x: Math.round(clientX - rect.left), y: Math.round(clientY - rect.top) });
    });
  };

  const hideCursor = () => {
    cancelAnimationFrame(frame.current);
    awareness.setLocalStateField("cursor", null);
  };

  return (
    <div className="board-scroll">
      <div
        className="board"
        ref={canvasRef}
        onMouseMove={shareCursor}
        // mousemove doesn't fire during a drag, dragover does
        onDragOver={shareCursor}
        onMouseLeave={hideCursor}
      >
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

        <Cursors others={others} />
      </div>
    </div>
  );
}
