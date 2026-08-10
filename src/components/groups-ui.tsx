import { useEffect, useState } from "react";
import { Copy, LogOut, Users, X } from "lucide-react";
import { useGroups } from "@/hooks/useGroups";

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

export function GroupsModal({
  userId,
  groupId,
  username,
  onSaveUsername,
  onProfileChanged,
  onClose,
}: {
  userId: string | null;
  groupId: string | null;
  username: string;
  onSaveUsername: (name: string) => Promise<string | null>;
  onProfileChanged: () => void;
  onClose: () => void;
}) {
  const { code, members, loading, createGroup, joinGroup, leaveGroup } = useGroups(userId, groupId);
  const [name, setName] = useState(username);
  const [nameMsg, setNameMsg] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameMsg("Il nome utente è obbligatorio");
      return;
    }
    setBusy(true);
    const err = await onSaveUsername(trimmed);
    setBusy(false);
    setNameMsg(err ?? "Salvato ✓");
    if (!err) setTimeout(() => setNameMsg(null), 1800);
  }

  async function run(fn: () => Promise<{ error: string | null }>) {
    setBusy(true);
    setError(null);
    const res = await fn();
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    onProfileChanged();
  }

  return (
    <Sheet onClose={onClose}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Condivisione
          </p>
          <h3 className="font-display text-2xl font-semibold uppercase tracking-wide mt-1.5">
            Gruppi
          </h3>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-secondary">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nome utente */}
      <label className="block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Nome utente
      </label>
      <div className="mt-2 flex gap-2">
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setNameMsg(null);
          }}
          className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={saveName}
          disabled={busy}
          className="rounded-xl bg-primary text-primary-foreground px-4 text-xs font-medium uppercase tracking-wide disabled:opacity-60"
        >
          Salva
        </button>
      </div>
      {nameMsg && <p className="mt-2 text-xs text-muted-foreground">{nameMsg}</p>}

      <div className="my-5 h-px bg-border" />

      {groupId ? (
        <>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Il tuo gruppo
          </p>
          <div className="mt-2 flex items-center gap-3 rounded-xl border border-border p-4">
            <span className="rounded-lg bg-secondary p-2">
              <Users className="w-4 h-4" />
            </span>
            <span className="flex-1 text-sm font-semibold tracking-wide">{code ?? "…"}</span>
            <button
              onClick={() => {
                if (!code) return;
                void navigator.clipboard?.writeText(code);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="p-2 rounded-lg hover:bg-secondary"
              aria-label="Copia codice"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          {copied && <p className="mt-2 text-xs text-muted-foreground">Codice copiato</p>}

          <p className="mt-5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Membri {members.length > 0 && `(${members.length})`}
          </p>
          <div className="mt-2 space-y-2">
            {loading && <p className="text-xs text-muted-foreground">Caricamento…</p>}
            {!loading && members.length === 0 && (
              <p className="text-xs text-muted-foreground">Nessun membro trovato.</p>
            )}
            {members.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-xl border border-border px-4 py-3"
              >
                {m.avatar_url ? (
                  <img src={m.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <span className="w-7 h-7 rounded-full bg-secondary grid place-items-center text-[10px] font-semibold uppercase">
                    {(m.username ?? "?").slice(0, 2)}
                  </span>
                )}
                <span className="text-sm">
                  {m.username ?? "Senza nome"}
                  {m.id === userId && (
                    <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                      tu
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={() => run(leaveGroup)}
            disabled={busy}
            className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-medium uppercase tracking-wide hover:bg-secondary transition disabled:opacity-60"
          >
            <LogOut className="w-4 h-4" />
            Esci dal gruppo
          </button>
        </>
      ) : (
        <>
          <button
            onClick={() => run(createGroup)}
            disabled={busy}
            className="w-full rounded-xl bg-primary text-primary-foreground px-4 py-3 text-sm font-medium uppercase tracking-wide disabled:opacity-60"
          >
            Crea nuovo gruppo
          </button>

          <p className="mt-5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Unisciti a un gruppo
          </p>
          <div className="mt-2 flex gap-2">
            <input
              value={joinCode}
              onChange={(e) => {
                setJoinCode(e.target.value.toUpperCase());
                setError(null);
              }}
              placeholder="TEAM-XXXXXX"
              className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm uppercase tracking-wide outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={() => run(() => joinGroup(joinCode))}
              disabled={busy}
              className="rounded-xl border border-border px-4 text-xs font-medium uppercase tracking-wide hover:bg-secondary disabled:opacity-60"
            >
              Unisciti
            </button>
          </div>
        </>
      )}

      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
    </Sheet>
  );
}
