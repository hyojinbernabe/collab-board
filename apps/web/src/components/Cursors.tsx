import type { Presence } from "../sync";

export function Cursors({ others }: { others: Presence[] }) {
  return (
    <>
      {others.map(({ clientId, user, cursor }) =>
        cursor ? (
          <div
            key={clientId}
            className="cursor"
            style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)`, color: user.color }}
          >
            <svg width="18" height="22" viewBox="0 0 18 22" aria-hidden>
              <path d="M1 1 L1 18 L6 13.5 L9.5 21 L12.5 19.7 L9 12.5 L16 12.5 Z" fill="currentColor" stroke="white" strokeWidth="1.5" />
            </svg>
            <span className="cursor__name" style={{ background: user.color }}>
              {user.name}
            </span>
          </div>
        ) : null,
      )}
    </>
  );
}
