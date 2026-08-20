import { addCard, type Column } from "@collab-board/shared";
import { useState } from "react";
import type * as Y from "yjs";
import { CardView } from "./CardView";
import { InlineEditor } from "./InlineEditor";

export function ColumnView({ column, doc }: { column: Column; doc: Y.Doc }) {
  const [adding, setAdding] = useState(false);

  return (
    <section className="column">
      <header className="column__header">
        <h2 className="column__title">{column.title}</h2>
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
