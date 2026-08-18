/**
 * Simple localStorage-based auth — no Supabase, no email confirmation,
 * no social login. Email + password only.
 */

const USERS_KEY = "antren:users";
const SESSION_KEY = "antren:session";

type StoredUser = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
};

type Session = {
  userId: string;
  email: string;
  name: string;
  rememberMe: boolean;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getUsers(): StoredUser[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getSession(): Session | null {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null");
  } catch {
    return null;
  }
}

function saveSession(session: Session | null) {
  if (session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function uuid(): string {
  return crypto.randomUUID?.() ?? "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export function getCurrentUser(): AuthUser | null {
  const session = getSession();
  if (!session) return null;
  return { id: session.userId, email: session.email, name: session.name };
}

export function onAuthChange(callback: (user: AuthUser | null) => void): () => void {
  // Fire once synchronously, then watch storage events
  callback(getCurrentUser());

  const handler = (e: StorageEvent) => {
    if (e.key === SESSION_KEY) {
      callback(getCurrentUser());
    }
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

export async function signUp(
  email: string,
  password: string,
  name?: string,
): Promise<{ user: AuthUser; error?: never } | { user?: never; error: string }> {
  const trimmed = email.trim().toLowerCase();
  const users = getUsers();

  if (users.find((u) => u.email === trimmed)) {
    return { error: "An account with this email already exists. Sign in instead." };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  const passwordHash = await hashPassword(password);
  const user: StoredUser = {
    id: uuid(),
    email: trimmed,
    name: name?.trim() || trimmed.split("@")[0],
    passwordHash,
  };

  users.push(user);
  saveUsers(users);

  const session: Session = {
    userId: user.id,
    email: user.email,
    name: user.name,
    rememberMe: true,
  };
  saveSession(session);

  return { user: { id: user.id, email: user.email, name: user.name } };
}

export async function signIn(
  email: string,
  password: string,
  rememberMe = true,
): Promise<{ user: AuthUser; error?: never } | { user?: never; error: string }> {
  const trimmed = email.trim().toLowerCase();
  const users = getUsers();
  const stored = users.find((u) => u.email === trimmed);

  if (!stored) {
    return { error: "Incorrect email or password. Please try again." };
  }

  const hash = await hashPassword(password);
  if (hash !== stored.passwordHash) {
    return { error: "Incorrect email or password. Please try again." };
  }

  const session: Session = {
    userId: stored.id,
    email: stored.email,
    name: stored.name,
    rememberMe,
  };
  saveSession(session);

  return { user: { id: stored.id, email: stored.email, name: stored.name } };
}

export function signOut() {
  saveSession(null);
}

export async function resetPassword(
  email: string,
  _newPassword: string,
): Promise<{ error?: string }> {
  const trimmed = email.trim().toLowerCase();
  const users = getUsers();
  const idx = users.findIndex((u) => u.email === trimmed);

  if (idx === -1) {
    // Don't reveal whether the email exists
    return {};
  }

  if (_newPassword.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  users[idx].passwordHash = await hashPassword(_newPassword);
  saveUsers(users);
  return {};
}
