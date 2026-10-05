import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { editImage, imageSettings } from "@/lib/image-gateway.server";

export const Route = createFileRoute("/api/edit-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token) return new Response("Please sign in", { status: 401 });

        const supabase = createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
        });
        const { data: userData, error: userError } = await supabase.auth.getUser(token);
        if (userError || !userData.user) return new Response("Please sign in", { status: 401 });

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return new Response("AI is not configured", { status: 500 });

        const form = await request.formData();
        const effectId = form.get("effect_id");
        const custom = form.get("custom_prompt");
        let prompt = typeof custom === "string" ? custom.trim() : "";

        if (typeof effectId === "string" && effectId) {
          const { data: effect } = await supabase
            .from("effects")
            .select("prompt")
            .eq("id", effectId)
            .maybeSingle();
          if (!effect) return new Response("Effect not found", { status: 404 });
          prompt = prompt ? `${effect.prompt} Additionally: ${prompt}` : effect.prompt;
        }
        if (!prompt) return new Response("Choose an effect or describe a change", { status: 400 });
        if (!(form.get("image") instanceof File)) return new Response("Missing photo", { status: 400 });

        const out = new FormData();
        out.set("image", form.get("image") as File);
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
