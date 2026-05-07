import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export async function saveLead(lead: { nome: string; telemovel: string; estado_credito: string }) {
  // Usamos a Service Role Key para ignorar o RLS
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const adminClient = createClient(supabaseUrl, serviceKey);

  console.log("--- TENTANDO GRAVAR LEAD ---");
  console.log("Dados:", lead);

  const { data, error } = await adminClient
    .from("leads") // <--- CONFIRMA SE O NOME É ESTE NO SUPABASE
    .insert([
      {
        nome: lead.nome,
        telemovel: lead.telemovel,
        estado_credito: lead.estado_credito,
      },
    ])
    .select();

  if (error) {
    console.error("ERRO CRÍTICO NO SUPABASE:", error.message);
    console.error("DETALHES DO ERRO:", error.details);
    console.error("HINT:", error.hint);
    return { success: false, error: error.message };
  }

  console.log("SUCESSO! Lead gravado:", data);
  return { success: true };
}
