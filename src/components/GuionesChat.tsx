"use client";

import { useEffect, useRef, useState } from "react";
import type { GuionMessage } from "@/lib/types";

type Msg = Pick<GuionMessage, "role" | "content">;

export default function GuionesChat({
  threadId,
  initialMessages,
}: {
  threadId: string;
  initialMessages: Msg[];
}) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reiniciar al cambiar de hilo.
  useEffect(() => {
    setMessages(initialMessages);
  }, [threadId, initialMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);

    setMessages((m) => [
      ...m,
      { role: "user", content: text },
      { role: "assistant", content: "" },
    ]);

    try {
      const res = await fetch("/api/guiones/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, message: text }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        appendToLast(`\n\n[Error: ${err.error ?? "no se pudo generar"}]`);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        appendToLast(decoder.decode(value, { stream: true }));
      }
    } catch {
      appendToLast("\n\n[Error de red]");
    } finally {
      setSending(false);
    }
  }

  function appendToLast(chunk: string) {
    setMessages((m) => {
      const copy = [...m];
      const last = copy[copy.length - 1];
      if (last && last.role === "assistant") {
        copy[copy.length - 1] = { ...last, content: last.content + chunk };
      }
      return copy;
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col">
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto pr-2">
        {messages.length === 0 && (
          <div className="card border-dashed text-sm text-white/50">
            Pedí tu primer guion. Ejemplos: <em>“Guion de DM para reactivar
            leads fríos”</em>, <em>“Script de llamada de closer para la oferta
            premium”</em>, <em>“3 ganchos para reels esta semana”</em>.
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm ${
                m.role === "user"
                  ? "bg-brand-600 text-white"
                  : "border border-white/10 bg-white/5 text-white/90"
              }`}
            >
              {m.content || (
                <span className="inline-flex gap-1 text-white/40">
                  <span className="animate-pulse">escribiendo…</span>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-end gap-2 border-t border-white/10 pt-4">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Pedí un guion… (Enter para enviar, Shift+Enter para salto de línea)"
          rows={2}
          className="input flex-1 resize-none"
          disabled={sending}
        />
        <button onClick={send} disabled={sending || !input.trim()} className="btn">
          {sending ? "…" : "Enviar"}
        </button>
      </div>
    </div>
  );
}
