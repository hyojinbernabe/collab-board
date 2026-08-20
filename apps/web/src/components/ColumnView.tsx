import { addCard, renameColumn, type Column } from "@collab-board/shared";
import { useState } from "react";
import type * as Y from "yjs";
import { CardView } from "./CardView";
import { InlineEditor } from "./InlineEditor";

export function ColumnView({ column, doc }: { column: Column; doc: Y.Doc }) {
  const [renaming, setRenaming] = useState(false);
  const [adding, setAdding] = useState(false);

  return (
    <section className="column">
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

      <div className="column__cards">
        {column.cards.map((card) => (
          <CardView key={card.id} card={card} doc={doc} />
        ))}
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
