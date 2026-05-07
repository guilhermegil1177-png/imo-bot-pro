import { createClient } from "@supabase/supabase-js";

// Usamos fallbacks vazios para o build não quebrar
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Cliente público (Dashboard)
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export async function saveLead(lead: any) {
  // A chave de Admin SÓ é lida aqui dentro
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceKey || !supabaseUrl) {
    console.error("ERRO: Chaves do Supabase em falta no servidor!");
    return { success: false, error: "Missing keys" };
  }

  const adminClient = createClient(supabaseUrl, serviceKey);

  const { data, error } = await adminClient
    .from("leads")
    .insert([{
      nome: lead.nome,
      telemovel: lead.telemovel,
      estado_credito: lead.estado_credito,
    }])
    .select();

  if (error) {
    console.error("[Supabase Save Error]:", error.message);
    return { success: false, error: error.message };
  }
  return { success: true };
}
