import { useEffect, useState } from "react";
import { rememberBoard } from "../recentBoards";
import { useBoardConnection, useOthers, type BoardConnection, type ConnectionStatus } from "../sync";
import { loadUser, saveUser, type LocalUser } from "../user";
import { Board } from "./Board";
import { InlineEditor } from "./InlineEditor";

const STATUS_TEXT: Record<ConnectionStatus, string> = {
  connecting: "Connecting",
  online: "Live",
  offline: "Offline, changes are saved on this device",
};

export function BoardPage({ boardId }: { boardId: string }) {
  const { connection, status } = useBoardConnection(boardId);

  useEffect(() => rememberBoard(boardId), [boardId]);

  if (!connection) return <div className="page" />;
  return <BoardScreen boardId={boardId} status={status} connection={connection} />;
}

interface ScreenProps {
  boardId: string;
  status: ConnectionStatus;
  connection: BoardConnection;
}

function BoardScreen({ boardId, status, connection }: ScreenProps) {
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
        <a href="/" className="topbar__home">
          Collab Board
        </a>
        <span className="topbar__board">{boardId}</span>
        <span className={`status status--${status}`}>{STATUS_TEXT[status]}</span>

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

        <CopyLinkButton />
      </header>

      <Board doc={connection.doc} awareness={connection.awareness} others={others} />
    </div>
  );
}

function CopyLinkButton() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button className="button" onClick={copy}>
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}
