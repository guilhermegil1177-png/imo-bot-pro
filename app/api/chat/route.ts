import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { saveLead, Lead } from "@/lib/supabase";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

// ============================================================
// CONTEXTO DO IMÓVEL
// Cole aqui o conteúdo completo do ficheiro imovel_teste_benfica.txt
// ============================================================
const IMOVEL_CONTEXT = `
[T3 BENFICA - REF: 2026-Bnf01
LOCALIZAÇÃO: Rua de Pedrouços, Benfica, Lisboa.
PREÇO: €420.000 (Negociável).
TIPOLOGIA: T3 (3 Quartos, sendo 1 em Suite).

CARACTERÍSTICAS PRINCIPAIS:

Área Útil: 110m².

Casas de Banho: 2 completas.

Cozinha: Totalmente equipada com eletrodomésticos Bosch (placa, forno, exaustor, frigorífico americano).

Varanda: 8m² com vista desafogada para o Parque Silva Porto.

Climatização: Ar condicionado instalado na sala e nos quartos.

EXTRAS:

Arrecadação individual no piso -1.

Prédio com 2 elevadores.

Orientação Solar: Nascente-Poente.

O QUE NÃO POSSUI (IMPORTANTE):

Garagem: Não possui lugar de garagem privativo (estacionamento fácil para residentes na rua).

Piscina/Ginásio: O condomínio não dispõe destas comodidades.

CONDIÇÕES DE VISITA:

Disponibilidade: Terças e Quintas-feiras, das 17h30 às 19h30.

Requisito: Apenas clientes com pré-aprovação bancária ou prova de fundos (capitais próprios).]
`;

const SYSTEM_PROMPT = `
És um assistente imobiliário especializado e simpático chamado "ImoBot".
O teu objetivo é ajudar potenciais compradores a conhecer o imóvel disponível e qualificá-los como leads.

INFORMAÇÃO DO IMÓVEL:
${IMOVEL_CONTEXT}

INSTRUÇÕES DE QUALIFICAÇÃO:
- Durante a conversa, recolhe de forma natural os seguintes dados do utilizador:
  1. Nome completo
  2. Número de telemóvel
  3. Estado do crédito (ex: "pré-aprovado", "a tratar", "sem crédito", "pagamento a pronto")
- Quando tiveres os 3 dados, confirma com o utilizador e informa que um consultor entrará em contacto.
- Responde sempre em Português de Portugal.
- Sê profissional, amigável e conciso.
- Não inventes informação sobre o imóvel que não esteja no contexto fornecido.
`;

// ============================================================
// FUNÇÃO DE QUALIFICAÇÃO DE LEAD
// ============================================================
interface ExtractedLead {
  nome?: string;
  telemovel?: string;
  estado_credito?: string;
}

function extractLeadData(messages: Array<{ role: string; content: string }>): ExtractedLead {
  const fullConversation = messages
    .map((m) => m.content)
    .join(" ")
    .toLowerCase();

  const extracted: ExtractedLead = {};

  // Extração de telemóvel (padrões PT: 9xxxxxxxx ou +351 9xxxxxxxx)
  const phoneRegex = /(\+351\s?)?([9][1236]\d{7})/g;
  const phoneMatch = fullConversation.match(phoneRegex);
  if (phoneMatch) {
    extracted.telemovel = phoneMatch[0].replace(/\s/g, "");
  }

  // Extração de estado de crédito
  const creditKeywords: Record<string, string> = {
    "pré-aprovado": "pré-aprovado",
    "pre-aprovado": "pré-aprovado",
    "pré aprovado": "pré-aprovado",
    aprovado: "pré-aprovado",
    "a tratar": "a tratar",
    "tratar crédito": "a tratar",
    "sem crédito": "sem crédito",
    "sem credito": "sem crédito",
    pronto: "pagamento a pronto",
    "a pronto": "pagamento a pronto",
    "pagamento a pronto": "pagamento a pronto",
  };

  for (const [keyword, value] of Object.entries(creditKeywords)) {
    if (fullConversation.includes(keyword)) {
      extracted.estado_credito = value;
      break;
    }
  }

  // Extração de nome (heurística: procura padrão "chamo-me X", "sou o/a X", "nome é X")
  const namePatterns = [
    /(?:chamo-me|chamo me|sou o|sou a|meu nome é|nome é|nome:)\s+([A-ZÀ-Ú][a-zà-ú]+(?:\s[A-ZÀ-Ú][a-zà-ú]+)*)/i,
    /(?:^|\s)([A-ZÀ-Ú][a-zà-ú]+\s[A-ZÀ-Ú][a-zà-ú]+)(?:\s|$)/,
  ];

  // Procura apenas nas mensagens do utilizador
  const userMessages = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join(" ");

  for (const pattern of namePatterns) {
    const match = userMessages.match(pattern);
    if (match) {
      extracted.nome = match[1].trim();
      break;
    }
  }

  return extracted;
}

function isLeadComplete(lead: ExtractedLead): lead is Lead {
  return !!(lead.nome && lead.telemovel && lead.estado_credito);
}

// ============================================================
// ROUTE HANDLER
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages } = body as {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
    };

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Campo 'messages' é obrigatório e deve ser um array." },
        { status: 400 }
      );
    }

    // Verifica se o lead já está qualificado
    const extractedLead = extractLeadData(messages);
    let leadSaved = false;

    if (isLeadComplete(extractedLead)) {
      const result = await saveLead(extractedLead);
      leadSaved = result.success;
    }

    // Chama a API da Groq
    const completion = await groq.chat.completions.create({
      model: "llama3-70b-8192",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 1024,
    });

    const assistantMessage = completion.choices[0]?.message?.content ?? "";

    return NextResponse.json({
      message: assistantMessage,
      leadQualified: isLeadComplete(extractedLead),
      leadSaved,
      // Útil para debug — remove em produção se preferires
      extractedData: extractedLead,
    });
  } catch (error: unknown) {
    console.error("[API Chat] Erro:", error);
    const message = error instanceof Error ? error.message : "Erro interno do servidor.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
