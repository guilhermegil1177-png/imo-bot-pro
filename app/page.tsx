"use client";

import { useEffect, useState, useRef } from "react";
import { supabaseClient } from "../lib/supabase";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Lead {
  id: number;
  nome: string;
  telemovel: string;
  estado_credito: string;
  created_at: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [leadsError, setLeadsError] = useState<string | null>(null);

  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Olá! 👋 Sou o ImoBot. Estou aqui para o ajudar a conhecer o imóvel disponível. Como se chama?",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [leadQualified, setLeadQualified] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

 async function fetchLeads() {
    setLoadingLeads(true);
    setLeadsError(null);
    const { data, error } = await supabaseClient
      .from("leads")
      .select("id, nome, telemovel, estado_credito, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setLeadsError("Erro: " + error.message);
    } else {
      setLeads(data ?? []);
    }
    setLoadingLeads(false);
  }

  useEffect(() => {
    fetchLeads();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (leadQualified) {
      fetchLeads();
    }
  }, [leadQualified]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    const newMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];
    setMessages(newMessages);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok) throw new Error(`Erro HTTP ${res.status}`);

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message },
      ]);

      if (data.leadQualified && data.leadSaved) {
        setLeadQualified(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ Ocorreu um erro: ${msg}. Por favor tente novamente.`,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function resetChat() {
    setMessages([
      {
        role: "assistant",
        content:
          "Olá! 👋 Sou o ImoBot. Estou aqui para o ajudar a conhecer o imóvel disponível. Como se chama?",
      },
    ]);
    setLeadQualified(false);
    setInput("");
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString("pt-PT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function creditBadgeColor(estado: string) {
    const map: Record<string, string> = {
      "pré-aprovado": "bg-green-900 text-green-300 border border-green-700",
      "a tratar": "bg-yellow-900 text-yellow-300 border border-yellow-700",
      "sem crédito": "bg-red-900 text-red-300 border border-red-700",
      "pagamento a pronto": "bg-blue-900 text-blue-300 border border-blue-700",
    };
    return map[estado] ?? "bg-gray-800 text-gray-300 border border-gray-600";
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-lg font-bold">
              🏠
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-none">ImoBot</h1>
              <p className="text-xs text-gray-400">Dashboard de Gestão de Leads</p>
            </div>
          </div>
          <button
            onClick={() => { setChatOpen(true); resetChat(); }}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 active:scale-95"
          >
            <span>💬</span> Simular Chat
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total de Leads", value: leads.length, icon: "👥" },
            { label: "Pré-aprovados", value: leads.filter((l) => l.estado_credito === "pré-aprovado").length, icon: "✅" },
            { label: "A Tratar", value: leads.filter((l) => l.estado_credito === "a tratar").length, icon: "🔄" },
            { label: "A Pronto", value: leads.filter((l) => l.estado_credito === "pagamento a pronto").length, icon: "💰" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <div className="text-2xl">{stat.icon}</div>
              <div className="mt-2 text-2xl font-bold">{stat.value}</div>
              <div className="text-xs text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Tabela */}
        <div className="rounded-xl border border-gray-800 bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
            <h2 className="font-semibold">Leads Qualificados</h2>
            <button
              onClick={fetchLeads}
              disabled={loadingLeads}
              className="flex items-center gap-1 rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-300 transition hover:border-gray-500 hover:text-white disabled:opacity-50"
            >
              {loadingLeads ? "⏳" : "🔄"} Atualizar
            </button>
          </div>

          {leadsError && (
            <div className="m-4 rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-300">
              {leadsError}
            </div>
          )}

          {loadingLeads ? (
            <div className="flex items-center justify-center py-16 text-gray-500">
              <div className="text-center">
                <div className="mb-2 text-3xl">⏳</div>
                <p className="text-sm">A carregar leads...</p>
              </div>
            </div>
          ) : leads.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-gray-500">
              <div className="text-center">
                <div className="mb-2 text-3xl">📭</div>
                <p className="text-sm">Nenhum lead qualificado ainda.</p>
                <p className="mt-1 text-xs text-gray-600">Use o botão "Simular Chat" para testar.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-left text-xs uppercase tracking-wider text-gray-500">
                    <th className="px-6 py-3">#</th>
                    <th className="px-6 py-3">Nome</th>
                    <th className="px-6 py-3">Telemóvel</th>
                    <th className="px-6 py-3">Estado de Crédito</th>
                    <th className="px-6 py-3">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {leads.map((lead, idx) => (
                    <tr key={lead.id} className="transition hover:bg-gray-800/50">
                      <td className="px-6 py-4 text-gray-500">{idx + 1}</td>
                      <td className="px-6 py-4 font-medium">{lead.nome}</td>
                      <td className="px-6 py-4 font-mono text-gray-300">{lead.telemovel}</td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${creditBadgeColor(lead.estado_credito)}`}>
                          {lead.estado_credito}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-400">{formatDate(lead.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal Chat */}
      {chatOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:items-center sm:justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setChatOpen(false)} />
          <div className="relative flex h-[600px] w-full max-w-md flex-col rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl">
            {/* Chat Header */}
            <div className="flex items-center justify-between rounded-t-2xl border-b border-gray-700 bg-gray-800 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm">🏠</div>
                <div>
                  <p className="text-sm font-semibold">ImoBot</p>
                  <p className="text-xs text-green-400">● Online</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={resetChat} title="Reiniciar" className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-700 hover:text-white">🔄</button>
                <button onClick={() => setChatOpen(false)} className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-700 hover:text-white">✕</button>
              </div>
            </div>

            {leadQualified && (
              <div className="border-b border-green-800 bg-green-950 px-4 py-2 text-xs text-green-300">
                ✅ Lead qualificado e gravado com sucesso no Supabase!
              </div>
            )}

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="mr-2 mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs">🏠</div>
                  )}
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${msg.role === "user" ? "rounded-tr-sm bg-blue-600 text-white" : "rounded-tl-sm bg-gray-800 text-gray-100"}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="mr-2 mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs">🏠</div>
                  <div className="rounded-2xl rounded-tl-sm bg-gray-800 px-4 py-3">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:150ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="border-t border-gray-700 p-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Escreva uma mensagem..."
                  disabled={sending}
                  className="flex-1 rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-500 active:scale-95 disabled:opacity-40"
                >
                  ➤
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
