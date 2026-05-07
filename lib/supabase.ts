import { createClient } from "@supabase/supabase-js";

// Capturamos as chaves com fallback para string vazia para evitar erros de undefined no build
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Cliente público para o Dashboard (Browser)
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Função de gravação (Servidor)
export async function saveLead(lead: any) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing in server environment");
  }

  const adminClient = createClient(supabaseUrl, serviceKey);

  const { error } = await adminClient
    .from("leads")
    .insert([
      {
        nome: lead.nome,
        telemovel: lead.telemovel,
        estado_credito: lead.estado_credito,
      },
    ]);

  if (error) {
    console.error("[Supabase] Erro ao gravar:", error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}
