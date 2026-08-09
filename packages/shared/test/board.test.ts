import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import {
  addCard,
  addColumn,
  deleteCard,
  ensureDefaultColumns,
  moveCard,
  readBoard,
  renameColumn,
  setCardColor,
  updateCardText,
} from "../src/board";

function newBoard() {
  const doc = new Y.Doc();
  ensureDefaultColumns(doc);
  return doc;
}

const cardTexts = (doc: Y.Doc, columnId: string) =>
  readBoard(doc).columns.find((c) => c.id === columnId)!.cards.map((c) => c.text);

// sends each doc's changes to the other, like two clients meeting at the server
function syncDocs(a: Y.Doc, b: Y.Doc) {
  Y.applyUpdate(b, Y.encodeStateAsUpdate(a, Y.encodeStateVector(b)));
  Y.applyUpdate(a, Y.encodeStateAsUpdate(b, Y.encodeStateVector(a)));
}

describe("columns", () => {
  it("creates the default columns once", () => {
    const doc = newBoard();
    ensureDefaultColumns(doc);
    expect(readBoard(doc).columns.map((c) => c.title)).toEqual(["To do", "Doing", "Done"]);
  });

  it("adds a column at the end and renames it", () => {
    const doc = newBoard();
    const id = addColumn(doc, "Blocked");
    renameColumn(doc, id, "Waiting");
    expect(readBoard(doc).columns.map((c) => c.title)).toEqual(["To do", "Doing", "Done", "Waiting"]);
  });

  it("does not double the columns when two clients set up the same board", () => {
    const a = newBoard();
    const b = newBoard();
    syncDocs(a, b);
    expect(readBoard(a).columns).toHaveLength(3);
    expect(readBoard(a)).toEqual(readBoard(b));
  });
});

describe("cards", () => {
  it("adds cards in order", () => {
    const doc = newBoard();
    addCard(doc, "todo", "first");
    addCard(doc, "todo", "second");
    expect(cardTexts(doc, "todo")).toEqual(["first", "second"]);
  });

  it("refuses a card for a column that does not exist", () => {
    expect(() => addCard(newBoard(), "nope", "hi")).toThrow();
  });

  it("edits text and color", () => {
    const doc = newBoard();
    const id = addCard(doc, "todo", "draft");
    updateCardText(doc, id, "final");
    setCardColor(doc, id, "pink");
    const card = readBoard(doc).columns[0].cards[0];
    expect(card).toMatchObject({ text: "final", color: "pink" });
  });

  it("deletes a card", () => {
    const doc = newBoard();
    const id = addCard(doc, "todo", "gone soon");
    deleteCard(doc, id);
    expect(cardTexts(doc, "todo")).toEqual([]);
  });
});

describe("moveCard", () => {
  it("moves a card to another column at an index", () => {
    const doc = newBoard();
    addCard(doc, "doing", "a");
    addCard(doc, "doing", "c");
    const id = addCard(doc, "todo", "b");
    moveCard(doc, id, "doing", 1);
    expect(cardTexts(doc, "todo")).toEqual([]);
    expect(cardTexts(doc, "doing")).toEqual(["a", "b", "c"]);
  });

  it("reorders inside the same column", () => {
    const doc = newBoard();
    const first = addCard(doc, "todo", "1");
    addCard(doc, "todo", "2");
    addCard(doc, "todo", "3");
    moveCard(doc, first, "todo", 2);
    expect(cardTexts(doc, "todo")).toEqual(["2", "3", "1"]);
  });

  it("clamps an index past the end", () => {
    const doc = newBoard();
    addCard(doc, "done", "x");
    const id = addCard(doc, "todo", "y");
    moveCard(doc, id, "done", 99);
    expect(cardTexts(doc, "done")).toEqual(["x", "y"]);
  });

  it("keeps a single copy when two clients move the same card at once", () => {
    const a = newBoard();
    const id = addCard(a, "todo", "contested");
    const b = new Y.Doc();
    syncDocs(a, b);

    moveCard(a, id, "doing", 0);
    moveCard(b, id, "done", 0);
    syncDocs(a, b);

    const everyCard = readBoard(a).columns.flatMap((c) => c.cards);
    expect(everyCard).toHaveLength(1);
    expect(readBoard(a)).toEqual(readBoard(b));
  });
});
