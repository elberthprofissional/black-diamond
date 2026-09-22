import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { supabase } from "../../lib/supabase";
import { toErrorMessage } from "../../services/api";
import { isValidEmail } from "../../utils/validation";
import { Lock, Mail } from "lucide-react";

interface FormErrors {
  email?: string;
  password?: string;
  form?: string;
}

export function LoginPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);

  useEffect(() => {
    if (isLoading || !user) return;
    navigate("/", { replace: true });
  }, [user, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: FormErrors = {};
    if (!isValidEmail(email)) next.email = "Informe um email válido.";
    if (!password) next.password = "Informe sua senha.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      setErrors({ form: "Credenciais inválidas. Verifique email e senha." });
      return;
    }
    showToast("Login realizado.", "success");
  };

  const handleReset = async () => {
    if (!isValidEmail(email)) {
      setErrors({ email: "Informe o email cadastrado para redefinir a senha." });
      return;
    }
    setResetBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/login`,
    });
    setResetBusy(false);
    setForgot(false);
    if (error) {
      setErrors({ form: toErrorMessage(error) });
      return;
    }
    showToast("Enviamos um link para redefinir sua senha.", "success");
  };

  return (
    <div className="flex h-screen w-full bg-[#0a0a0a]">
      <div className="w-full hidden md:block">
        <img src="/login.webp" alt="BLACK DIAMOND" className="h-full w-full object-cover" />
      </div>

      <div className="w-full flex flex-col items-center justify-center px-6">
        <div className="mb-10 flex flex-col items-center">
          <img src="/logo.webp" alt="BLACK DIAMOND" className="w-[92px] h-[92px] object-contain" />
          <strong className="mt-2 text-2xl font-bold text-white">
            BLACK <span className="text-[#c2a25c]">DIAMOND</span>
          </strong>
        </div>

        {forgot ? (
          <form
            className="md:w-96 w-full max-w-md flex flex-col"
            onSubmit={(e) => {
              e.preventDefault();
              void handleReset();
            }}
          >
            <h2 className="text-4xl text-white font-medium">Redefinir senha</h2>
            <p className="text-sm text-zinc-400 mt-3">
              Informe seu email e enviaremos um link de recuperação.
            </p>

            <div className="flex items-center w-full bg-transparent border border-white/10 h-12 rounded-full overflow-hidden pl-6 gap-2 mt-8">
              <Mail size={16} className="text-[#c2a25c]" />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-transparent text-white placeholder-zinc-500 outline-none text-sm w-full h-full"
              />
            </div>
            {errors.email ? <p className="text-sm text-red-400 mt-2">{errors.email}</p> : null}
            {errors.form ? <p className="text-sm text-red-400 mt-3">{errors.form}</p> : null}

            <button
              type="submit"
              disabled={resetBusy}
              className="mt-8 w-full h-11 rounded-full text-black bg-gradient-to-b from-[#ccac69] via-[#b2903f] to-[#8d6f26] hover:opacity-90 transition-opacity font-semibold disabled:opacity-60"
            >
              {resetBusy ? "Enviando..." : "Enviar link"}
            </button>
            <button
              type="button"
              onClick={() => setForgot(false)}
              className="mt-4 self-center text-sm text-[#c2a25c] underline hover:text-[#d3b877]"
            >
              Voltar ao login
            </button>
          </form>
        ) : (
          <form className="md:w-96 w-full max-w-md flex flex-col" onSubmit={handleSubmit}>
            <h2 className="text-4xl text-white font-medium">Entrar</h2>
            <p className="text-sm text-zinc-400 mt-3">
              Acesso para donos, barbeiros e administradores.
            </p>

            <button
              type="button"
              className="w-full mt-8 bg-white/5 border border-white/10 flex items-center justify-center gap-2 h-12 rounded-full text-zinc-300"
            >
              <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
                <path
                  fill="#FFC107"
                  d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"
                />
                <path
                  fill="#FF3D00"
                  d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
                />
                <path
                  fill="#4CAF50"
                  d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
                />
                <path
                  fill="#1976D2"
                  d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.7l6.2 5.2C44.3 36.5 48 31 48 24c0-1.3-.1-2.6-.4-3.9z"
                />
              </svg>
              Continue with Google
            </button>

            <div className="flex items-center gap-4 w-full my-5">
              <div className="w-full h-px bg-white/10"></div>
              <p className="w-full text-nowrap text-sm text-zinc-500">ou entre com o email</p>
              <div className="w-full h-px bg-white/10"></div>
            </div>

            <div className="flex items-center w-full bg-transparent border border-white/10 h-12 rounded-full overflow-hidden pl-6 gap-2">
              <Mail size={16} className="text-[#c2a25c]" />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-transparent text-white placeholder-zinc-500 outline-none text-sm w-full h-full"
              />
            </div>
            {errors.email ? <p className="text-sm text-red-400 mt-2">{errors.email}</p> : null}

            <div className="flex items-center w-full bg-transparent border border-white/10 h-12 rounded-full overflow-hidden pl-6 gap-2 mt-5">
              <Lock size={16} className="text-[#c2a25c]" />
              <input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-transparent text-white placeholder-zinc-500 outline-none text-sm w-full h-full"
              />
            </div>
            {errors.password ? <p className="text-sm text-red-400 mt-2">{errors.password}</p> : null}

            {errors.form ? <p className="text-sm text-red-400 mt-3 text-center">{errors.form}</p> : null}

            <div className="w-full flex items-center justify-between mt-6 text-zinc-400">
              <div className="flex items-center gap-2">
                <input
                  className="h-5 w-5 accent-[#c2a25c]"
                  type="checkbox"
                  id="remember"
                  defaultChecked
                />
                <label className="text-sm" htmlFor="remember">
                  Manter conectado
                </label>
              </div>
              <button
                type="button"
                onClick={() => setForgot(true)}
                className="text-sm underline text-[#c2a25c] hover:text-[#d3b877]"
              >
                Esqueceu a senha?
              </button>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="mt-8 w-full h-11 rounded-full text-black bg-gradient-to-b from-[#ccac69] via-[#b2903f] to-[#8d6f26] hover:opacity-90 transition-opacity font-semibold disabled:opacity-60"
            >
              {busy ? "Entrando..." : "Entrar"}
            </button>
            <p className="text-zinc-500 text-sm mt-4 text-center">Acesso restrito à equipe.</p>
          </form>
        )}

        <p className="mt-10 text-xs text-zinc-500">
          © {new Date().getFullYear()} BLACK DIAMOND
        </p>
      </div>
    </div>
  );
}