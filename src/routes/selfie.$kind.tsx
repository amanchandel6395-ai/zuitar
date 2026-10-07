import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Camera, Download, FlipHorizontal2, ImageUp, RotateCcw, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { streamImage } from "@/lib/stream-image";
import { Button } from "@/components/ui/button";

const KINDS = {
  yogi: { title: "Selfie with CM Yogi Adityanath", person: "Yogi Adityanath", short: "CM" },
  modi: { title: "Selfie with PM Narendra Modi", person: "Narendra Modi", short: "PM" },
  bjp: { title: "Selfie with BJP Look", person: null, short: "" },
} as const;
type Kind = keyof typeof KINDS;

export const Route = createFileRoute("/selfie/$kind")({
  ssr: false,
  beforeLoad: ({ params }) => { if (!(params.kind in KINDS)) throw notFound(); },
  head: ({ params }) => {
    const t = KINDS[params.kind as Kind]?.title ?? "AI Selfie";
    const d = `${t}: take a photo and get an AI-generated result to download.`;
    return { meta: [
      { title: `${t} — ZUITAR` }, { name: "description", content: d },
      { property: "og:title", content: `${t} — ZUITAR` }, { property: "og:description", content: d },
      { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
    ] };
  },
  component: Selfie,
});

type Option = { id: string; name: string; emoji: string };

function sceneLabel(name: string, short: string) {
  if (name === "BJP scarf") return `${short} putting BJP scarf on me`;
  if (name === "Office") return `${short} office`;
  return `${name} with ${short}`;
}

async function stampAiLabel(src: string): Promise<string> {
  const img = new Image();
  img.src = src;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const s = Math.max(16, Math.round(c.width * 0.03));
  ctx.font = `700 ${s}px sans-serif`;
  const text = "AI GENERATED";
  const w = ctx.measureText(text).width + s;
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(c.width - w - s / 2, c.height - s * 2, w, s * 1.5);
  ctx.fillStyle = "#fff";
  ctx.fillText(text, c.width - w, c.height - s * 0.9);
  return c.toDataURL("image/png");
}

function Selfie() {
  const { kind } = Route.useParams() as { kind: Kind };
  const cfg = KINDS[kind];
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [cameraOn, setCameraOn] = useState(false);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isFinal, setIsFinal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sceneId, setSceneId] = useState<string | null>(null);
  const [placeId, setPlaceId] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["selfie-options", kind],
    queryFn: async () => {
      if (!cfg.person) {
        const { data: looks, error } = await supabase.from("effects").select("id,name,emoji").eq("is_active", true).eq("category", "bjp").order("sort_order");
        if (error) throw error;
        return { character: null, scenes: looks as Option[], places: [] as Option[] };
      }
      const [ch, poses, places] = await Promise.all([
        supabase.from("ai_characters").select("id,image_url").eq("is_active", true).eq("name", cfg.person).maybeSingle(),
        supabase.from("ai_person_poses").select("id,name,emoji").eq("is_active", true).order("sort_order"),
        supabase.from("effects").select("id,name,emoji").eq("is_active", true).eq("category", "place").order("sort_order"),
      ]);
      if (ch.error || poses.error || places.error) throw ch.error ?? poses.error ?? places.error;
      return { character: ch.data, scenes: poses.data as Option[], places: places.data as Option[] };
    },
  });
  const scenes = data?.scenes ?? [];
  useEffect(() => { if (!sceneId && scenes[0]) setSceneId(scenes[0].id); }, [scenes, sceneId]);

  const stopCamera = () => { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; setCameraOn(false); };
  const startCamera = async (mode = facing) => {
    stopCamera();
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode, width: 1280, height: 1280 } });
      streamRef.current = s;
      setCameraOn(true);
    } catch { toast.error("Camera unavailable. Allow camera access or upload a photo."); }
  };
  useEffect(() => { startCamera(); return stopCamera; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (cameraOn && videoRef.current) videoRef.current.srcObject = streamRef.current; }, [cameraOn]);
  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl); }, [photoUrl]);

  const generate = async (blob: Blob) => {
    if (!sceneId) { toast.error("Choose an option first"); return; }
    setBusy(true); setResult(null); setIsFinal(false);
    try {
      const form = new FormData();
      form.append("image", new File([blob], "photo.png", { type: blob.type || "image/png" }));
      if (data?.character) {
        form.append("character_id", data.character.id);
        form.append("pose_id", sceneId);
        form.append("position", "right");
        if (placeId) form.append("effect_id", placeId);
      } else {
        form.append("effect_id", sceneId);
      }
      await streamImage("/api/edit-image", form, (src, final) => { setResult(src); setIsFinal(final); });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      toast.error(msg.includes("402") ? "AI credits are used up." : msg.includes("429") ? "Busy — try again in a moment." : msg.includes("not configured") ? "AI is not connected." : "AI generation failed. Please try again.");
      setResult(null);
    } finally { setBusy(false); }
  };

  const usePhoto = (blob: Blob) => {
    setPhoto(blob);
    setPhotoUrl(URL.createObjectURL(blob));
    stopCamera();
    void generate(blob);
  };

  const capture = async () => {
    const v = videoRef.current;
    if (!v?.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth; c.height = v.videoHeight;
    const ctx = c.getContext("2d")!;
    if (facing === "user") { ctx.translate(c.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(v, 0, 0);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/png"));
    if (blob) usePhoto(blob);
  };

  const download = async () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = await stampAiLabel(result);
    a.download = `zuitar-${kind}.png`;
    a.click();
  };

  const retake = () => { setPhoto(null); setPhotoUrl(null); setResult(null); setIsFinal(false); startCamera(); };
  const shown = result ?? photoUrl;

  return (
    <div className="neon-bg flex min-h-[100dvh] flex-col">
      <header className="flex items-center gap-3 px-4 py-3">
        <Button asChild variant="ghost" size="icon" aria-label="Back"><Link to="/"><ArrowLeft /></Link></Button>
        <h1 className="font-display text-sm font-bold uppercase md:text-base">{cfg.title}</h1>
      </header>

      <div className="relative mx-auto w-full max-w-xl flex-1 overflow-hidden bg-background/60 md:rounded-3xl">
        {cameraOn ? (
          <video ref={videoRef} autoPlay playsInline muted className={`h-full max-h-[70dvh] w-full object-cover ${facing === "user" ? "-scale-x-100" : ""}`} />
        ) : shown ? (
          <img src={shown} alt="Your selfie" className={`h-full max-h-[70dvh] w-full object-contain transition-[filter] duration-500 ${result && !isFinal ? "blur-2xl" : ""}`} />
        ) : (
          <div className="flex h-[60dvh] items-center justify-center text-muted-foreground">Starting camera…</div>
        )}
        {cameraOn && data?.character && (
          <img src={data.character.image_url} alt={cfg.person ?? ""} className="pointer-events-none absolute bottom-0 right-0 h-[85%] object-contain opacity-90" />
        )}
        {result && isFinal && (
          <span className="absolute bottom-3 right-3 rounded-md bg-background/80 px-3 py-1 text-xs font-bold tracking-widest">AI GENERATED</span>
        )}
        {busy && (
          <>
            <div className="scanline pointer-events-none absolute inset-0" />
            <span className="absolute left-3 top-3 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">Generating with AI…</span>
          </>
        )}
      </div>

      <div className="mx-auto w-full max-w-xl px-3 pb-6">
        {!photo && (
          <>
            <div className="flex gap-2 overflow-x-auto py-3">
              {scenes.map((s) => (
                <button key={s.id} onClick={() => setSceneId(s.id)} className={`effect-card w-24 shrink-0 ${sceneId === s.id ? "effect-card-active" : ""}`}>
                  <span className="text-2xl">{s.emoji}</span>
                  <span className="text-[11px] font-medium capitalize leading-tight">{cfg.person ? sceneLabel(s.name, cfg.short) : s.name}</span>
                </button>
              ))}
            </div>
            {(data?.places.length ?? 0) > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-3">
                <button onClick={() => setPlaceId(null)} className={`chip shrink-0 ${placeId === null ? "chip-active" : ""}`}>Scene default</button>
                {data!.places.map((p) => (
                  <button key={p.id} onClick={() => setPlaceId(p.id)} className={`chip shrink-0 ${placeId === p.id ? "chip-active" : ""}`}>{p.emoji} {p.name}</button>
                ))}
              </div>
            )}
            <div className="flex items-center justify-center gap-6">
              <label className="btn-ghost cursor-pointer" aria-label="Upload photo">
                <ImageUp className="h-5 w-5" />
                <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && usePhoto(e.target.files[0])} />
              </label>
              <Button disabled={!cameraOn || !sceneId} aria-label="Take selfie" onClick={capture} className="shutter h-18 w-18"><Camera /></Button>
              <Button variant="outline" size="icon" aria-label="Flip camera" onClick={() => { const m = facing === "user" ? "environment" : "user"; setFacing(m); startCamera(m); }}><FlipHorizontal2 /></Button>
            </div>
          </>
        )}
        {photo && (
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <Button variant="outline" onClick={retake} disabled={busy}><RotateCcw />Retake</Button>
            {result && isFinal && <Button className="btn-neon h-auto" onClick={download}><Download />Download</Button>}
            {cfg.person && <Button variant="secondary" disabled title="AI video is not connected yet"><Video />Video — coming soon</Button>}
          </div>
        )}
      </div>
    </div>
  );
}
