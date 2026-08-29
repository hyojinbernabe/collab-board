import { BoardPage } from "./components/BoardPage";
import { HomePage } from "./components/HomePage";

// two pages only, so the path is matched by hand instead of pulling in a router
export function App() {
  const match = window.location.pathname.match(/^\/b\/([\w-]{1,64})\/?$/);
  if (match) return <BoardPage key={match[1]} boardId={match[1]} />;
  return <HomePage />;
}
