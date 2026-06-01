import { KEYS } from "@/constants/keys";
import { CHARS, INPUT_AREA_HEIGHT, type FocusZone } from "@/constants/ui";
import { toDisplayError } from "@/errors";
import { any, ctrlKey, key, matchKey } from "@/lib/keyboard";
import { getSyntaxStyle } from "@/lib/syntax";
import { colors } from "@/theme";
import { useKeyboard } from "@opentui/react";
import type { CoreMessage } from "ai";
import { Activity, startTransition, useEffect, useRef, useState } from "react";
import { chatService } from "./chat-service";
import { useChatSessions } from "./use-chat-sessions";

type Mode = "loading" | "chat" | "sessions";

function formatMessages(messages: CoreMessage[], streamingText: string | null): string {
  const parts: string[] = [];

  for (const msg of messages) {
    if (msg.role === "user") {
      parts.push(`> **You:** ${msg.content}\n`);
    } else {
      parts.push(`**AI:** ${msg.content}\n`);
    }
  }

  if (streamingText !== null) {
    parts.push(`**AI:** ${streamingText}_\n`);
  }

  return parts.join("\n");
}

interface ChatScreenProps {
  focusZone: FocusZone;
}

export function ChatScreen({ focusZone }: ChatScreenProps) {
  const [mode, setMode] = useState<Mode>("loading");
  const [messages, setMessages] = useState<CoreMessage[]>([]);
  const [input, setInput] = useState("");
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "streaming" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sessionFocusIndex, setSessionFocusIndex] = useState(0);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState("");
  const autoTitled = useRef(false);

  const {
    sessions,
    activeSessionId,
    refreshSessions,
    switchSession,
    createNewSession,
    deleteSessionById,
    renameSessionTitle,
  } = useChatSessions();

  useEffect(() => {
    if (activeSessionId && mode === "loading") {
      setMessages(chatService.loadMessages(activeSessionId));
      setMode("chat");
    }
  }, [activeSessionId]);

  function handleSwitchSession(id: string) {
    switchSession(id);
    setMessages(chatService.loadMessages(id));
    setStreamingText(null);
    setStatus("idle");
    setErrorMessage(null);
    setMode("chat");
  }

  function handleNewSession() {
    createNewSession();
    setMessages([]);
    setStreamingText(null);
    setStatus("idle");
    setErrorMessage(null);
    autoTitled.current = false;
    setSessionFocusIndex(0);
    setMode("chat");
  }

  function handleDeleteSession(id: string) {
    const isActive = deleteSessionById(id);
    if (isActive) {
      const remaining = chatService.loadSessions();
      if (remaining.length > 0) {
        handleSwitchSession(remaining[0].id);
      } else {
        handleNewSession();
      }
    }
  }

  function handleRenameSubmit(id: string) {
    const title = renameInput.trim();
    if (title) {
      renameSessionTitle(id, title);
    }
    setRenamingId(null);
    setRenameInput("");
  }

  function handleSubmit() {
    if (!input.trim() || status === "streaming" || !activeSessionId) return;

    const userContent = input.trim();
    chatService.saveMessage(activeSessionId, "user", userContent);

    const userMessage: CoreMessage = { role: "user", content: userContent };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setStatus("streaming");
    setStreamingText("");

    let accumulated = "";
    const stream = chatService.sendMessage(messages, userContent);

    (async () => {
      try {
        for await (const chunk of stream) {
          accumulated += chunk;
          setStreamingText(accumulated);
        }

        chatService.saveMessage(activeSessionId, "assistant", accumulated);
        setMessages((prev) => [...prev, { role: "assistant", content: accumulated }]);
        setStreamingText(null);
        setStatus("idle");
        refreshSessions();

        if (!autoTitled.current && activeSessionId) {
          autoTitled.current = true;
          const title = await chatService.generateSessionTitle([
            ...updatedMessages,
            { role: "assistant", content: accumulated },
          ]);
          chatService.renameSession(activeSessionId, title);
          refreshSessions();
        }
      } catch (err) {
        setStreamingText(null);
        setStatus("error");
        setErrorMessage(toDisplayError(err));
      }
    })();
  }

  useKeyboard((e) => {
    if (focusZone !== "content") return;
    if (e.name === KEYS.ESCAPE) {
      if (mode === "sessions") {
        setRenamingId(null);
        setRenameInput("");
        setMode("chat");
      } else if (streamingText) {
        setStreamingText(null);
        setStatus("idle");
      }
      return;
    }

    if (mode === "sessions") {
      if (renamingId) {
        matchKey(e, [key(KEYS.SELECT), () => handleRenameSubmit(renamingId)]);
        return;
      }

      matchKey(
        e,
        [
          any(key(KEYS.NAV_UP), key(KEYS.NAV_DOWN)),
          () => {
            setSessionFocusIndex((prev) => {
              if (e.name === KEYS.NAV_UP) return prev === 0 ? sessions.length - 1 : prev - 1;
              return prev === sessions.length - 1 ? 0 : prev + 1;
            });
          },
        ],
        [
          key(KEYS.SELECT),
          () => {
            const target = sessions[sessionFocusIndex];
            if (target) handleSwitchSession(target.id);
          },
        ],
        [ctrlKey(KEYS.NEW_SESSION), handleNewSession],
        [
          ctrlKey(KEYS.DELETE_SESSION),
          () => {
            const target = sessions[sessionFocusIndex];
            if (target) handleDeleteSession(target.id);
          },
        ],
        [
          ctrlKey(KEYS.RENAME_SESSION),
          () => {
            const target = sessions[sessionFocusIndex];
            if (target) {
              setRenamingId(target.id);
              setRenameInput(target.title === "Untitled" ? "" : target.title);
            }
          },
        ],
      );
      return;
    }

    matchKey(
      e,
      [
        any(ctrlKey(KEYS.SESSION_LIST), key(KEYS.TOGGLE_FOCUS)),
        () => {
          refreshSessions();
          setSessionFocusIndex(
            Math.max(
              0,
              sessions.findIndex((s) => s.id === activeSessionId),
            ),
          );
          startTransition(() => setMode("sessions"));
        },
      ],
      [ctrlKey(KEYS.NEW_SESSION), handleNewSession],
    );
  });

  const sessionsById = new Map(sessions.map((s) => [s.id, s]));
  const activeSession = activeSessionId ? sessionsById.get(activeSessionId) : undefined;
  const markdown = formatMessages(messages, streamingText);

  return (
    <box
      style={{
        flexDirection: "column",
        width: "100%",
        height: "100%",
        gap: 1,
      }}
    >
      <box style={{ flexDirection: "row", gap: 1 }}>
        <text fg={colors.accent}>
          <strong>Chat</strong>
        </text>
        <Activity mode={activeSession ? "visible" : "hidden"}>
          <text fg={colors.muted}>— {activeSession?.title ?? ""}</text>
        </Activity>
      </box>

      <box
        style={{
          flexGrow: 1,
          border: true,
          borderStyle: "rounded",
          borderColor: colors.surfaceAlt,
          padding: 1,
        }}
      >
        {mode === "loading" ? (
          <text fg={colors.muted}>Loading sessions...</text>
        ) : mode === "sessions" ? (
          <box
            style={{
              flexDirection: "column",
              width: "100%",
              height: "100%",
              gap: 0,
            }}
          >
            <text fg={colors.muted}>
              Ctrl+N: new Ctrl+D: delete Ctrl+R: rename Enter: load Esc: back
            </text>
            <box style={{ height: 1 }} />
            <scrollbox style={{ width: "100%", height: "100%" }}>
              {sessions.length === 0 ? (
                <text fg={colors.muted}>No sessions yet</text>
              ) : (
                sessions.map((session, i) => {
                  const isFocused = i === sessionFocusIndex;
                  const isRenaming = renamingId === session.id;
                  return (
                    <box
                      key={session.id}
                      style={{
                        flexDirection: "column",
                        paddingLeft: 1,
                        paddingRight: 1,
                        marginBottom: 1,
                        backgroundColor: isFocused ? colors.surfaceAlt : undefined,
                      }}
                    >
                      <box style={{ flexDirection: "row", gap: 1 }}>
                        <text fg={isFocused ? colors.accent : colors.fg}>
                          {isFocused ? CHARS.SELECTED_PREFIX : CHARS.UNSELECTED_PREFIX}
                        </text>
                        {isRenaming ? (
                          <box
                            style={{
                              border: true,
                              borderStyle: "single",
                              flexGrow: 1,
                            }}
                          >
                            <input
                              placeholder="Session name..."
                              onInput={setRenameInput}
                              onSubmit={() => handleRenameSubmit(session.id)}
                              focused={true}
                            />
                          </box>
                        ) : (
                          <text fg={isFocused ? colors.accent : colors.fg}>{session.title}</text>
                        )}
                      </box>
                      <text fg={colors.muted} style={{ paddingLeft: 2 }}>
                        {new Date(session.updated_at).toLocaleString()}
                      </text>
                    </box>
                  );
                })
              )}
            </scrollbox>
          </box>
        ) : markdown.length > 0 ? (
          <scrollbox stickyScroll={true} stickyStart="bottom" style={{ width: "100%", height: "100%" }}>
            <markdown
              content={markdown}
              streaming={status === "streaming"}
              syntaxStyle={getSyntaxStyle()}
            />
          </scrollbox>
        ) : (
          <text fg={colors.muted}>Start a conversation</text>
        )}
      </box>

      <Activity mode={status === "error" && errorMessage ? "visible" : "hidden"}>
        <text fg={colors.red}>{errorMessage}</text>
      </Activity>

      <Activity mode={mode === "chat" ? "visible" : "hidden"}>
        <box style={{ flexDirection: "row", gap: 1, height: INPUT_AREA_HEIGHT }}>
          <box style={{ flexGrow: 1, border: true, borderStyle: "single" }}>
            <input
              placeholder="Type a message... (Ctrl+S for sessions)"
              value={input}
              onInput={setInput}
              onSubmit={handleSubmit}
              focused={status !== "streaming"}
            />
          </box>
        </box>
      </Activity>
    </box>
  );
}
