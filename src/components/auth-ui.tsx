import { useEffect, useState } from "react";
import { LogOut, User, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 animate-in fade-in" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl p-5 max-h-[92vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom-4">
        {children}
      </div>
    </div>
  );
}

// Accesso a utente singolo: l'email è fissa, l'utente inserisce solo la password.
const ACCESS_EMAIL = "firion888@gmail.com";

export function LoginScreen() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    if (window.location.hash.includes("type=recovery")) setRecovery(true);
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!password) {
      setError("Inserisci la password");
      return;
    }
    setBusy(true);
    if (recovery) {
      const { error } = await supabase.auth.updateUser({ password });
      setBusy(false);
      if (error) return setError("Impossibile impostare la password. Riprova.");
      setRecovery(false);
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email: ACCESS_EMAIL, password });
    setBusy(false);
    if (error) setError("Password non valida");
  }

  async function sendReset() {
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(ACCESS_EMAIL, {
      redirectTo: window.location.origin,
    });
    if (error) setError("Invio non riuscito. Riprova.");
    else setInfo("Ti abbiamo inviato un'email per impostare la password.");
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          Accesso riservato
        </p>
        <h1 className="font-display text-4xl font-semibold uppercase tracking-wide mt-3">
          Calendario
        </h1>

        <form onSubmit={submit} className="mt-8 space-y-3 text-left">
          <label className="block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {recovery ? "Nuova password" : "Password"}
          </label>
          <div className="flex gap-2">
            <input
              type={show ? "text" : "password"}
              autoFocus
              autoComplete={recovery ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm tracking-widest outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="shrink-0 rounded-xl border border-border bg-card px-3 text-[10px] uppercase tracking-widest hover:bg-secondary"
            >
              {show ? "Nascondi" : "Mostra"}
            </button>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-primary text-primary-foreground px-4 py-3 text-sm font-medium uppercase tracking-wide disabled:opacity-60"
          >
            {busy ? "Attendi…" : recovery ? "Imposta password" : "Accedi"}
          </button>
        </form>

        {!recovery && (
          <button
            onClick={sendReset}
            className="mt-4 text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
          >
            Imposta / recupera password
          </button>
        )}
        {error && <p className="mt-4 text-xs text-destructive">{error}</p>}
        {info && <p className="mt-4 text-xs text-muted-foreground">{info}</p>}
      </div>
    </main>
  );
}

export function OnboardingModal({
  defaultName,
  onSave,
}: {
  defaultName: string;
  onSave: (name: string) => Promise<string | null>;
}) {
  const [name, setName] = useState(defaultName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Il nome utente è obbligatorio");
      return;
    }
    setBusy(true);
    const err = await onSave(trimmed);
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl animate-in slide-in-from-bottom-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Benvenuto</p>
        <h3 className="font-display text-2xl font-semibold uppercase tracking-wide mt-1.5">
          Nome utente
        </h3>
        <p className="text-sm text-muted-foreground mt-2">
          Scegli come vuoi essere chiamato nell'app. Potrai modificarlo dalle impostazioni.
        </p>
        <input
          autoFocus
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Es. Marco"
          className="mt-4 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        <button
          onClick={submit}
          disabled={busy}
          className="mt-4 w-full rounded-xl bg-primary text-primary-foreground px-4 py-3 text-sm font-medium uppercase tracking-wide disabled:opacity-60"
        >
          {busy ? "Salvataggio…" : "Continua"}
        </button>
      </div>
    </div>
  );
}

export function ProfileModal({
  email,
  username,
  onSave,
  onSignOut,
  onClose,
}: {
  email: string;
  username: string;
  onSave: (name: string) => Promise<string | null>;
  onSignOut: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(username);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Il nome utente è obbligatorio");
      return;
    }
    setBusy(true);
    const err = await onSave(trimmed);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <Sheet onClose={onClose}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Account</p>
          <h3 className="font-display text-2xl font-semibold uppercase tracking-wide mt-1.5">
            Profilo
          </h3>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-secondary">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-border p-4">
        <span className="rounded-lg bg-secondary p-2">
          <User className="w-4 h-4" />
        </span>
        <span className="text-sm text-muted-foreground break-all">{email}</span>
      </div>

      <label className="block mt-4 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Nome utente
      </label>
      <input
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setError(null);
        }}
        className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

      <button
        onClick={submit}
        disabled={busy}
        className="mt-4 w-full rounded-xl bg-primary text-primary-foreground px-4 py-3 text-sm font-medium uppercase tracking-wide disabled:opacity-60"
      >
        {busy ? "Salvataggio…" : saved ? "Salvato ✓" : "Salva"}
      </button>

      <button
        onClick={onSignOut}
        className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-medium uppercase tracking-wide hover:bg-secondary transition"
      >
        <LogOut className="w-4 h-4" />
        Esci
      </button>
    </Sheet>
  );
}
