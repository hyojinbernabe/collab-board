import { newId } from "@collab-board/shared";
import { recentBoards } from "../recentBoards";

export function HomePage() {
  const boards = recentBoards();

  return (
    <main className="home">
      <h1 className="home__title">Collab Board</h1>
      <p className="home__intro">
        A shared board that updates live. Make one, send the link, and everyone sees each other's cards and
        cursors as they work. It keeps working offline and catches up when you reconnect.
      </p>
      <a className="button button--primary" href={`/b/${newId()}`}>
        New board
      </a>

      {boards.length > 0 && (
        <section className="home__recent">
          <h2>Recent boards</h2>
          <ul>
            {boards.map((id) => (
              <li key={id}>
                <a href={`/b/${id}`}>{id}</a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
