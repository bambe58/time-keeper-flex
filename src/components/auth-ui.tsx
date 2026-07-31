import { useEffect, useState } from "react";
import { LogOut, User, X } from "lucide-react";
import { lovable } from "@/integrations/lovable";

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

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-4 h-4" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2.5 24 .5 14.6.5 6.5 5.9 2.6 13.8l7.8 6C12.3 14 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-2.8-.4-4.1H24v7.7h12.7c-.3 2.1-1.6 5.3-4.7 7.4l7.6 5.9c4.5-4.2 6.9-10.3 6.9-16.9z" />
      <path fill="#FBBC05" d="M10.4 28.2a14.6 14.6 0 0 1 0-8.4l-7.8-6a24 24 0 0 0 0 20.4l7.8-6z" />
      <path fill="#34A853" d="M24 47.5c6.2 0 11.5-2 15.3-5.6l-7.6-5.9c-2 1.4-4.8 2.4-7.7 2.4-6.3 0-11.7-4.5-13.6-10.2l-7.8 6C6.5 42.1 14.6 47.5 24 47.5z" />
    </svg>
  );
}

export function LoginScreen() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setBusy(true);
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError("Accesso non riuscito. Riprova.");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    setBusy(false);
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          Gestione presenze
        </p>
        <h1 className="font-display text-4xl font-semibold uppercase tracking-wide mt-3">
          Calendario
        </h1>
        <p className="text-sm text-muted-foreground mt-3">
          Accedi per gestire ferie, permessi e smart working.
        </p>

        <button
          onClick={signIn}
          disabled={busy}
          className="mt-8 w-full flex items-center justify-center gap-3 rounded-2xl border border-border bg-card px-4 py-4 text-sm font-medium uppercase tracking-wide hover:bg-secondary transition disabled:opacity-60"
        >
          <GoogleIcon />
          {busy ? "Attendi…" : "Accedi con Google"}
        </button>

        {error && <p className="mt-4 text-xs text-destructive">{error}</p>}
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
