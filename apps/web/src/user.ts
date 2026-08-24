const KEY = "collab-board:user";

export interface LocalUser {
  name: string;
  color: string;
}

const NAMES = ["Otter", "Heron", "Lynx", "Panda", "Gecko", "Falcon", "Koala", "Marten", "Puffin", "Tapir"];
const COLORS = ["#e11d48", "#2563eb", "#059669", "#d97706", "#7c3aed", "#0891b2", "#db2777", "#65a30d"];

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

// everyone gets a random animal name and color the first time, kept in localStorage after that
export function loadUser(): LocalUser {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (saved?.name && saved?.color) return saved;
  } catch {
    // fall through and make a new one
  }
  const user = { name: `${pick(NAMES)} ${Math.floor(Math.random() * 90) + 10}`, color: pick(COLORS) };
  saveUser(user);
  return user;
}

export function saveUser(user: LocalUser) {
  localStorage.setItem(KEY, JSON.stringify(user));
}
