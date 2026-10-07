import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { streamImage } from "@/lib/stream-image";
import { Button } from "@/components/ui/button";
import { Camera, FlipHorizontal2, RotateCcw, X } from "lucide-react";
import { LivePersonOverlay, type OverlayPlacement } from "@/components/LivePersonOverlay";

export const Route = createFileRoute("/_authenticated/studio")({
  head: () => ({
    meta: [
      { title: "Studio — ZUIT AI" },
      { name: "description", content: "Capture or upload a photo and transform it with AI effects." },
      { property: "og:title", content: "Studio — ZUIT AI" },
      { property: "og:description", content: "Capture or upload a photo and transform it with AI effects." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Studio,
});

type Effect = { id: string; name: string; category: string; emoji: string };
type Character = { id: string; name: string; description: string | null; image_url: string; consent_type: string };
type PersonPose = { id: string; name: string; emoji: string };
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
  const frameRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLImageElement>(null);
  const cameraRequest = useRef(0);
  const photoUrlRef = useRef<string | null>(null);
  const compositeUrlRef = useRef<string | null>(null);
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
  const [poseId, setPoseId] = useState<string | null>(null);
  const [personStyleId, setPersonStyleId] = useState<string | null>(null);
  const [position, setPosition] = useState<string>("right");
  const [scale, setScale] = useState(85);
  const [placement, setPlacement] = useState<OverlayPlacement>({ x: 0.73, y: 0.575, rotation: 0, flipped: false });
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);

  const moveOverlay = (x: number, y: number) => {
    setPlacement((p) => ({ ...p, x, y }));
    setPosition(x < 0.5 ? "left" : "right");
  };
  const selectCharacter = (id: string) => {
    setMode("person");
    setCharacterId(id);
    setSnapshot(null);
    if (!poseId && poses[0]) setPoseId(poses[0].id);
  };

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

  const { data: poses = [] } = useQuery({
    queryKey: ["ai_person_poses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_person_poses")
        .select("id,name,emoji")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as PersonPose[];
    },
  });
  const selectedPose = poses.find((pose) => pose.id === poseId);

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
    cameraRequest.current += 1;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
    setCameraReady(false);
    setCameraStarting(false);
  };

  const startCamera = async (mode = facing) => {
    stopCamera();
    const request = cameraRequest.current;
    setCameraStarting(true);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode, width: 1280, height: 1280 } });
      if (request !== cameraRequest.current) { s.getTracks().forEach((track) => track.stop()); return; }
      streamRef.current = s;
      setResult(null);
      setSnapshot(null);
      setCameraOn(true);
    } catch {
      if (request === cameraRequest.current) toast.error("Camera unavailable. Allow camera access or upload a photo.");
    } finally {
      if (request === cameraRequest.current) setCameraStarting(false);
    }
  };

  useEffect(() => {
    if (cameraOn && videoRef.current) videoRef.current.srcObject = streamRef.current;
  }, [cameraOn, facing]);
  useEffect(() => () => {
    cameraRequest.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    if (compositeUrlRef.current) URL.revokeObjectURL(compositeUrlRef.current);
  }, []);

  const setPhoto = (blob: Blob) => {
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    if (compositeUrlRef.current) URL.revokeObjectURL(compositeUrlRef.current);
    compositeUrlRef.current = null;
    setSnapshot(null);
    setSource(blob);
    photoUrlRef.current = URL.createObjectURL(blob);
    setSourceUrl(photoUrlRef.current);
    setResult(null);
    setIsFinal(false);
  };

  const capture = async () => {
    const v = videoRef.current;
    const frame = frameRef.current;
    if (!v || !frame || !v.videoWidth || !cameraReady) return;
    const c = document.createElement("canvas");
    const bounds = frame.getBoundingClientRect();
    c.width = v.videoWidth;
    c.height = Math.round(c.width * bounds.height / bounds.width);
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const factor = Math.max(c.width / v.videoWidth, c.height / v.videoHeight);
    const width = v.videoWidth * factor;
    const height = v.videoHeight * factor;
    ctx.save();
    if (facing === "user") {
      ctx.translate(c.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(v, (c.width - width) / 2, (c.height - height) / 2, width, height);
    ctx.restore();
    const original = await new Promise<Blob | null>((resolve) => c.toBlob(resolve, "image/png"));
    if (!original) return;
    setPhoto(original);
    const overlay = overlayRef.current;
    if (character && overlay?.complete && overlay.naturalWidth) {
      try {
        const h = c.height * scale / 100;
        const w = h * overlay.naturalWidth / overlay.naturalHeight;
        ctx.save();
        ctx.translate(placement.x * c.width, placement.y * c.height);
        ctx.rotate(placement.rotation * Math.PI / 180);
        ctx.scale(placement.flipped ? -1 : 1, 1);
        ctx.drawImage(overlay, -w / 2, -h / 2, w, h);
        ctx.restore();
        const composite = await new Promise<Blob | null>((resolve) => c.toBlob(resolve, "image/png"));
        if (composite) {
          compositeUrlRef.current = URL.createObjectURL(composite);
          setSnapshot(compositeUrlRef.current);
        }
      } catch { toast.error("Live photo could not be captured. Your original photo is still ready for AI editing."); }
    }
    stopCamera();
  };

  const apply = async () => {
    if (!source) return;
    const useEffectId = mode === "effects" ? effectId : personStyleId;
    if (mode === "person" && !character) { toast.error("Pick an AI person first"); return; }
    if (mode === "person" && !selectedPose) { toast.error("Pick a selfie pose"); return; }
    if (!useEffectId && !character && !custom.trim()) { toast.error("Pick an effect or describe a change"); return; }
    setBusy(true);
    setSnapshot(null);
    setResult(null);
    setIsFinal(false);
    try {
      const { data } = await supabase.auth.getSession();
      const form = new FormData();
      form.append("image", new File([source], "photo.png", { type: source.type || "image/png" }));
      if (useEffectId) form.append("effect_id", useEffectId);
      if (character) {
        form.append("character_id", character.id);
        if (selectedPose) form.append("pose_id", selectedPose.id);
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
    const effect = effects.find((e) => e.id === (mode === "effects" ? effectId : personStyleId));
    const label = character ? `With ${character.name} · ${selectedPose?.name ?? "AI selfie"}${effect ? ` · ${effect.name}` : ""}` : effect?.name ?? "Custom";
    await supabase.from("creations").insert({ user_id: u.user.id, image_path: path, effect_name: label, prompt: custom || null });
    qc.invalidateQueries({ queryKey: ["creations"] });
    toast.success("Saved to your gallery");
  };

  const shown = result ?? snapshot ?? sourceUrl;

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[1fr_360px]">
      <section className="glass relative overflow-hidden rounded-3xl">
        <div ref={frameRef} className="relative flex aspect-square w-full items-center justify-center overflow-hidden bg-background/60 md:aspect-[4/3]">
          {cameraOn ? (
            <video ref={videoRef} onLoadedData={() => setCameraReady(true)} autoPlay playsInline muted className={`h-full w-full object-cover ${facing === "user" ? "-scale-x-100" : ""}`} />
          ) : shown ? (
            <img src={shown} alt="Your photo" className={`h-full w-full object-contain transition-[filter] duration-500 ${result && !isFinal ? "blur-2xl" : "blur-0"}`} />
          ) : (
            <div className="text-center">
              <p className="font-display text-2xl font-bold">Ready when you are</p>
              <p className="mt-1 text-sm text-muted-foreground">Open the camera or upload a photo.</p>
            </div>
          )}
          {character && !result && !snapshot && (cameraOn || sourceUrl) && (
            <LivePersonOverlay imageRef={overlayRef} src={character.image_url} name={character.name} scale={scale} placement={placement} onMove={moveOverlay} />
          )}
          {(cameraOn || sourceUrl) && (character || result) && (
            <span className={`pointer-events-none absolute left-3 top-3 z-20 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${result && isFinal ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"}`}>
              {result && isFinal ? "AI generated final photo" : result ? "Generating…" : snapshot ? "Live overlay photo" : cameraOn ? "Live camera · 2D overlay" : "Photo · 2D overlay"}
            </span>
          )}
          {busy && <div className="scanline pointer-events-none absolute inset-0" />}
        </div>
        {cameraOn && (
          <div className="flex gap-3 overflow-x-auto border-t border-border p-3" aria-label="Live camera people">
            <Button variant="outline" onClick={() => { setCharacterId(null); setMode("person"); }}>No person</Button>
            {characters.map((c) => <Button key={c.id} variant={characterId === c.id && mode === "person" ? "default" : "secondary"} className="h-auto shrink-0 gap-2 py-2" onClick={() => selectCharacter(c.id)} aria-pressed={characterId === c.id && mode === "person"}><img src={c.image_url} alt="" className="h-12 w-9 object-contain" />{c.name}</Button>)}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-center gap-3 border-t border-border p-4">
          {cameraOn ? (
            <>
              <Button variant="outline" size="icon" aria-label="Flip camera" title="Flip camera" onClick={() => { const m = facing === "user" ? "environment" : "user"; setFacing(m); startCamera(m); }}><FlipHorizontal2 /></Button>
              <Button disabled={!cameraReady} aria-label="Take photo" onClick={capture} className="shutter h-18 w-18"><Camera /></Button>
              <Button variant="outline" size="icon" aria-label="Close camera" title="Close camera" onClick={stopCamera}><X /></Button>
            </>
          ) : (
            <>
              <Button className="btn-neon h-auto" disabled={cameraStarting || busy} onClick={() => startCamera()}><Camera />{cameraStarting ? "Opening…" : "Open camera"}</Button>
              <label className="btn-ghost cursor-pointer">
                Upload
                <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && setPhoto(e.target.files[0])} />
              </label>
              {snapshot && <Button asChild variant="outline"><a href={snapshot} download="zuit-live-selfie.png">Download live photo</a></Button>}
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
                <Button key={c.id} variant="secondary" onClick={() => selectCharacter(c.id)} className={`effect-card h-auto whitespace-normal items-center ${characterId === c.id ? "effect-card-active" : ""}`}>
                  <img src={c.image_url} alt={c.name} loading="lazy" className="h-20 w-full object-contain" />
                  <span className="text-xs font-medium">{c.name}</span>
                </Button>
              ))}
            </div>
            {character && <p className="mt-2 text-xs text-muted-foreground">{character.description} · <span className="capitalize">{character.consent_type.replaceAll("_", " ")}</span></p>}
            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Selfie pose</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {poses.map((pose) => (
                <button key={pose.id} onClick={() => setPoseId(pose.id)} className={`effect-card ${poseId === pose.id ? "effect-card-active" : ""}`}>
                  <span className="text-xl">{pose.emoji}</span>
                  <span className="text-xs font-medium">{pose.name}</span>
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Position</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {POSITIONS.map((p) => (
                <Button variant="ghost" size="sm" key={p.id} onClick={() => { setPosition(p.id); setSnapshot(null); setPlacement((v) => ({ ...v, x: p.id === "left" ? 0.27 : p.id === "behind" ? 0.55 : p.id === "front" ? 0.6 : 0.73 })); }} className={`chip ${position === p.id ? "chip-active" : ""}`}>{p.label}</Button>
              ))}
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preview size</p>
            <input aria-label="Person size" type="range" min={25} max={100} value={scale} onChange={(e) => { const next = Number(e.target.value); setScale(next); setSnapshot(null); setPlacement((p) => ({ ...p, y: 1 - next / 200 })); }} className="mt-2 w-full accent-[var(--accent)]" />
            <label className="mt-3 text-xs font-semibold uppercase text-muted-foreground" htmlFor="person-rotation">Rotation</label>
            <input id="person-rotation" type="range" min={-45} max={45} value={placement.rotation} onChange={(e) => { setSnapshot(null); setPlacement((p) => ({ ...p, rotation: Number(e.target.value) })); }} className="mt-2 w-full accent-[var(--accent)]" />
            <div className="mt-3 flex gap-2">
              <Button variant="outline" size="icon" title="Mirror person" aria-label="Mirror person" onClick={() => { setSnapshot(null); setPlacement((p) => ({ ...p, flipped: !p.flipped })); }}><FlipHorizontal2 /></Button>
              <Button variant="outline" size="icon" title="Reset placement" aria-label="Reset placement" onClick={() => { setSnapshot(null); setScale(85); setPosition("right"); setPlacement({ x: 0.73, y: 0.575, rotation: 0, flipped: false }); }}><RotateCcw /></Button>
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Photo style</p>
            <select className="field mt-2" value={personStyleId ?? ""} onChange={(e) => setPersonStyleId(e.target.value || null)}>
              <option value="">Natural photo</option>
              {effects.map((effect) => <option key={effect.id} value={effect.id}>{effect.emoji} {effect.name}</option>)}
            </select>
            <p className="mt-3 text-xs text-muted-foreground">Live view uses a 2D cutout. Handshakes, shoulder poses and photo styles are AI-generated after capture.</p>
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
          {busy ? "Transforming…" : mode === "person" ? "Generate final photo" : "Transform with AI"}
        </button>
        {!source && <p className="mt-2 text-center text-xs text-muted-foreground">Take or upload a photo first.</p>}
      </aside>
    </main>
  );
}
