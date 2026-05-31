import { messageSchema } from "@/schemas/chat";
import { AiClient, aiClient } from "@/lib/ai";
import { ChatStorage, type Session, type Message } from "@/lib/storage";
import { AppError } from "@/errors";
import type { CoreMessage } from "ai";
import { TITLE_TRUNCATE_LENGTH, TITLE_MAX_LENGTH } from "@/constants/timing";

export type { Session } from "@/lib/storage";

const TITLE_SYSTEM_PROMPT = `You are a conversation titler. Given the first user message and AI response, generate a concise 3-5 word title for this conversation. Return ONLY the title, no quotes or punctuation.`;

function toCoreMessages(dbMessages: Message[]): CoreMessage[] {
  return dbMessages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
}

export class ChatService {
  constructor(
    private ai: AiClient,
    private storage: ChatStorage,
  ) {}

  loadSessions(): Session[] {
    return this.storage.listSessions();
  }

  getOrCreateActiveSession(): Session {
    const sessions = this.storage.listSessions();
    if (sessions.length > 0) return sessions[0];
    return this.storage.createSession();
  }

  createSession(): Session {
    return this.storage.createSession();
  }

  deleteSession(id: string): void {
    this.storage.deleteSession(id);
  }

  renameSession(id: string, title: string): void {
    this.storage.updateSessionTitle(id, title);
  }

  loadMessages(sessionId: string): CoreMessage[] {
    return toCoreMessages(this.storage.listMessages(sessionId));
  }

  saveMessage(sessionId: string, role: "user" | "assistant", content: string): void {
    this.storage.addMessage(sessionId, role, content);
  }

  async *sendMessage(messages: CoreMessage[], input: string): AsyncGenerator<string> {
    const parsed = messageSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError(
        parsed.error.issues[0]?.message ?? "Invalid message",
        "VALIDATION_ERROR",
        true,
      );
    }

    const allMessages: CoreMessage[] = [...messages, { role: "user", content: parsed.data }];

    yield* this.ai.streamReply(allMessages);
  }

  async generateSessionTitle(messages: CoreMessage[]): Promise<string> {
    try {
      const userMsg = messages.find((m) => m.role === "user");
      const aiMsg = messages.find((m) => m.role === "assistant");
      if (!userMsg || !aiMsg) return "Untitled";

      const title = await this.ai.generateReply(
        TITLE_SYSTEM_PROMPT,
        `User: ${userMsg.content.slice(0, TITLE_TRUNCATE_LENGTH)}\n\nAI: ${aiMsg.content.slice(0, TITLE_TRUNCATE_LENGTH)}`,
      );
      return title.trim().slice(0, TITLE_MAX_LENGTH) || "Untitled";
    } catch {
      return "Untitled";
    }
  }
}

export const chatService = new ChatService(aiClient, new ChatStorage());
