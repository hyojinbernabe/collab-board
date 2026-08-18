import { newId } from "@collab-board/shared";
import { BoardPage } from "./components/BoardPage";

export function App() {
  const match = window.location.pathname.match(/^\/b\/([\w-]{1,64})\/?$/);
  if (!match) {
    window.location.replace(`/b/${newId()}`);
    return null;
  }
  return <BoardPage key={match[1]} boardId={match[1]} />;
}
