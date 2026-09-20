import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Variáveis de ambiente ausentes. Crie um arquivo .env a partir do .env.example com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Fuso horário de referência do negócio (barbearias brasileiras).
// Usado na RPC de disponibilidade/agendamento — o servidor é quem valida.
export const BUSINESS_TZ = "America/Sao_Paulo";