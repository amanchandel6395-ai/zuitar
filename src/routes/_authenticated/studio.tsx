import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { streamImage } from "@/lib/stream-image";

export const Route = createFileRoute("/_authenticated/studio")({
  head: () => ({
    meta: [
      { title: "Studio — ZUIT AI" },
      { name: "description", content: "Capture or upload a photo and transform it with AI effects." },
      { property: "og:title", content: "Studio — ZUIT AI" },
      { property: "og:description", content: "Capture or upload a photo and transform it with AI effects." },
    ],
  }),
  component: Studio,
});

type Effect = { id: string; name: string; category: string; emoji: string };

function Studio() {
  const qc = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [cameraOn, setCameraOn] = useState(false);
  const [source, setSource] = useState<Blob | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isFinal, setIsFinal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [effectId, setEffectId] = useState<string | null>(null);
  const [custom, setCustom] = useState("");
  const [category, setCategory] = useState("all");

  const { data: effects = [] } = useQuery({
    queryKey: ["effects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("effects")
        .select("id,name,category,emoji")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as Effect[];
    },
  });
  const categories = ["all", ...Array.from(new Set(effects.map((e) => e.category)))];

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  };

  const startCamera = async (mode = facing) => {
    stopCamera();
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode, width: 1280, height: 1280 } });
      streamRef.current = s;
      setCameraOn(true);
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = s;
      });
    } catch {
      toast.error("Camera unavailable. Try uploading a photo instead.");
    }
  };

  useEffect(() => () => stopCamera(), []);

  const setPhoto = (blob: Blob) => {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    setSource(blob);
    setSourceUrl(URL.createObjectURL(blob));
    setResult(null);
    setIsFinal(false);
  };

  const capture = () => {
    const v = videoRef.current;
    if (!v) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext("2d")!;
    if (facing === "user") {
      ctx.translate(c.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(v, 0, 0);
    c.toBlob((b) => b && setPhoto(b), "image/png");
    stopCamera();
  };

  const apply = async () => {
    if (!source) return;
    if (!effectId && !custom.trim()) { toast.error("Pick an effect or describe a change"); return; }
    setBusy(true);
    setResult(null);
    setIsFinal(false);
    try {
      const { data } = await supabase.auth.getSession();
      const form = new FormData();
      form.append("image", new File([source], "photo.png", { type: source.type || "image/png" }));
      if (effectId) form.append("effect_id", effectId);
      if (custom.trim()) form.append("custom_prompt", custom.trim());
      await streamImage(
        "/api/edit-image",
        form,
        (src, final) => {
          setResult(src);
          setIsFinal(final);
        },
        undefined,
        { Authorization: `Bearer ${data.session?.access_token ?? ""}` },
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      toast.error(
        msg.includes("402") ? "Out of AI credits." : msg.includes("429") ? "Too many requests — try again shortly." : "The AI edit failed. Please try again.",
      );
      setResult(null);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!result || !isFinal) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const blob = await (await fetch(result)).blob();
    const path = `${u.user.id}/${crypto.randomUUID()}.png`;
    const up = await supabase.storage.from("creations").upload(path, blob, { contentType: "image/png" });
    if (up.error) { toast.error("Could not save"); return; }
    const effect = effects.find((e) => e.id === effectId);
    await supabase.from("creations").insert({ user_id: u.user.id, image_path: path, effect_name: effect?.name ?? "Custom", prompt: custom || null });
    qc.invalidateQueries({ queryKey: ["creations"] });
    toast.success("Saved to your gallery");
  };

  const shown = result ?? sourceUrl;

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[1fr_360px]">
      <section className="glass relative overflow-hidden rounded-3xl">
        <div className="relative flex aspect-square w-full items-center justify-center bg-background/60 md:aspect-[4/3]">
          {cameraOn ? (
            <video ref={videoRef} autoPlay playsInline muted className={`h-full w-full object-cover ${facing === "user" ? "-scale-x-100" : ""}`} />
          ) : shown ? (
            <img src={shown} alt="Your photo" className={`h-full w-full object-contain transition-[filter] duration-500 ${result && !isFinal ? "blur-2xl" : "blur-0"}`} />
          ) : (
            <div className="text-center">
              <p className="font-display text-2xl font-bold">Ready when you are</p>
              <p className="mt-1 text-sm text-muted-foreground">Open the camera or upload a photo.</p>
            </div>
          )}
          {busy && <div className="scanline pointer-events-none absolute inset-0" />}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 border-t border-border p-4">
          {cameraOn ? (
            <>
              <button className="btn-ghost" onClick={() => { const m = facing === "user" ? "environment" : "user"; setFacing(m); startCamera(m); }}>Flip</button>
              <button aria-label="Take photo" onClick={capture} className="shutter" />
              <button className="btn-ghost" onClick={stopCamera}>Close</button>
            </>
          ) : (
            <>
              <button className="btn-neon" onClick={() => startCamera()}>Open camera</button>
              <label className="btn-ghost cursor-pointer">
                Upload
                <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && setPhoto(e.target.files[0])} />
              </label>
              {result && isFinal && (
                <>
                  <button className="btn-ghost" onClick={save}>Save</button>
                  <a className="btn-ghost" href={result} download="zuit-ai.png">Download</a>
                </>
              )}
            </>
          )}
        </div>
      </section>

      <aside className="glass flex flex-col rounded-3xl p-5">
        <h2 className="font-display text-lg font-bold">Effects</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {categories.map((c) => (
            <button key={c} onClick={() => setCategory(c)} className={`chip ${category === c ? "chip-active" : ""}`}>{c}</button>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {effects.filter((e) => category === "all" || e.category === category).map((e) => (
            <button key={e.id} onClick={() => setEffectId(effectId === e.id ? null : e.id)} className={`effect-card ${effectId === e.id ? "effect-card-active" : ""}`}>
              <span className="text-2xl">{e.emoji}</span>
              <span className="text-sm font-medium">{e.name}</span>
            </button>
          ))}
        </div>
        <textarea className="field mt-4 min-h-20 resize-none" placeholder="Or describe your own change… e.g. add a cat on my shoulder" value={custom} onChange={(e) => setCustom(e.target.value)} />
        <button disabled={!source || busy} onClick={apply} className="btn-neon mt-4 w-full">
          {busy ? "Transforming…" : "Transform with AI"}
        </button>
        {!source && <p className="mt-2 text-center text-xs text-muted-foreground">Take or upload a photo first.</p>}
      </aside>
    </main>
  );
}
