import type { Card } from "@collab-board/shared";
import type * as Y from "yjs";

export function CardView({ card }: { card: Card; doc: Y.Doc }) {
  return (
    <article className={`card card--${card.color}`}>
      <p className="card__text">{card.text}</p>
    </article>
  );
}
