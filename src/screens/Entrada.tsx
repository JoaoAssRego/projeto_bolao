import { useState } from "react";
import { useStore } from "../data/store";
import { useAuth } from "../data/auth";
import { supabase } from "../lib/supabase";

export default function Entrada({ inviteBanner }: { inviteBanner?: string } = {}) {
  const { createParticipant, loginWithPassword, resetPasswordWithToken } = useStore();
  const { signIn } = useAuth();
  const [mode, setMode] = useState<"menu" | "novo" | "existente" | "esqueci" | "confirmar-reset">("menu");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  function backToMenu() {
    setMode("menu");
    setName("");
    setPassword("");
    setResetEmail("");
    setResetCode("");
    setNewPassword("");
    setErr(null);
    setSuccessMsg(null);
  }

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed || password.length < 4) return;
    setBusy(true);
    setErr(null);
    try {
      const created = await createParticipant(trimmed, password);
      signIn(created);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      setErr(
        msg.includes("duplicate")
          ? "Esse nome (ou um muito parecido) já está em uso. Tente um nome diferente."
          : "Não consegui cadastrar. Tente de novo.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleLogin() {
    const trimmed = name.trim();
    if (!trimmed || password.length < 4) return;
    setBusy(true);
    setErr(null);
    try {
      const me = await loginWithPassword(trimmed, password);
      signIn(me);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("wrong-password") || msg.includes("not-found"))
        setErr("Usuário/email ou senha incorretos.");
      else if (msg.includes("email-confirmation-required"))
        setErr(
          'Ative "Disable email confirmations" no Supabase Auth → Settings antes de continuar.',
        );
      else setErr("Não consegui entrar. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSendResetEmail() {
    const email = resetEmail.trim();
    if (!email || !email.includes("@")) return;
    setBusy(true);
    setErr(null);
    try {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      setSuccessMsg(
        "Se esse email estiver cadastrado e confirmado, você receberá um link de redefinição em breve.",
      );
    } catch {
      // Nunca revela se o email existe ou não
      setSuccessMsg(
        "Se esse email estiver cadastrado e confirmado, você receberá um link de redefinição em breve.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmReset() {
    const trimmed = name.trim();
    const code = resetCode.trim().toUpperCase();
    if (!trimmed || code.length < 6 || newPassword.length < 4) return;
    setBusy(true);
    setErr(null);
    try {
      await resetPasswordWithToken(trimmed, code, newPassword);
      setSuccessMsg("Senha redefinida com sucesso!");
      setMode("existente");
      setPassword("");
      setResetCode("");
      setNewPassword("");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("invalid-token"))
        setErr("Código inválido. Verifique com o administrador.");
      else if (msg.includes("expired-token"))
        setErr("Código expirado. Peça ao administrador um novo código.");
      else if (msg.includes("not-found"))
        setErr("Nome não encontrado. Digite exatamente como se cadastrou.");
      else setErr("Não consegui redefinir a senha. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "rounded-xl bg-[var(--surface)] px-4 py-3 text-lg text-[var(--t1)] outline-none ring-[var(--accent)] placeholder:text-[var(--t3)] focus:ring-2";

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6">
      {inviteBanner && (
        <div className="rounded-xl border border-[var(--accent-ring)] bg-[var(--accent-muted)] px-4 py-3 text-sm text-[var(--t1)]">
          {inviteBanner}
        </div>
      )}
      <div className="text-center">
        <img src="/icon.svg" alt="" className="mx-auto h-20 w-20 rounded-2xl" />
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-[var(--t1)]">
          Bolão
        </h1>
        <p className="mt-1 text-sm text-[var(--t2)]">
          Palpite nos jogos e dispute com a galera.
        </p>
      </div>

      {mode === "menu" && (
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setMode("novo")}
            className="rounded-2xl bg-[var(--accent)] py-4 text-lg font-bold text-[var(--accent-fg)] transition-opacity active:opacity-90"
          >
            Sou novo aqui
          </button>
          <button
            onClick={() => setMode("existente")}
            className="rounded-2xl border border-[var(--border)] py-4 text-lg font-semibold text-[var(--t1)] transition-colors active:bg-[var(--surface)]"
          >
            Já participo
          </button>
        </div>
      )}

      {mode === "novo" && (
        <div className="flex flex-col gap-3">
          <label className="text-sm text-[var(--t2)]">
            Como você quer aparecer no ranking?
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome ou apelido"
            maxLength={24}
            className={inputCls}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Crie uma senha (mín. 4 caracteres)"
            className={inputCls}
          />
          {err && <p className="text-sm text-red-400">{err}</p>}
          <button
            onClick={handleCreate}
            disabled={busy || !name.trim() || password.length < 4}
            className="rounded-2xl bg-[var(--accent)] py-3 font-bold text-[var(--accent-fg)] transition-all disabled:bg-[var(--raised)] disabled:text-[var(--t3)]"
          >
            {busy ? "Entrando…" : "Cadastrar e entrar"}
          </button>
          <button
            onClick={backToMenu}
            className="text-sm text-[var(--t3)] transition-colors active:text-[var(--t2)]"
          >
            ← voltar
          </button>
        </div>
      )}

      {mode === "existente" && (
        <div className="flex flex-col gap-3">
          {successMsg && (
            <p className="rounded-xl bg-green-900/40 px-4 py-3 text-sm text-green-300">
              {successMsg}
            </p>
          )}
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome, apelido ou email"
            maxLength={64}
            className={inputCls}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="Sua senha"
            className={inputCls}
          />
          {err && <p className="text-sm text-red-400">{err}</p>}
          <button
            onClick={handleLogin}
            disabled={busy || !name.trim() || password.length < 4}
            className="rounded-2xl bg-[var(--accent)] py-3 font-bold text-[var(--accent-fg)] transition-all disabled:bg-[var(--raised)] disabled:text-[var(--t3)]"
          >
            {busy ? "Entrando…" : "Entrar"}
          </button>
          <div className="flex items-center justify-between">
            <button
              onClick={backToMenu}
              className="text-sm text-[var(--t3)] transition-colors active:text-[var(--t2)]"
            >
              ← voltar
            </button>
            <button
              onClick={() => { setMode("esqueci"); setErr(null); setSuccessMsg(null); }}
              className="text-sm text-[var(--t3)] transition-colors active:text-[var(--t2)]"
            >
              Esqueci minha senha
            </button>
          </div>
        </div>
      )}

      {mode === "esqueci" && (
        <div className="flex flex-col gap-3">
          <h2 className="font-bold text-lg text-[var(--t1)]">Redefinir senha</h2>

          {!successMsg ? (
            <>
              <p className="text-sm text-[var(--t2)]">
                Digite o email cadastrado na sua conta para receber o link de redefinição.
              </p>
              <input
                autoFocus
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendResetEmail()}
                placeholder="seu@email.com"
                className={inputCls}
              />
              {err && <p className="text-sm text-red-400">{err}</p>}
              <button
                onClick={handleSendResetEmail}
                disabled={busy || !resetEmail.trim() || !resetEmail.includes("@")}
                className="rounded-2xl bg-[var(--accent)] py-3 font-bold text-[var(--accent-fg)] transition-all disabled:bg-[var(--raised)] disabled:text-[var(--t3)]"
              >
                {busy ? "Enviando…" : "Enviar link de recuperação"}
              </button>

              <div className="relative my-1 flex items-center gap-3">
                <div className="h-px flex-1 bg-[var(--border)]" />
                <span className="text-xs text-[var(--t3)]">ou</span>
                <div className="h-px flex-1 bg-[var(--border)]" />
              </div>

              <p className="text-xs text-[var(--t3)]">
                Sem email cadastrado?{" "}
                <button
                  onClick={() => { setMode("confirmar-reset"); setErr(null); }}
                  className="underline text-[var(--t2)] active:text-[var(--t1)]"
                >
                  Use um código do administrador
                </button>
              </p>
            </>
          ) : (
            <p className="rounded-xl bg-green-900/40 px-4 py-3 text-sm text-green-300">
              {successMsg}
            </p>
          )}

          <button
            onClick={() => { setMode("existente"); setErr(null); setSuccessMsg(null); }}
            className="text-sm text-[var(--t3)] transition-colors active:text-[var(--t2)]"
          >
            ← voltar
          </button>
        </div>
      )}

      {mode === "confirmar-reset" && (
        <div className="flex flex-col gap-3">
          <h2 className="font-bold text-lg text-[var(--t1)]">Código do administrador</h2>
          <p className="text-sm text-[var(--t2)]">
            Peça ao administrador do bolão para gerar um código de redefinição. O código expira em 2 horas.
          </p>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome ou apelido"
            maxLength={24}
            className={inputCls}
          />
          <input
            value={resetCode}
            onChange={(e) => setResetCode(e.target.value.toUpperCase())}
            placeholder="Código (6 caracteres)"
            maxLength={6}
            className={`${inputCls} font-mono tracking-widest`}
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleConfirmReset()}
            placeholder="Nova senha (mín. 4 caracteres)"
            className={inputCls}
          />
          {err && <p className="text-sm text-red-400">{err}</p>}
          <button
            onClick={handleConfirmReset}
            disabled={busy || !name.trim() || resetCode.trim().length < 6 || newPassword.length < 4}
            className="rounded-2xl bg-[var(--accent)] py-3 font-bold text-[var(--accent-fg)] transition-all disabled:bg-[var(--raised)] disabled:text-[var(--t3)]"
          >
            {busy ? "Redefinindo…" : "Redefinir senha"}
          </button>
          <button
            onClick={() => { setMode("esqueci"); setErr(null); }}
            className="text-sm text-[var(--t3)] transition-colors active:text-[var(--t2)]"
          >
            ← voltar
          </button>
        </div>
      )}
    </div>
  );
}
