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
type Character = { id: string; name: string; description: string | null; image_url: string; consent_type: string };
const POSITIONS = [
  { id: "left", label: "Left" },
  { id: "right", label: "Right" },
  { id: "behind", label: "Behind" },
  { id: "front", label: "Front-side" },
] as const;

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
  const [mode, setMode] = useState<"effects" | "person">("effects");
  const [characterId, setCharacterId] = useState<string | null>(null);
  const [position, setPosition] = useState<string>("right");
  const [scale, setScale] = useState(85);

  const { data: characters = [] } = useQuery({
    queryKey: ["ai_characters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_characters")
        .select("id,name,description,image_url,consent_type")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as Character[];
    },
  });
  const character = mode === "person" ? characters.find((c) => c.id === characterId) : undefined;

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
    const useEffectId = mode === "effects" ? effectId : null;
    if (mode === "person" && !character) { toast.error("Pick an AI person first"); return; }
    if (!useEffectId && !character && !custom.trim()) { toast.error("Pick an effect or describe a change"); return; }
    setBusy(true);
    setResult(null);
    setIsFinal(false);
    try {
      const { data } = await supabase.auth.getSession();
      const form = new FormData();
      form.append("image", new File([source], "photo.png", { type: source.type || "image/png" }));
      if (useEffectId) form.append("effect_id", useEffectId);
      if (character) {
        form.append("character_id", character.id);
        form.append("position", position);
      }
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
    const effect = mode === "effects" ? effects.find((e) => e.id === effectId) : undefined;
    const label = character ? `With ${character.name}` : effect?.name ?? "Custom";
    await supabase.from("creations").insert({ user_id: u.user.id, image_path: path, effect_name: label, prompt: custom || null });
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
          {character && !result && (cameraOn || sourceUrl) && (
            <img
              src={character.image_url}
              alt={`${character.name} preview`}
              className="pointer-events-none absolute bottom-0 drop-shadow-2xl transition-all duration-300"
              style={{
                height: `${position === "behind" ? scale * 0.8 : scale}%`,
                opacity: position === "behind" ? 0.75 : 0.95,
                ...(position === "left" ? { left: "4%" } : position === "behind" ? { left: "50%", transform: "translateX(-10%)", zIndex: 0 } : position === "front" ? { right: "18%" } : { right: "4%" }),
              }}
            />
          )}
          {(cameraOn || sourceUrl) && (character || result) && (
            <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${result && isFinal ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"}`}>
              {result && isFinal ? "AI generated final photo" : result ? "Generating…" : "Live AR preview"}
            </span>
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
        <div className="grid grid-cols-2 gap-1 rounded-full bg-secondary p-1">
          <button onClick={() => setMode("effects")} className={`rounded-full py-2 text-sm font-semibold ${mode === "effects" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Effects</button>
          <button onClick={() => setMode("person")} className={`rounded-full py-2 text-sm font-semibold ${mode === "person" ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}>AI Person</button>
        </div>
        {mode === "person" ? (
          <>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {characters.map((c) => (
                <button key={c.id} onClick={() => setCharacterId(characterId === c.id ? null : c.id)} className={`effect-card items-center ${characterId === c.id ? "effect-card-active" : ""}`}>
                  <img src={c.image_url} alt={c.name} loading="lazy" className="h-20 w-full object-contain" />
                  <span className="text-xs font-medium">{c.name}</span>
                </button>
              ))}
            </div>
            {character && <p className="mt-2 text-xs text-muted-foreground">{character.description} · <span className="capitalize">{character.consent_type}</span> character</p>}
            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Position</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {POSITIONS.map((p) => (
                <button key={p.id} onClick={() => setPosition(p.id)} className={`chip ${position === p.id ? "chip-active" : ""}`}>{p.label}</button>
              ))}
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preview size</p>
            <input type="range" min={40} max={100} value={scale} onChange={(e) => setScale(Number(e.target.value))} className="mt-2 w-full accent-[var(--accent)]" />
            <p className="mt-3 text-xs text-muted-foreground">The live preview is a guide. The final photo is generated by AI after you capture.</p>
          </>
        ) : (
        <>
        <div className="mt-4 flex flex-wrap gap-2">
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
        </>
        )}
        <textarea className="field mt-4 min-h-20 resize-none" placeholder="Or describe your own change… e.g. add a cat on my shoulder" value={custom} onChange={(e) => setCustom(e.target.value)} />
        <button disabled={!source || busy} onClick={apply} className="btn-neon mt-4 w-full">
          {busy ? "Transforming…" : "Transform with AI"}
        </button>
        {!source && <p className="mt-2 text-center text-xs text-muted-foreground">Take or upload a photo first.</p>}
      </aside>
    </main>
  );
}
