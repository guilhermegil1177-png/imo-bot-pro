import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export async function saveLead(lead: any) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceKey) {
    console.error("❌ ERRO: SUPABASE_SERVICE_ROLE_KEY não configurada na Vercel!");
    return { success: false, error: "Missing Key" };
  }

  const adminClient = createClient(supabaseUrl, serviceKey);

  // Tentativa de inserção com feedback detalhado
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
    console.error("❌ ERRO SUPABASE NA GRAVAÇÃO:", error.message);
    return { success: false, error: error.message };
  }

  console.log("✅ SUCESSO: Lead guardado!", data);
  return { success: true };
}
