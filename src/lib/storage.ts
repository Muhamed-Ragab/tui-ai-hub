import { Database } from "bun:sqlite";
import { AppError } from "@/errors";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";

export interface Session {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

export class ChatStorage {
  private db: Database;

  constructor(dbPath?: string) {
    const resolved = dbPath ?? join(process.cwd(), "data", "chat.db");
    const dir = join(resolved, "..");

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(resolved);
    this.db.run("PRAGMA journal_mode = WAL");
    this.db.run("PRAGMA foreign_keys = ON");
    this.runMigrations();
  }

  private runMigrations(): void {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL DEFAULT 'Untitled',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);

    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_messages_session
      ON messages(session_id, id)
    `);
  }

  listSessions(): Session[] {
    try {
      return this.db.query("SELECT * FROM sessions ORDER BY updated_at DESC").all() as Session[];
    } catch (err) {
      throw new AppError(
        `Failed to list sessions: ${(err as Error).message}`,
        "PERSISTENCE_ERROR",
        true,
      );
    }
  }

  getSession(id: string): Session | null {
    try {
      const result = this.db.query("SELECT * FROM sessions WHERE id = ?").get(id) as
        | Session
        | undefined;
      return result ?? null;
    } catch (err) {
      throw new AppError(
        `Failed to get session: ${(err as Error).message}`,
        "PERSISTENCE_ERROR",
        true,
      );
    }
  }

  createSession(): Session {
    try {
      const id = generateId();
      const timestamp = now();
      this.db.run("INSERT INTO sessions (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)", [
        id,
        "Untitled",
        timestamp,
        timestamp,
      ]);
      return { id, title: "Untitled", created_at: timestamp, updated_at: timestamp };
    } catch (err) {
      throw new AppError(
        `Failed to create session: ${(err as Error).message}`,
        "PERSISTENCE_ERROR",
        true,
      );
    }
  }

  updateSessionTitle(id: string, title: string): void {
    try {
      this.db.run("UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?", [title, now(), id]);
    } catch (err) {
      throw new AppError(
        `Failed to update session title: ${(err as Error).message}`,
        "PERSISTENCE_ERROR",
        true,
      );
    }
  }

  deleteSession(id: string): void {
    try {
      this.db.run("DELETE FROM sessions WHERE id = ?", [id]);
    } catch (err) {
      throw new AppError(
        `Failed to delete session: ${(err as Error).message}`,
        "PERSISTENCE_ERROR",
        true,
      );
    }
  }

  listMessages(sessionId: string): Message[] {
    try {
      return this.db
        .query("SELECT * FROM messages WHERE session_id = ? ORDER BY id ASC")
        .all(sessionId) as Message[];
    } catch (err) {
      throw new AppError(
        `Failed to list messages: ${(err as Error).message}`,
        "PERSISTENCE_ERROR",
        true,
      );
    }
  }

  addMessage(sessionId: string, role: "user" | "assistant", content: string): Message {
    try {
      const timestamp = now();
      const result = this.db.run(
        "INSERT INTO messages (session_id, role, content, created_at) VALUES (?, ?, ?, ?)",
        [sessionId, role, content, timestamp],
      );
      this.db.run("UPDATE sessions SET updated_at = ? WHERE id = ?", [timestamp, sessionId]);
      return {
        id: result.lastInsertRowid as number,
        session_id: sessionId,
        role,
        content,
        created_at: timestamp,
      };
    } catch (err) {
      throw new AppError(
        `Failed to save message: ${(err as Error).message}`,
        "PERSISTENCE_ERROR",
        true,
      );
    }
  }
}
