import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { saveLead } from "../../../lib/supabase";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

const IMOVEL_CONTEXT = `
[COLE AQUI O CONTEÚDO DO FICHEIRO imovel_teste_benfica.txt]
`;

const SYSTEM_PROMPT = `
És um assistente imobiliário especializado e simpático chamado "ImoBot".
O teu objetivo é ajudar potenciais compradores a conhecer o imóvel disponível e qualificá-los como leads.

INFORMAÇÃO DO IMÓVEL:
${IMOVEL_CONTEXT}

INSTRUÇÕES DE QUALIFICAÇÃO:
- Durante a conversa, recolhe de forma natural os seguintes dados do utilizador:
  1. Nome completo
  2. Número de telemóvel português (ex: 912345678)
  3. Estado do crédito: "pré-aprovado", "a tratar", "sem crédito" ou "pagamento a pronto"
- Quando tiveres os 3 dados, confirma com o utilizador e informa que um consultor entrará em contacto brevemente.
- Responde sempre em Português de Portugal.
- Sê profissional, amigável e conciso.
- Não inventes informação sobre o imóvel que não esteja no contexto fornecido.
`;

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ExtractedLead {
  nome?: string;
  telemovel?: string;
  estado_credito?: string;
}

interface QualifiedLead {
  nome: string;
  telemovel: string;
  estado_credito: string;
}

function extractLeadData(messages: ChatMessage[]): ExtractedLead {
  const userMessages = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join(" ");

  const fullConversation = messages.map((m) => m.content).join(" ");
  const extracted: ExtractedLead = {};

  // Telemóvel
  const phoneRegex = /(?:\+351\s?)?([9][1236]\d{7})/g;
  const phoneMatch = userMessages.match(phoneRegex);
  if (phoneMatch) {
    extracted.telemovel = phoneMatch[0].replace(/[\s\-]/g, "");
  }

  // Estado de crédito
  const creditMap: Array<[RegExp, string]> = [
    [/pr[eé].?aprovad[oa]/i, "pré-aprovado"],
    [/aprovad[oa]/i, "pré-aprovado"],
    [/a tratar/i, "a tratar"],
    [/tratar.{0,10}cr[eé]dito/i, "a tratar"],
    [/sem cr[eé]dito/i, "sem crédito"],
    [/pagamento a pronto/i, "pagamento a pronto"],
    [/a pronto/i, "pagamento a pronto"],
    [/\bpronto\b/i, "pagamento a pronto"],
  ];

  for (const [pattern, value] of creditMap) {
    if (pattern.test(fullConversation)) {
      extracted.estado_credito = value;
      break;
    }
  }

  // Nome
  const namePatterns: RegExp[] = [
    /(?:chamo-me|chamo me|sou o|sou a|meu nome [eé]|nome [eé]|nome:)\s+([A-ZÀ-Úa-zà-ú][a-zà-ú]+(?:\s[A-ZÀ-Úa-zà-ú][a-zà-ú]+)+)/i,
    /^([A-ZÀ-Ú][a-zà-ú]+(?:\s[A-ZÀ-Ú][a-zà-ú]+)+)$/m,
  ];

  for (const pattern of namePatterns) {
    const match = userMessages.match(pattern);
    if (match) {
      extracted.nome = match[1].trim();
      break;
    }
  }

  return extracted;
}

function isLeadComplete(lead: ExtractedLead): lead is QualifiedLead {
  return !!(
    lead.nome &&
    lead.nome.trim().length > 2 &&
    lead.telemovel &&
    lead.telemovel.length >= 9 &&
    lead.estado_credito
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages } = body as { messages: ChatMessage[] };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Campo 'messages' é obrigatório e deve ser um array não vazio." },
        { status: 400 }
      );
    }

    const extractedLead = extractLeadData(messages);
    const qualified = isLeadComplete(extractedLead);
    let leadSaved = false;

    if (qualified) {
      const result = await saveLead(extractedLead);
      leadSaved = result.success;
    }

    const completion = await groq.chat.completions.create({
      model: "llama3-70b-8192",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 1024,
    });

    const assistantMessage =
      completion.choices[0]?.message?.content ??
      "Desculpe, não consegui gerar uma resposta.";

    return NextResponse.json({
      message: assistantMessage,
      leadQualified: qualified,
      leadSaved,
      extractedData: extractedLead,
    });
  } catch (error: unknown) {
    console.error("[API /chat] Erro:", error);
    const message =
      error instanceof Error ? error.message : "Erro interno do servidor.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}