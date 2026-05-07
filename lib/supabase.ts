import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Cliente para o Frontend (Seguro)
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Função para gravar lead (Executa apenas no Servidor)
export async function saveLead(lead: any) {
  // A chave secreta só é lida aqui dentro, onde o browser não chega
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const adminClient = createClient(supabaseUrl, serviceKey);

  const { error } = await adminClient
    .from("leads")
    .insert([
      {
        nome: lead.nome,
        telemovel: lead.telemovel,
        estado_credito: lead.estado_credito, // Nome da tua coluna no print
      },
    ]);

  if (error) {
    console.error("[Supabase] Erro ao gravar lead:", error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}
