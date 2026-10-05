import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/gallery")({
  head: () => ({
    meta: [
      { title: "Gallery — ZUIT AI" },
      { name: "description", content: "All your saved ZUIT AI creations in one place." },
      { property: "og:title", content: "Gallery — ZUIT AI" },
      { property: "og:description", content: "All your saved ZUIT AI creations in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Gallery,
});

function Gallery() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["creations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("creations").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      if (!data.length) return [];
      const { data: signed } = await supabase.storage.from("creations").createSignedUrls(data.map((d) => d.image_path), 3600);
      return data.map((d, i) => ({ ...d, url: signed?.[i]?.signedUrl ?? "" }));
    },
  });

  const remove = async (id: string, path: string) => {
    await supabase.storage.from("creations").remove([path]);
    await supabase.from("creations").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["creations"] });
    toast.success("Deleted");
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-4xl font-extrabold">Your gallery</h1>
      {isLoading ? (
        <p className="mt-6 text-muted-foreground">Loading…</p>
      ) : data.length === 0 ? (
        <div className="glass mt-8 rounded-3xl p-10 text-center">
          <p className="text-muted-foreground">No creations yet.</p>
          <Link to="/studio" className="btn-neon mt-4 inline-flex">Make your first</Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {data.map((c) => (
            <figure key={c.id} className="group glass overflow-hidden rounded-2xl">
              <img src={c.url} alt={c.effect_name ?? "Creation"} loading="lazy" className="aspect-square w-full object-cover" />
              <figcaption className="flex items-center justify-between p-3 text-sm">
                <span>{c.effect_name}</span>
                <span className="flex gap-3 text-muted-foreground">
                  <a href={c.url} download className="hover:text-primary">Save</a>
                  <button onClick={() => remove(c.id, c.image_path)} className="hover:text-destructive">Delete</button>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </main>
  );
}
