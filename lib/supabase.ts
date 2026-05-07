import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Este cliente é seguro para o Browser (Frontend)
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Função para gravar lead (Esta função será chamada apenas pelo servidor)
export async function saveLead(lead: { nome: string; telemovel: string; estado_credito: string }) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const adminClient = createClient(supabaseUrl, serviceKey);

  console.log("[Supabase] Tentando gravar:", lead);

  const { data, error } = await adminClient
    .from("leads")
    .insert([
      {
        nome: lead.nome,
        telemovel: lead.telemovel,
        estado_credito: lead.estado_credito,
      }
    ])
    .select();

  if (error) {
    console.error("[Supabase] Erro detalhado:", error);
    return { success: false, error: error.message };
  }

  console.log("[Supabase] Gravado com sucesso:", data);
  return { success: true };
}
