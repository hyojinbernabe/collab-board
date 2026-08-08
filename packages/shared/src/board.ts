import * as Y from "yjs";
import { positionBetween } from "./position";

export const CARD_COLORS = ["yellow", "blue", "green", "pink", "purple"] as const;
export type CardColor = (typeof CARD_COLORS)[number];

export interface Card {
  id: string;
  columnId: string;
  text: string;
  color: CardColor;
  position: number;
}

export interface Column {
  id: string;
  title: string;
  position: number;
  cards: Card[];
}

export interface BoardState {
  columns: Column[];
}

// fixed ids so two clients setting up the same new board end up with the same three columns
const DEFAULT_COLUMNS = [
  { id: "todo", title: "To do" },
  { id: "doing", title: "Doing" },
  { id: "done", title: "Done" },
];

type Fields = Y.Map<unknown>;

const columnsOf = (doc: Y.Doc) => doc.getMap<Fields>("columns");
const cardsOf = (doc: Y.Doc) => doc.getMap<Fields>("cards");

export function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function fieldsFrom(values: Record<string, unknown>): Fields {
  const fields = new Y.Map<unknown>();
  for (const [key, value] of Object.entries(values)) fields.set(key, value);
  return fields;
}

export function ensureDefaultColumns(doc: Y.Doc): void {
  const columns = columnsOf(doc);
  if (columns.size > 0) return;
  doc.transact(() => {
    DEFAULT_COLUMNS.forEach((column, index) => {
      columns.set(column.id, fieldsFrom({ title: column.title, position: index + 1 }));
    });
  });
}

export function addColumn(doc: Y.Doc, title: string): string {
  const id = newId();
  const lastColumn = readBoard(doc).columns.at(-1);
  columnsOf(doc).set(id, fieldsFrom({ title, position: positionBetween(lastColumn?.position, undefined) }));
  return id;
}

export function renameColumn(doc: Y.Doc, columnId: string, title: string): void {
  columnsOf(doc).get(columnId)?.set("title", title);
}

export function addCard(doc: Y.Doc, columnId: string, text: string, color: CardColor = "yellow"): string {
  const id = newId();
  const column = readBoard(doc).columns.find((c) => c.id === columnId);
  if (!column) throw new Error(`no column ${columnId}`);
  const lastCard = column.cards.at(-1);
  cardsOf(doc).set(
    id,
    fieldsFrom({ columnId, text, color, position: positionBetween(lastCard?.position, undefined) }),
  );
  return id;
}

export function updateCardText(doc: Y.Doc, cardId: string, text: string): void {
  cardsOf(doc).get(cardId)?.set("text", text);
}

export function setCardColor(doc: Y.Doc, cardId: string, color: CardColor): void {
  cardsOf(doc).get(cardId)?.set("color", color);
}

export function deleteCard(doc: Y.Doc, cardId: string): void {
  cardsOf(doc).delete(cardId);
}

// toIndex is where the card should land in the target column, counted without the card itself
export function moveCard(doc: Y.Doc, cardId: string, toColumnId: string, toIndex: number): void {
  const card = cardsOf(doc).get(cardId);
  const column = readBoard(doc).columns.find((c) => c.id === toColumnId);
  if (!card || !column) return;

  const others = column.cards.filter((c) => c.id !== cardId);
  const index = Math.max(0, Math.min(toIndex, others.length));
  const position = positionBetween(others[index - 1]?.position, others[index]?.position);

  doc.transact(() => {
    card.set("columnId", toColumnId);
    card.set("position", position);
  });
}

function byPosition(a: { position: number }, b: { position: number }) {
  return a.position - b.position;
}

export function readBoard(doc: Y.Doc): BoardState {
  const columns: Column[] = [];
  columnsOf(doc).forEach((fields, id) => {
    columns.push({
      id,
      title: String(fields.get("title") ?? ""),
      position: Number(fields.get("position") ?? 0),
      cards: [],
    });
  });
  columns.sort(byPosition);

  const columnById = new Map(columns.map((column) => [column.id, column]));
  cardsOf(doc).forEach((fields, id) => {
    const column = columnById.get(String(fields.get("columnId")));
    // a card can point at a column that hasn't synced yet, skip it until it does
    if (!column) return;
    column.cards.push({
      id,
      columnId: column.id,
      text: String(fields.get("text") ?? ""),
      color: (fields.get("color") as CardColor) ?? "yellow",
      position: Number(fields.get("position") ?? 0),
    });
  });
  for (const column of columns) column.cards.sort(byPosition);

  return { columns };
}
