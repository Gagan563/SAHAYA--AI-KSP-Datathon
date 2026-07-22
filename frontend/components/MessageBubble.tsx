"use client";

import { CSSProperties } from "react";
import { Sparkles, User, Volume2, VolumeX } from "lucide-react";
import { ExplainabilityPanel } from "./ExplainabilityPanel";
import type { ChatMessage } from "@/lib/mock-data";

interface MessageBubbleProps {
  message: ChatMessage;
  style?: CSSProperties;
  onSpeak?: () => void;
  isSpeaking?: boolean;
}

export function MessageBubble({ message, style, onSpeak, isSpeaking }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex items-start gap-3 animate-fade-in ${
        isUser ? "flex-row-reverse" : ""
      }`}
      style={style}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isUser
            ? "bg-[var(--color-accent-cyan)] bg-opacity-20 border border-[var(--color-accent-cyan)]"
            : "bg-[var(--color-bg-tertiary)] border border-[var(--color-border-accent)]"
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-[var(--color-accent-cyan)]" />
        ) : (
          <Sparkles className="w-4 h-4 text-[var(--color-accent-cyan)]" />
        )}
      </div>

      {/* Message Content */}
      <div className={`max-w-[75%] space-y-2 ${isUser ? "items-end" : ""}`}>
        <div
          className={`px-4 py-3 text-sm leading-relaxed ${
            isUser ? "chat-bubble-user" : "chat-bubble-ai"
          }`}
        >
          {/* Context resolution note */}
          {!isUser && message.response?.context_note && (
            <p className="text-[10px] text-[var(--color-accent-amber)] mb-2 flex items-center gap-1">
              🔗 {message.response.context_note}
            </p>
          )}

          {/* Render message with basic markdown-like formatting */}
          {message.content.split("\n").map((line, i) => {
            if (line.startsWith("• ") || line.startsWith("- ")) {
              return (
                <p key={i} className="ml-2 my-0.5">
                  <span className="text-[var(--color-accent-cyan)] mr-1">•</span>
                  {renderInlineFormatting(line.substring(2))}
                </p>
              );
            }
            // Numbered list items
            if (/^\d+\.\s/.test(line)) {
              return (
                <p key={i} className="ml-2 my-0.5">
                  {renderInlineFormatting(line)}
                </p>
              );
            }
            if (line.trim() === "") return <br key={i} />;
            return <p key={i} className="my-0.5">{renderInlineFormatting(line)}</p>;
          })}
        </div>

        {/* Action bar for AI messages */}
        {!isUser && (
          <div className="flex items-center gap-2">
            {/* Explainability Panel */}
            {message.response && (
              <ExplainabilityPanel response={message.response} />
            )}

            {/* TTS Button */}
            {onSpeak && (
              <button
                onClick={onSpeak}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium cursor-pointer transition-all duration-200 hover:bg-[rgba(0,212,255,0.1)]"
                style={{
                  border: "1px solid var(--color-border-default)",
                  color: isSpeaking ? "var(--color-accent-cyan)" : "var(--color-text-tertiary)",
                }}
                title={isSpeaking ? "Stop speaking" : "Read aloud (TTS)"}
              >
                {isSpeaking ? (
                  <VolumeX className="w-3 h-3" />
                ) : (
                  <Volume2 className="w-3 h-3" />
                )}
                {isSpeaking ? "Stop" : "🔊"}
              </button>
            )}
          </div>
        )}

        {/* Timestamp */}
        <p
          className={`text-[10px] text-[var(--color-text-tertiary)] ${
            isUser ? "text-right" : ""
          }`}
        >
          {new Date(message.timestamp).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}

/**
 * Simple inline formatting for bold text (**text**) and warning emoji
 */
function renderInlineFormatting(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-[var(--color-text-primary)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
