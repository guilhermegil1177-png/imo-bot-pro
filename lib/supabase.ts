import { createClient } from "@supabase/supabase-js";

// Cliente público (uso no frontend, se necessário)
export const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Cliente admin com service role (uso exclusivo no servidor)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Tipos
export interface Lead {
  id?: number;
  nome: string;
  telemovel: string;
  estado_credito: string;
  created_at?: string;
}

// Função para gravar lead na tabela 'leads'
export async function saveLead(lead: Lead): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabaseAdmin
    .from("leads")
    .insert([
      {
        nome: lead.nome,
        telemovel: lead.telemovel,
        estado_credito: lead.estado_credito,
      },
    ]);

  if (error) {
    console.error("[Supabase] Erro ao gravar lead:", error.message);
    return { success: false, error: error.message };
  }

  console.log("[Supabase] Lead gravado com sucesso:", lead.nome);
  return { success: true };
}