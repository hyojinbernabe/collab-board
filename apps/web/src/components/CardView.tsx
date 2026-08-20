import { CARD_COLORS, deleteCard, setCardColor, updateCardText, type Card } from "@collab-board/shared";
import { useState } from "react";
import type * as Y from "yjs";
import { InlineEditor } from "./InlineEditor";

export function CardView({ card, doc }: { card: Card; doc: Y.Doc }) {
  const [editing, setEditing] = useState(false);

  return (
    <article className={`card card--${card.color}`}>
      {editing ? (
        <InlineEditor
          multiline
          initialValue={card.text}
          onSubmit={(text) => {
            updateCardText(doc, card.id, text);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
          className="card__editor"
        />
      ) : (
        <p className="card__text" onClick={() => setEditing(true)}>
          {card.text}
        </p>
      )}

      <footer className="card__tools">
        <div className="card__colors">
          {CARD_COLORS.map((color) => (
            <button
              key={color}
              className={`swatch swatch--${color} ${color === card.color ? "swatch--active" : ""}`}
              aria-label={`Make card ${color}`}
              onClick={() => setCardColor(doc, card.id, color)}
            />
          ))}
        </div>
        <button className="card__delete" aria-label="Delete card" onClick={() => deleteCard(doc, card.id)}>
          Delete
        </button>
      </footer>
    </article>
  );
}
