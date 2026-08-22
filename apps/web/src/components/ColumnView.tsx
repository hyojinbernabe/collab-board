import { addCard, moveCard, renameColumn, type Column } from "@collab-board/shared";
import { Fragment, useRef, useState, type DragEvent } from "react";
import type * as Y from "yjs";
import { CardView } from "./CardView";
import { InlineEditor } from "./InlineEditor";

interface Props {
  column: Column;
  doc: Y.Doc;
  draggingId: string | null;
  setDraggingId: (cardId: string | null) => void;
}

export function ColumnView({ column, doc, draggingId, setDraggingId }: Props) {
  const [renaming, setRenaming] = useState(false);
  const [adding, setAdding] = useState(false);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // the slot under the mouse, counted among the cards that aren't being dragged
  const indexAt = (clientY: number) => {
    const cards = [...listRef.current!.querySelectorAll<HTMLElement>("[data-card-id]")].filter(
      (element) => element.dataset.cardId !== draggingId,
    );
    const index = cards.findIndex((element) => {
      const rect = element.getBoundingClientRect();
      return clientY < rect.top + rect.height / 2;
    });
    return index === -1 ? cards.length : index;
  };

  const onDragOver = (event: DragEvent) => {
    if (!draggingId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropIndex(indexAt(event.clientY));
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    const cardId = event.dataTransfer.getData("text/plain") || draggingId;
    if (cardId) moveCard(doc, cardId, column.id, indexAt(event.clientY));
    setDropIndex(null);
    setDraggingId(null);
  };

  const onDragLeave = (event: DragEvent) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropIndex(null);
  };

  let slot = 0;
  const dropMarker = <div className="drop-marker" />;

  return (
    <section className="column" onDragOver={onDragOver} onDrop={onDrop} onDragLeave={onDragLeave}>
      <header className="column__header">
        {renaming ? (
          <InlineEditor
            initialValue={column.title}
            className="column__title-editor"
            onSubmit={(title) => {
              renameColumn(doc, column.id, title);
              setRenaming(false);
            }}
            onCancel={() => setRenaming(false)}
          />
        ) : (
          <h2 className="column__title" onClick={() => setRenaming(true)} title="Click to rename">
            {column.title}
          </h2>
        )}
        <span className="column__count">{column.cards.length}</span>
      </header>

      <div className="column__cards" ref={listRef}>
        {column.cards.map((card) => {
          const isDragged = card.id === draggingId;
          const showMarker = !isDragged && dropIndex === slot;
          if (!isDragged) slot++;
          return (
            <Fragment key={card.id}>
              {showMarker && dropMarker}
              <CardView
                card={card}
                doc={doc}
                dragging={isDragged}
                onDragStart={() => setDraggingId(card.id)}
                onDragEnd={() => {
                  setDraggingId(null);
                  setDropIndex(null);
                }}
              />
            </Fragment>
          );
        })}
        {dropIndex === slot && dropMarker}
      </div>

      {adding ? (
        <InlineEditor
          multiline
          placeholder="What needs doing?"
          className="column__new-card"
          onSubmit={(text) => {
            addCard(doc, column.id, text);
            return true;
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button className="column__add" onClick={() => setAdding(true)}>
          + Add a card
        </button>
      )}
    </section>
  );
}
