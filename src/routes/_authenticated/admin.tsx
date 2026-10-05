import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — ZUIT AI" },
      { name: "description", content: "Manage ZUIT AI effects, AI people and selfie poses." },
      { property: "og:title", content: "Admin — ZUIT AI" },
      { property: "og:description", content: "Manage ZUIT AI effects, AI people and selfie poses." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Admin,
});

type TableName = "effects" | "ai_characters" | "ai_person_poses";
type Field = { key: string; label: string; type?: "text" | "textarea" | "number" | "select"; options?: string[] };

const TABS: { table: TableName; label: string; fields: Field[] }[] = [
  {
    table: "effects",
    label: "Effects",
    fields: [
      { key: "name", label: "Name" },
      { key: "emoji", label: "Emoji" },
      { key: "category", label: "Category" },
      { key: "prompt", label: "AI instruction", type: "textarea" },
      { key: "sort_order", label: "Order", type: "number" },
    ],
  },
  {
    table: "ai_characters",
    label: "AI People",
    fields: [
      { key: "name", label: "Name" },
      { key: "description", label: "Description" },
      { key: "image_url", label: "Image link" },
      { key: "consent_type", label: "Consent", type: "select", options: ["fictional", "public_figure", "licensed", "consented_creator", "custom"] },
      { key: "prompt", label: "AI instruction", type: "textarea" },
      { key: "sort_order", label: "Order", type: "number" },
    ],
  },
  {
    table: "ai_person_poses",
    label: "Selfie poses",
    fields: [
      { key: "name", label: "Name" },
      { key: "emoji", label: "Emoji" },
      { key: "prompt", label: "AI instruction", type: "textarea" },
      { key: "sort_order", label: "Order", type: "number" },
    ],
  },
];

export function useIsAdmin() {
  return useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return false;
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin");
      return !!data?.length;
    },
  });
}

function Admin() {
  const { data: isAdmin, isLoading } = useIsAdmin();
  const [tab, setTab] = useState(0);
  if (isLoading) return <p className="p-8 text-muted-foreground">Loading…</p>;
  if (!isAdmin)
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="font-display text-3xl font-extrabold">Admins only</h1>
        <p className="mt-3 text-muted-foreground">Your account doesn't have admin access.</p>
        <Link to="/studio" className="btn-neon mt-6 inline-flex">Back to Studio</Link>
      </main>
    );
  const t = TABS[tab];
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-4xl font-extrabold">Admin panel</h1>
      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((x, i) => (
          <button key={x.table} onClick={() => setTab(i)} className={i === tab ? "chip chip-active" : "chip"}>
            {x.label}
          </button>
        ))}
      </div>
      <TableEditor key={t.table} table={t.table} fields={t.fields} />
    </main>
  );
}

function TableEditor({ table, fields }: { table: TableName; fields: Field[] }) {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["admin", table],
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select("*").order("sort_order");
      if (error) throw error;
      return data as Record<string, unknown>[];
    },
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin", table] });
    qc.invalidateQueries();
  };
  const empty = Object.fromEntries(fields.map((f) => [f.key, f.type === "number" ? 0 : f.options?.[0] ?? ""]));
  return (
    <div className="mt-6 space-y-4">
      <RowForm fields={fields} initial={empty} submitLabel="Add new" onSave={async (v) => {
        const { error } = await supabase.from(table).insert(v as never);
        if (error) return toast.error(error.message);
        toast.success("Added");
        refresh();
        return true;
      }} />
      {data.map((row) => (
        <RowForm key={row.id as string} fields={fields} initial={row} submitLabel="Save"
          active={row.is_active as boolean}
          onToggle={async () => {
            const { error } = await supabase.from(table).update({ is_active: !row.is_active } as never).eq("id", row.id as string);
            if (error) return toast.error(error.message);
            refresh();
          }}
          onDelete={async () => {
            if (!confirm(`Delete "${row.name}"?`)) return;
            const { error } = await supabase.from(table).delete().eq("id", row.id as string);
            if (error) return toast.error(error.message);
            toast.success("Deleted");
            refresh();
          }}
          onSave={async (v) => {
            const { error } = await supabase.from(table).update(v as never).eq("id", row.id as string);
            if (error) return toast.error(error.message);
            toast.success("Saved");
            refresh();
          }} />
      ))}
    </div>
  );
}

function RowForm({ fields, initial, submitLabel, onSave, onDelete, onToggle, active }: {
  fields: Field[];
  initial: Record<string, unknown>;
  submitLabel: string;
  onSave: (v: Record<string, unknown>) => Promise<unknown>;
  onDelete?: () => void;
  onToggle?: () => void;
  active?: boolean;
}) {
  const pick = () => Object.fromEntries(fields.map((f) => [f.key, initial[f.key] ?? ""]));
  const [v, setV] = useState<Record<string, unknown>>(pick);
  const isNew = !onDelete;
  return (
    <form
      className={`glass grid gap-3 rounded-2xl p-4 md:grid-cols-2 ${active === false ? "opacity-60" : ""}`}
      onSubmit={async (e) => {
        e.preventDefault();
        const out = { ...v };
        fields.forEach((f) => { if (f.type === "number") out[f.key] = Number(out[f.key]) || 0; });
        const ok = await onSave(out);
        if (isNew && ok) setV(pick());
      }}
    >
      {isNew && <p className="font-display font-bold md:col-span-2">Add new</p>}
      {fields.map((f) => {
        const val = String(v[f.key] ?? "");
        const set = (x: string) => setV((s) => ({ ...s, [f.key]: x }));
        return (
          <label key={f.key} className={`text-xs text-muted-foreground ${f.type === "textarea" ? "md:col-span-2" : ""}`}>
            {f.label}
            {f.type === "textarea" ? (
              <textarea className="field mt-1 min-h-20 w-full" value={val} onChange={(e) => set(e.target.value)} required />
            ) : f.type === "select" ? (
              <select className="field mt-1 w-full" value={val} onChange={(e) => set(e.target.value)}>
                {f.options!.map((o) => <option key={o} value={o}>{o.replace(/_/g, " ")}</option>)}
              </select>
            ) : (
              <input className="field mt-1 w-full" type={f.type === "number" ? "number" : "text"} value={val}
                onChange={(e) => set(e.target.value)} required={f.key === "name" || f.key === "image_url"} />
            )}
          </label>
        );
      })}
      <div className="flex flex-wrap gap-2 md:col-span-2">
        <button className="btn-neon" type="submit">{submitLabel}</button>
        {onToggle && <button type="button" className="btn-ghost" onClick={onToggle}>{active ? "Hide" : "Show"}</button>}
        {onDelete && <button type="button" className="btn-ghost text-destructive" onClick={onDelete}>Delete</button>}
      </div>
    </form>
  );
}
