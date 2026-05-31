import { useState, useEffect, useRef } from "react";
import { chatService, type Session } from "./chat-service";

export function useChatSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const initialised = useRef(false);

  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    try {
      const session = chatService.getOrCreateActiveSession();
      setActiveSessionId(session.id);
      setSessions(chatService.loadSessions());
    } catch {
      const session = chatService.createSession();
      setActiveSessionId(session.id);
      setSessions(chatService.loadSessions());
    }
  }, []);

  function refreshSessions() {
    setSessions(chatService.loadSessions());
  }

  function switchSession(id: string) {
    setActiveSessionId(id);
  }

  function createNewSession() {
    const session = chatService.createSession();
    setActiveSessionId(session.id);
    refreshSessions();
    return session;
  }

  function deleteSessionById(id: string) {
    const isActive = id === activeSessionId;
    chatService.deleteSession(id);
    refreshSessions();
    return isActive;
  }

  function renameSessionTitle(id: string, title: string) {
    chatService.renameSession(id, title);
    refreshSessions();
  }

  return {
    sessions,
    activeSessionId,
    refreshSessions,
    switchSession,
    createNewSession,
    deleteSessionById,
    renameSessionTitle,
  };
}
