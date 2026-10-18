import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { useLang } from "@/lib/i18n";

type CharacterChoice = "yogi" | "modi" | "both";

export function RoomARView({
  initialCharacter = "yogi",
  yogiAsset = "/assets/yogi.png",
  modiAsset = "/assets/modi.png",
  onCapture,
  onExit,
  onHome,
}: {
  initialCharacter?: CharacterChoice;
  yogiAsset?: string;
  modiAsset?: string;
  onCapture: (photo: Blob) => void;
  onExit: () => void;
  onHome: () => void;
}) {
  const [lang, , t] = useLang();
  const isHindi = lang === "hi";

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [character, setCharacter] = useState<CharacterChoice>(initialCharacter);
  const [capturing, setCapturing] = useState(false);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [streamReady, setStreamReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Position offset (in 3D world units: x, y, z)
  const posOffset = useRef({ x: 0, y: -0.6, z: -2.2 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const standeeGroupRef = useRef<THREE.Group | null>(null);
  const videoTexRef = useRef<THREE.VideoTexture | null>(null);

  // Start Camera
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    let stopped = false;
    setStreamReady(false);
    setError(null);

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facing,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        activeStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setStreamReady(true);
        }
      } catch (err) {
        console.warn("Camera failed:", err);
        setError(isHindi ? "कैमरा शुरू नहीं हो सका।" : "Unable to access camera.");
      }
    };

    void startCamera();

    return () => {
      stopped = true;
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [facing, isHindi]);

  // Create Standee Mesh Helper
  const createStandeeMesh = useCallback(
    (textureUrl: string, width = 1.1, height = 1.75) => {
      const group = new THREE.Group();

      // Floor Shadow
      const shadowCanvas = document.createElement("canvas");
      shadowCanvas.width = 128;
      shadowCanvas.height = 64;
      const sctx = shadowCanvas.getContext("2d")!;
      const grad = sctx.createRadialGradient(64, 32, 4, 64, 32, 58);
      grad.addColorStop(0, "rgba(0, 0, 0, 0.65)");
      grad.addColorStop(0.5, "rgba(0, 0, 0, 0.25)");
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      sctx.fillStyle = grad;
      sctx.fillRect(0, 0, 128, 64);
      const shadowTex = new THREE.CanvasTexture(shadowCanvas);
      const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(width * 1.15, 0.6),
        new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }),
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = -height / 2 + 0.01;
      group.add(shadow);

      // Leader Figure Standee
      const tex = new THREE.TextureLoader().load(textureUrl);
      tex.colorSpace = THREE.SRGBColorSpace;
      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(width, height),
        new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          side: THREE.DoubleSide,
          alphaTest: 0.02,
        }),
      );
      group.add(plane);

      return group;
    },
    [],
  );

  // Initialize Three.js Scene
  useEffect(() => {
    if (!canvasRef.current || !videoRef.current || !streamReady) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      preserveDrawingBuffer: true,
      alpha: true,
    });
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.autoClear = false;
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 100);
    camera.position.set(0, 0, 0);
    cameraRef.current = camera;

    // Background camera feed
    const vTex = new THREE.VideoTexture(video);
    vTex.colorSpace = THREE.SRGBColorSpace;
    videoTexRef.current = vTex;

    const bgScene = new THREE.Scene();
    const bgCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const bgMat = new THREE.MeshBasicMaterial({ map: vTex, depthTest: false, depthWrite: false });
    const bgQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat);
    bgScene.add(bgQuad);

    // Standee Group in 3D Space
    const standeeGroup = new THREE.Group();
    scene.add(standeeGroup);
    standeeGroupRef.current = standeeGroup;

    // Build Character Content
    const rebuildStandee = () => {
      standeeGroup.clear();
      if (character === "yogi") {
        const yogiMesh = createStandeeMesh(yogiAsset, 0.85, 1.75);
        standeeGroup.add(yogiMesh);
      } else if (character === "modi") {
        const modiMesh = createStandeeMesh(modiAsset, 0.72, 0.96);
        modiMesh.position.y = 0.40;
        standeeGroup.add(modiMesh);
      } else {
        // Both Leaders: CM Yogi on left, PM Modi on right
        const yogiMesh = createStandeeMesh(yogiAsset, 0.85, 1.75);
        yogiMesh.position.x = -0.65;
        const modiMesh = createStandeeMesh(modiAsset, 0.72, 0.96);
        modiMesh.position.x = 0.65;
        modiMesh.position.y = 0.40;
        standeeGroup.add(yogiMesh, modiMesh);
      }
    };

    rebuildStandee();

    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (standeeGroupRef.current) {
        standeeGroupRef.current.position.set(
          posOffset.current.x,
          posOffset.current.y,
          posOffset.current.z,
        );
        standeeGroupRef.current.scale.setScalar(scale);
        standeeGroupRef.current.rotation.y = THREE.MathUtils.degToRad(rotation);
      }

      renderer.clear();
      renderer.render(bgScene, bgCamera);
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!canvas || !renderer || !camera) return;
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      vTex.dispose();
      bgMat.dispose();
      bgQuad.geometry.dispose();
    };
  }, [streamReady, character, scale, rotation, yogiAsset, modiAsset, createStandeeMesh]);

  // Touch & Drag Handling to reposition character in room
  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = (e.clientX - dragStart.current.x) * 0.003;
    const dy = (e.clientY - dragStart.current.y) * 0.003;
    dragStart.current = { x: e.clientX, y: e.clientY };

    posOffset.current.x += facing === "user" ? -dx : dx;
    posOffset.current.y -= dy;
    posOffset.current.y = THREE.MathUtils.clamp(posOffset.current.y, -1.8, 0.8);
    posOffset.current.x = THREE.MathUtils.clamp(posOffset.current.x, -2.5, 2.5);
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  // Capture Shutter
  const handleCapture = async () => {
    if (!canvasRef.current || capturing) return;
    setCapturing(true);
    try {
      const canvas = canvasRef.current;
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.95),
      );
      if (blob) {
        onCapture(blob);
      }
    } catch (e) {
      console.warn("Capture error:", e);
    } finally {
      setCapturing(false);
    }
  };

  const flipCamera = () => {
    setFacing((prev) => (prev === "environment" ? "user" : "environment"));
  };

  return (
    <div
      className="relative min-h-dvh w-full overflow-hidden bg-black select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <video ref={videoRef} className="hidden" playsInline muted autoPlay />
      <canvas
        ref={canvasRef}
        className={`h-full w-full object-cover transition-transform duration-200 ${
          facing === "user" ? "-scale-x-100" : ""
        }`}
      />

      {/* Top Navigation & Character Switcher Toolbar */}
      <div className="absolute inset-x-0 top-0 z-20 flex flex-col gap-2 bg-gradient-to-b from-black/80 via-black/40 to-transparent p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onExit}
            className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md transition-all hover:bg-black/80 active:scale-95"
          >
            ← {isHindi ? "कैमरा मोड" : "Back to Selfie"}
          </button>

          {/* Room AR Badge */}
          <div className="flex items-center gap-1.5 rounded-full border border-amber-500/50 bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-300 backdrop-blur-md">
            <span>🏛️</span>
            <span>{isHindi ? "3D रूम एआर" : "3D Room AR"}</span>
          </div>

          <button
            type="button"
            onClick={onHome}
            className="rounded-full border border-white/20 bg-black/60 p-2 text-sm text-white backdrop-blur-md transition-all hover:bg-black/80 active:scale-95"
            title="Home"
          >
            🏠
          </button>
        </div>

        {/* Character Selector Pills (Yogi / Modi / Both) */}
        <div className="mx-auto flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-black/60 p-1 backdrop-blur-lg">
          <button
            type="button"
            onClick={() => setCharacter("yogi")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              character === "yogi"
                ? "bg-gradient-to-r from-orange-500 to-amber-500 text-black shadow-lg"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <span>🧘</span>
            <span>{isHindi ? "सीएम योगी जी" : "CM Yogi Ji"}</span>
          </button>
          <button
            type="button"
            onClick={() => setCharacter("modi")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              character === "modi"
                ? "bg-gradient-to-r from-orange-500 to-amber-500 text-black shadow-lg"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <span>🇮🇳</span>
            <span>{isHindi ? "मोदी जी" : "PM Modi"}</span>
          </button>
          <button
            type="button"
            onClick={() => setCharacter("both")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              character === "both"
                ? "bg-gradient-to-r from-orange-500 to-amber-500 text-black shadow-lg"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <span>🤝</span>
            <span>{isHindi ? "दोनों नेता" : "Both"}</span>
          </button>
        </div>
      </div>

      {/* Floating Instructions */}
      <div className="pointer-events-none absolute inset-x-0 top-32 z-10 flex justify-center">
        <span className="rounded-full border border-white/10 bg-black/50 px-3.5 py-1 text-[11px] font-medium text-slate-300 backdrop-blur-md">
          {isHindi
            ? "👆 रूम में कहीं भी ड्रैग करके खड़ा करें"
            : "👆 Drag on screen to place leader in your room"}
        </span>
      </div>

      {error && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 p-6 text-center text-white">
          <div className="max-w-sm rounded-2xl border border-red-500/40 bg-red-950/60 p-6 backdrop-blur-md">
            <p className="mb-4 text-base font-semibold">{error}</p>
            <button
              onClick={onExit}
              className="rounded-xl bg-white px-5 py-2 text-sm font-bold text-black"
            >
              {isHindi ? "वापस जाएँ" : "Go Back"}
            </button>
          </div>
        </div>
      )}

      {/* Bottom Shutter & Controls Dock */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col gap-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {/* Scale & Rotate Quick Adjustments */}
        <div className="mx-auto flex items-center gap-4 rounded-xl border border-white/10 bg-black/60 px-4 py-1.5 text-xs text-slate-300 backdrop-blur-md">
          <span>{isHindi ? "आकार (Size):" : "Size:"}</span>
          <input
            type="range"
            min="0.6"
            max="1.6"
            step="0.05"
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            className="h-1.5 w-24 accent-amber-500"
          />
          <button
            type="button"
            onClick={() => setRotation((r) => (r + 45) % 360)}
            className="flex items-center gap-1 rounded border border-white/20 px-2 py-0.5 hover:bg-white/10"
          >
            <span>🔄</span>
            <span>{rotation}°</span>
          </button>
        </div>

        {/* Bottom Shutter Dock */}
        <div className="grid grid-cols-3 items-center pt-2">
          {/* Photo Upload Option */}
          <div className="flex justify-start">
            <label
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/60 text-lg text-white backdrop-blur-md transition-all hover:bg-white/20 active:scale-95 cursor-pointer shadow-lg"
              title={isHindi ? "फ़ोटो चुनें" : "Upload photo"}
            >
              <span>📁</span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const file = e.currentTarget.files?.[0];
                  if (file) {
                    onCapture(file);
                  }
                  e.currentTarget.value = "";
                }}
              />
            </label>
          </div>

          {/* Shutter Button (Click Photo) */}
          <div className="flex justify-center">
            <button
              type="button"
              disabled={capturing || !streamReady}
              onClick={handleCapture}
              aria-label={t.capture}
              className="relative flex h-20 w-20 items-center justify-center rounded-full border-[5px] border-white bg-gradient-to-tr from-amber-500 to-orange-500 shadow-2xl transition-all hover:scale-105 active:scale-90 disabled:opacity-40"
            >
              <div className="h-14 w-14 rounded-full border-2 border-black/30 bg-white shadow-inner" />
            </button>
          </div>

          {/* Flip Camera (Front / Back) */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={flipCamera}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/60 text-xl text-white backdrop-blur-md transition-all hover:bg-white/20 active:scale-95 shadow-lg"
              title={isHindi ? "कैमरा बदलें" : "Flip camera"}
            >
              <span>⟲</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
