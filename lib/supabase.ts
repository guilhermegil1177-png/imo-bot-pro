import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export async function saveLead(lead: { nome: string; telemovel: string; estado_credito: string }) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const adminClient = createClient(supabaseUrl, serviceKey);

  // Mapeamos o texto do bot para o booleano da tua tabela
  const isAprovado = lead.estado_credito === "pré-aprovado" || lead.estado_credito === "pagamento a pronto";

 const { data, error } = await adminClient
    .from("leads")
    .insert([
      {
        nome: lead.nome,
        telemovel: lead.telemovel,
        credito_aprovado: temCredito, 
        perfil_cliente: lead.estado_credito,
        resumo_conversa: "Lead qualificado via Dashboard"
      },
    ])
    .select();

  if (error) {
    console.error("ERRO NO SUPABASE:", error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}
