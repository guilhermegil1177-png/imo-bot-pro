import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Este cliente é seguro para o Browser (Frontend)
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Função para gravar lead (Esta função será chamada apenas pelo servidor)
export async function saveLead(lead: any) {
  // Importamos a chave secreta apenas dentro da função
  // Isso garante que o browser ignore este bloco
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
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
    console.error("[Supabase] Erro:", error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}
