import type { Column } from "@collab-board/shared";
import type * as Y from "yjs";
import { CardView } from "./CardView";

export function ColumnView({ column, doc }: { column: Column; doc: Y.Doc }) {
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
    </section>
  );
}
