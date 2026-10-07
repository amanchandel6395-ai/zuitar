import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { editImage, imageSettings } from "@/lib/image-gateway.server";

export const Route = createFileRoute("/api/edit-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Public MVP (no accounts): only admin-controlled, active rows are readable via anon RLS.
        const supabase = createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, {
          auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
        });

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return new Response("AI is not configured", { status: 500 });

        const form = await request.formData();
        const effectId = form.get("effect_id");
        const custom = form.get("custom_prompt");
        let prompt = ""; void custom; // public MVP: only DB-controlled prompts

        if (typeof effectId === "string" && effectId) {
          const { data: effect } = await supabase
            .from("effects")
            .select("prompt")
            .eq("id", effectId)
            .maybeSingle();
          if (!effect) return new Response("Effect not found", { status: 404 });
          prompt = prompt ? `${effect.prompt} Additionally: ${prompt}` : effect.prompt;
        }
        const out = new FormData();
        const characterId = form.get("character_id");
        let characterFile: File | null = null;
        if (typeof characterId === "string" && characterId) {
          const poseId = form.get("pose_id");
          if (typeof poseId !== "string" || !poseId) return new Response("Choose a selfie pose", { status: 400 });
          const { data: pose } = await supabase
            .from("ai_person_poses")
            .select("prompt")
            .eq("id", poseId)
            .eq("is_active", true)
            .maybeSingle();
          if (!pose) return new Response("Pose not found", { status: 404 });
          const { data: ch } = await supabase
            .from("ai_characters")
            .select("prompt,image_url")
            .eq("id", characterId)
            .maybeSingle();
          if (!ch) return new Response("Character not found", { status: 404 });
          const imgRes = await fetch(new URL(ch.image_url, request.url));
          if (!imgRes.ok) return new Response("Character image unavailable", { status: 502 });
          characterFile = new File([await imgRes.arrayBuffer()], "character.png", { type: "image/png" });
          const positions: Record<string, string> = {
            left: "standing to the LEFT of the person (viewer's left)",
            right: "standing to the RIGHT of the person (viewer's right)",
            behind: "standing slightly BEHIND the person, partially visible over their shoulder",
            front: "standing slightly in FRONT and to the side of the person",
          };
          const pos = positions[String(form.get("position") ?? "right")] ?? positions["right"];
          const base = `Create an obviously AI-generated commemorative photo by adding ${ch.prompt} from the second image into the first photo, ${pos}. ${pose.prompt} Make the interaction visually convincing while preserving the customer from the first photo. Match the scene's lighting, perspective, scale, color grading and add realistic shadows. Do not imply that this depicts a real event.`;
          prompt = prompt ? `${base} Additionally: ${prompt}` : base;
        }
        if (!prompt) return new Response("Choose an effect or describe a change", { status: 400 });
        if (!(form.get("image") instanceof File)) return new Response("Missing photo", { status: 400 });

        if (characterFile) {
          out.append("image[]", form.get("image") as File);
          out.append("image[]", characterFile);
        } else {
          out.set("image", form.get("image") as File);
        }
        out.set("prompt", prompt);
        const stream = form.get("stream");
        if (typeof stream === "string") out.set("stream", stream);

        const upstream = await editImage({ ...imageSettings, apiKey }, out);
        return new Response(upstream.body, {
          status: upstream.status,
          headers: {
            "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
            "Cache-Control": "no-cache",
          },
        });
      },
    },
  },
});
