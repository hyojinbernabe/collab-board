const KEY = "collab-board:recent";
const LIMIT = 8;

export function recentBoards(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function rememberBoard(boardId: string) {
  const boards = [boardId, ...recentBoards().filter((id) => id !== boardId)].slice(0, LIMIT);
  localStorage.setItem(KEY, JSON.stringify(boards));
}
