import { useBoardConnection } from "../sync";
import { Board } from "./Board";

export function BoardPage({ boardId }: { boardId: string }) {
  const connection = useBoardConnection(boardId);

  return (
    <div className="page">
      <header className="topbar">
        <span className="topbar__home">Collab Board</span>
        <span className="topbar__board">{boardId}</span>
      </header>
      {connection && <Board doc={connection.doc} />}
    </div>
  );
}
