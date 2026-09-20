import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthLayout } from "../../layouts/AuthLayout";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { supabase } from "../../lib/supabase";
import { toErrorMessage } from "../../services/api";
import { isValidEmail } from "../../utils/validation";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";

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
      setErrors({
        form: toErrorMessage({ message: "Credenciais inválidas. Verifique email e senha." }),
      });
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
    <AuthLayout>
      {forgot ? (
        <form
          className="auth__form"
          onSubmit={(e) => {
            e.preventDefault();
            void handleReset();
          }}
        >
          <h2>Redefinir senha</h2>
          <p className="text-muted">
            Informe seu email e enviaremos um link de recuperação.
          </p>
          <Input
            label="Email"
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            autoComplete="email"
            placeholder="voce@barbearia.com"
          />
          {errors.form ? <p className="form-error">{errors.form}</p> : null}
          <Button type="submit" className="w-full" loading={resetBusy}>
            Enviar link
          </Button>
          <button
            type="button"
            className="link-btn"
            onClick={() => setForgot(false)}
          >
            Voltar ao login
          </button>
        </form>
      ) : (
        <form className="auth__form" onSubmit={handleSubmit}>
          <h2>Entrar</h2>
          <p className="text-muted">Acesso para donos, barbeiros e administradores.</p>
          <Input
            label="Email"
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            autoComplete="email"
            placeholder="voce@barbearia.com"
          />
          <Input
            label="Senha"
            type="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            autoComplete="current-password"
            placeholder="••••••••"
          />
          {errors.form ? <p className="form-error">{errors.form}</p> : null}
          <Button type="submit" className="w-full" loading={busy}>
            Entrar
          </Button>
          <button type="button" className="link-btn" onClick={() => setForgot(true)}>
            Esqueci minha senha
          </button>
        </form>
      )}
    </AuthLayout>
  );
}