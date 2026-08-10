import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type GroupMember = { id: string; username: string | null; avatar_url: string | null };

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return `TEAM-${out}`;
}

export function useGroups(userId: string | null, groupId: string | null) {
  const [code, setCode] = useState<string | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId || !groupId) {
      setCode(null);
      setMembers([]);
      return;
    }
    setLoading(true);
    const [{ data: group }, { data: people }] = await Promise.all([
      supabase.from("groups").select("code").eq("id", groupId).maybeSingle(),
      supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .eq("group_id", groupId)
        .order("username", { ascending: true }),
    ]);
    setCode(group?.code ?? null);
    setMembers((people as GroupMember[]) ?? []);
    setLoading(false);
  }, [userId, groupId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createGroup = useCallback(async () => {
    if (!userId) return { error: "Nessuna sessione attiva" };
    for (let attempt = 0; attempt < 5; attempt++) {
      const newCode = randomCode();
      const { data, error } = await supabase
        .from("groups")
        .insert({ code: newCode, created_by: userId })
        .select("id, code")
        .single();
      if (error) {
        if (error.code === "23505") continue; // codice duplicato: riprova
        return { error: error.message };
      }
      const { error: upErr } = await supabase
        .from("profiles")
        .update({ group_id: data.id })
        .eq("id", userId);
      if (upErr) return { error: upErr.message };
      return { error: null, code: data.code };
    }
    return { error: "Non è stato possibile generare un codice univoco" };
  }, [userId]);

  const joinGroup = useCallback(
    async (rawCode: string) => {
      if (!userId) return { error: "Nessuna sessione attiva" };
      const wanted = rawCode.trim().toUpperCase();
      if (!wanted) return { error: "Inserisci un codice" };
      const { data, error } = await supabase
        .from("groups")
        .select("id")
        .eq("code", wanted)
        .maybeSingle();
      if (error) return { error: error.message };
      if (!data) return { error: "Nessun gruppo trovato con questo codice" };
      const { error: upErr } = await supabase
        .from("profiles")
        .update({ group_id: data.id })
        .eq("id", userId);
      if (upErr) return { error: upErr.message };
      return { error: null };
    },
    [userId],
  );

  const leaveGroup = useCallback(async () => {
    if (!userId) return { error: "Nessuna sessione attiva" };
    const { error } = await supabase.from("profiles").update({ group_id: null }).eq("id", userId);
    return { error: error?.message ?? null };
  }, [userId]);

  return { code, members, loading, refresh, createGroup, joinGroup, leaveGroup };
}
