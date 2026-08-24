import { useEffect, useState } from "react";
import { useBoardConnection, useOthers, type BoardConnection } from "../sync";
import { loadUser, saveUser, type LocalUser } from "../user";
import { Board } from "./Board";
import { InlineEditor } from "./InlineEditor";

export function BoardPage({ boardId }: { boardId: string }) {
  const connection = useBoardConnection(boardId);

  if (!connection) return <div className="page" />;
  return <BoardScreen boardId={boardId} connection={connection} />;
}

interface ScreenProps {
  boardId: string;
  connection: BoardConnection;
}

function BoardScreen({ boardId, connection }: ScreenProps) {
  const [user, setUser] = useState<LocalUser>(loadUser);
  const [renaming, setRenaming] = useState(false);
  const others = useOthers(connection.awareness);

  useEffect(() => {
    connection.awareness.setLocalStateField("user", user);
  }, [connection, user]);

  const rename = (name: string) => {
    const next = { ...user, name: name.slice(0, 24) };
    saveUser(next);
    setUser(next);
    setRenaming(false);
  };

  return (
    <div className="page">
      <header className="topbar">
        <span className="topbar__home">Collab Board</span>
        <span className="topbar__board">{boardId}</span>

        <div className="topbar__spacer" />

        <ul className="people" aria-label="People on this board">
          {others.map(({ clientId, user: other }) => (
            <li key={clientId} className="people__badge" style={{ background: other.color }} title={other.name}>
              {other.name.slice(0, 1)}
            </li>
          ))}
        </ul>

        <div className="me" title="This is how others see you">
          <span className="me__dot" style={{ background: user.color }} />
          {renaming ? (
            <InlineEditor initialValue={user.name} className="me__editor" onSubmit={rename} onCancel={() => setRenaming(false)} />
          ) : (
            <button className="me__name" onClick={() => setRenaming(true)}>
              {user.name}
            </button>
          )}
        </div>
      </header>

      <Board doc={connection.doc} awareness={connection.awareness} others={others} />
    </div>
  );
}
