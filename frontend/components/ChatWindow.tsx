"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Mic, MicOff, Sparkles, Network, Volume2, VolumeX } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { NetworkGraph } from "./NetworkGraph";
import { sendChatMessage } from "@/lib/api";
import {
  ChatMessage,
  ChatResponse,
  INITIAL_MESSAGES,
  SUGGESTED_QUERIES,
} from "@/lib/mock-data";

export function ChatWindow() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [activeGraph, setActiveGraph] = useState<ChatResponse["graph"] | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);


  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: messageText,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await sendChatMessage(messageText, sessionId);

      // Track session from API response (or generate locally for mocks)
      if (response.session_id) {
        setSessionId(response.session_id);
      } else if (!sessionId) {
        setSessionId(`sess_${Date.now()}_local`);
      }

      const aiMessage: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: "assistant",
        content: response.answer,
        timestamp: new Date().toISOString(),
        response,
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Auto-show graph if network/profile response with graph data
      if (response.graph) {
        setActiveGraph(response.graph);
      }
    } catch (err) {
      console.error("[SAHAYA] Unexpected error:", err);
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}-err`,
        role: "assistant",
        content: "An unexpected error occurred. Please try again.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      setTimeout(() => {
        setInput("ಬೆಂಗಳೂರಿನಲ್ಲಿ ಹೆಚ್ಚಿನ ಕಳ್ಳತನ ಪ್ರಕರಣಗಳು ಯಾವ ಜಿಲ್ಲೆಯಲ್ಲಿ?");
      }, 500);
    } else {
      setIsRecording(true);
    }
  };

  // TTS: Read response aloud using Web Speech API
  // Guarded for SSR — window.speechSynthesis only exists in the browser.
  const speakResponse = (messageId: string, text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    // If this message is already speaking, stop it
    if (speakingMessageId === messageId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    // Stop any other speaking first
    window.speechSynthesis.cancel();

    // Clean markdown formatting for speech
    const cleanText = text
      .replace(/\*\*/g, "")
      .replace(/•/g, "")
      .replace(/🔗|⚠️|🙏|📊|🔍|🕸️|👤|📝|🎤/g, "")
      .replace(/\n+/g, ". ")
      .substring(0, 500); // Limit speech length

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "en-IN";
    utterance.rate = 0.9;
    utterance.pitch = 1.0;

    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);

    setSpeakingMessageId(messageId);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="flex h-screen">
      {/* Chat Panel */}
      <div className={`flex flex-col ${activeGraph ? "w-1/2" : "flex-1"} transition-all duration-300`}>
        {/* Header */}
        <header className="glass-panel border-b border-[var(--color-border-default)] px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[var(--color-accent-cyan)]" />
                Intelligence Chat
              </h2>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
                Context-aware • Ask follow-ups like &quot;show his other cases&quot;
              </p>
            </div>
            <div className="flex items-center gap-2">
              {sessionId && (
                <span className="text-[10px] font-mono text-[var(--color-text-tertiary)] bg-[var(--color-bg-tertiary)] px-2 py-1 rounded">
                  Session active
                </span>
              )}
              <span className="text-[10px] font-mono text-[var(--color-text-tertiary)] bg-[var(--color-bg-tertiary)] px-2 py-1 rounded">
                v2.0-demo
              </span>
            </div>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.map((msg, idx) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              style={{ animationDelay: `${idx * 0.05}s` }}
              onSpeak={msg.role === "assistant" ? () => speakResponse(msg.id, msg.content) : undefined}
              isSpeaking={speakingMessageId === msg.id}
            />
          ))}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex items-start gap-3 animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border-accent)] flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-[var(--color-accent-cyan)]" />
              </div>
              <div className="chat-bubble-ai px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Queries (show when few messages) */}
        {messages.length <= 1 && (
          <div className="px-6 pb-3">
            <p className="text-xs text-[var(--color-text-tertiary)] mb-2">
              Suggested queries:
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUERIES.map((q) => (
                <button
                  key={q.label}
                  onClick={() => handleSend(q.label)}
                  className="glass-card text-xs text-[var(--color-text-secondary)] px-3 py-2 rounded-lg hover:border-[var(--color-border-accent)] hover:text-[var(--color-text-primary)] transition-all duration-200 cursor-pointer"
                >
                  <span className="mr-1.5">{q.icon}</span>
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="glass-panel border-t border-[var(--color-border-default)] p-4">
          <div className="flex items-center gap-3">
            {/* Mic Button */}
            <button
              id="btn-mic"
              onClick={toggleRecording}
              className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                isRecording
                  ? "mic-recording border-[var(--color-accent-red)] text-[var(--color-accent-red)]"
                  : "border-[var(--color-border-default)] text-[var(--color-text-tertiary)] hover:text-[var(--color-accent-cyan)] hover:border-[var(--color-border-accent)]"
              }`}
              title={isRecording ? "Stop recording" : "Speak in Kannada"}
            >
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Text Input */}
            <input
              ref={inputRef}
              id="chat-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isRecording
                  ? "🎤 Listening for Kannada input..."
                  : "Ask about crime data, cases, suspects, or profiles..."
              }
              className="chat-input flex-1 px-4 py-3 rounded-xl text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]"
              disabled={isLoading}
            />

            {/* Send Button */}
            <button
              id="btn-send"
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="btn-primary p-3 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none cursor-pointer"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

          {isRecording && (
            <p className="text-[10px] text-[var(--color-accent-red)] mt-2 flex items-center gap-1.5 ml-14">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-red)] animate-pulse" />
              Recording Kannada voice input... Click mic to stop.
            </p>
          )}
        </div>
      </div>

      {/* Graph Panel */}
      {activeGraph && (
        <div className="w-1/2 border-l border-[var(--color-border-default)] flex flex-col animate-slide-right">
          <div className="glass-panel border-b border-[var(--color-border-default)] px-6 py-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
              <Network className="w-4 h-4 text-[var(--color-accent-cyan)]" />
              Suspect Network
            </h3>
            <button
              onClick={() => setActiveGraph(null)}
              className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] cursor-pointer"
            >
              Close ✕
            </button>
          </div>
          <div className="flex-1">
            <NetworkGraph data={activeGraph} />
          </div>
        </div>
      )}
    </div>
  );
}
