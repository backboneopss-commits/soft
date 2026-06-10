import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import GuionesChat from "@/components/GuionesChat";
import { createThread, deleteThread } from "./actions";
import type { GuionMessage, GuionThread } from "@/lib/types";

export default async function GuionesPage({
  searchParams,
}: {
  searchParams: { thread?: string };
}) {
  await getCurrentUser();
  const supabase = createClient();

  const { data: threadsData } = await supabase
    .from("guion_threads")
    .select("*")
    .order("updated_at", { ascending: false });
  const threads = (threadsData ?? []) as GuionThread[];

  const activeId = searchParams.thread ?? threads[0]?.id ?? null;

  let messages: Pick<GuionMessage, "role" | "content">[] = [];
  if (activeId) {
    const { data } = await supabase
      .from("guion_messages")
      .select("role, content")
      .eq("thread_id", activeId)
      .order("created_at", { ascending: true });
    messages = (data ?? []) as Pick<GuionMessage, "role" | "content">[];
  }

  const keyMissing = !process.env.ANTHROPIC_API_KEY;

  return (
    <div>
      <PageHeader
        title="Guiones IA"
        subtitle="Chat con IA que conoce tu contenido, SOPs y ventas para darte guiones a medida."
      />

      {keyMissing && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
          Falta configurar <code>ANTHROPIC_API_KEY</code> en el servidor para
          que el chat funcione.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Lista de hilos */}
        <div>
          <form action={createThread} className="mb-3">
            <button className="btn w-full">+ Nueva conversación</button>
          </form>
          <div className="space-y-1">
            {threads.length === 0 && (
              <p className="px-2 text-xs text-white/40">
                No hay conversaciones todavía.
              </p>
            )}
            {threads.map((t) => (
              <div
                key={t.id}
                className={`group flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                  t.id === activeId
                    ? "bg-brand-600/20 text-white"
                    : "text-white/60 hover:bg-white/5"
                }`}
              >
                <Link href={`/dashboard/guiones?thread=${t.id}`} className="truncate">
                  {t.title}
                </Link>
                <form action={deleteThread}>
                  <input type="hidden" name="id" value={t.id} />
                  <button
                    className="ml-2 hidden text-xs text-red-400/70 hover:text-red-400 group-hover:block"
                    title="Eliminar"
                  >
                    ✕
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>

        {/* Chat */}
        <div className="card">
          {activeId ? (
            <GuionesChat
              key={activeId}
              threadId={activeId}
              initialMessages={messages}
            />
          ) : (
            <div className="flex h-[calc(100vh-9rem)] items-center justify-center text-center text-sm text-white/40">
              Creá una conversación para empezar a pedir guiones.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
