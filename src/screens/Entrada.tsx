import { useState } from "react";
import { useStore } from "../data/store";
import { useAuth } from "../data/auth";
import type { Participant } from "../lib/types";

export default function Entrada({ inviteBanner }: { inviteBanner?: string } = {}) {
  const { participants, createParticipant, loginWithPassword } = useStore();
  const { signIn } = useAuth();
  const [mode, setMode] = useState<"menu" | "novo" | "existente">("menu");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [selected, setSelected] = useState<Participant | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function backToMenu() {
    setMode("menu");
    setName("");
    setPassword("");
    setSelected(null);
    setErr(null);
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
          ? 'Esse nome (ou um muito parecido) já está em uso. Tente um nome diferente.'
          : "Não consegui cadastrar. Tente de novo.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleLogin() {
    if (!selected || password.length < 4) return;
    setBusy(true);
    setErr(null);
    try {
      const me = await loginWithPassword(selected.name, password);
      signIn(me);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("wrong-password"))
        setErr("Senha incorreta. Tente de novo.");
      else if (msg.includes("email-confirmation-required"))
        setErr(
          'Ative "Disable email confirmations" no Supabase Auth → Settings antes de continuar.',
        );
      else setErr("Não consegui entrar. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

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
            className="rounded-xl bg-[var(--surface)] px-4 py-3 text-lg text-[var(--t1)] outline-none ring-[var(--accent)] placeholder:text-[var(--t3)] focus:ring-2"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Crie uma senha (mín. 4 caracteres)"
            className="rounded-xl bg-[var(--surface)] px-4 py-3 text-lg text-[var(--t1)] outline-none ring-[var(--accent)] placeholder:text-[var(--t3)] focus:ring-2"
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

      {mode === "existente" && !selected && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-[var(--t2)]">Toque no seu nome:</p>
          {participants.length === 0 ? (
            <p className="text-sm text-[var(--t3)]">
              Ninguém se cadastrou ainda. Use "Sou novo aqui".
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {participants.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelected(p);
                    setErr(null);
                  }}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-left font-medium text-[var(--t1)] transition-colors active:bg-[var(--raised)]"
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={backToMenu}
            className="text-sm text-[var(--t3)] transition-colors active:text-[var(--t2)]"
          >
            ← voltar
          </button>
        </div>
      )}

      {mode === "existente" && selected && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-[var(--t2)]">
            Entrando como{" "}
            <span className="font-semibold text-[var(--t1)]">
              {selected.name}
            </span>
          </p>
          <label className="text-sm text-[var(--t2)]">
            {selected.has_password || selected.has_auth
              ? "Digite sua senha:"
              : "Primeiro acesso — crie sua senha:"}
          </label>
          <input
            autoFocus
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder={
              selected.has_password
                ? "Sua senha"
                : "Crie uma senha (mín. 4 caracteres)"
            }
            className="rounded-xl bg-[var(--surface)] px-4 py-3 text-lg text-[var(--t1)] outline-none ring-[var(--accent)] placeholder:text-[var(--t3)] focus:ring-2"
          />
          {err && <p className="text-sm text-red-400">{err}</p>}
          <button
            onClick={handleLogin}
            disabled={busy || password.length < 4}
            className="rounded-2xl bg-[var(--accent)] py-3 font-bold text-[var(--accent-fg)] transition-all disabled:bg-[var(--raised)] disabled:text-[var(--t3)]"
          >
            {busy ? "Entrando…" : "Entrar"}
          </button>
          <button
            onClick={() => {
              setSelected(null);
              setPassword("");
              setErr(null);
            }}
            className="text-sm text-[var(--t3)] transition-colors active:text-[var(--t2)]"
          >
            ← escolher outro nome
          </button>
        </div>
      )}
    </div>
  );
}
