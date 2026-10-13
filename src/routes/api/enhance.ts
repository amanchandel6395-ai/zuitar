import { createFileRoute } from "@tanstack/react-router";
import { INTERACTIONS, type AppConfig } from "@/lib/config";

const LOVABLE_GATEWAY = "https://ai.gateway.lovable.dev";
const LOVABLE_MODEL = "openai/gpt-image-2.5-sunburst";
export const SCENES: string[] = ["yogi", "modi", "bjp", "photo", "demo"];

const ADAPTIVE_FIT_DIRECTIVE =
  " Important: The reference designs define only the visual style and fabric pattern. Dynamically adapt the drape, contours, fabric folds, shadows, and perspective of the ceremonial stole, cap, and interaction to naturally match the customer's specific body pose, shoulder slope, head tilt, position, and camera perspective in their photo. The attire and interaction must appear naturally fitted to the customer in their real pose, not a static cutout or rigid copy.";

export function getEnhancePrompt(scene: string, interaction: string, cfg: AppConfig): string {
  if (scene === "demo") {
    return "Create a clearly AI-generated development test selfie from this customer-provided photo. Preserve the customer's identity, face, expression, pose, skin tone and clothing. Add exactly one fictional adult person with an original, ordinary appearance, standing beside the customer as if posing for a casual selfie. This fictional person must not resemble any real person, public figure, politician, celebrity, or recognizable character. Do not add political content, logos, flags, slogans, or text. Keep the customer recognizable and the result respectful.";
  }

  if (scene === "photo") {
    return "Make a subtle, faithful enhancement of this single customer photo. Improve exposure, white balance, contrast and detail. Preserve the person's exact identity, face shape, expression, pose, skin tone, clothing and all existing objects, symbols and text. Do not add or remove people or objects. Do not add political content, logos, flags or text. Do not reshape or beautify the face. Keep the result realistic and faithful to the original.";
  }

  const bjpScarfDesc =
    "an authentic ceremonial saffron stole (Bhagwa Patka / Angavastram) inspired by the reference design: radiant pure saffron-orange silk with clean deep-green borders along both vertical sides and the official lotus flower emblem printed clearly on both lower hanging ends. The stole must drape naturally over the customer's shoulders conforming realistically to their specific shoulder slope, body posture, and clothing folds. This is STRICTLY a ceremonial silk stole / patka, NOT a woolen winter scarf, NOT wrapped around the neck, and NOT a rigid flat overlay.";

  const bjpCapDesc =
    "a traditional Indian saffron folded campaign cap (Bhagwa Topi / side-cap) naturally fitted on the customer's head matching their head angle with the lotus insignia";

  if (scene === "modi") {
    if (interaction === "hug") {
      return `From this customer photo, create a realistic, photorealistic, high quality photo of Prime Minister Narendra Modi sharing a warm, respectful friendly hug (gale milna / embrace) with the customer. Keep the customer's exact face, identity, hair, facial features, expression, skin tone, and clothing preserved. Prime Minister Narendra Modi is styled authentically with his neat white beard, spectacles, and traditional elegant kurta jacket, smiling warmly as they embrace. Professional warm stage lighting, clean dignified background, natural perspective.${ADAPTIVE_FIT_DIRECTIVE}`;
    }
    if (interaction === "handshake") {
      return `From this customer photo, create a realistic, photorealistic, high quality photo of Prime Minister Narendra Modi shaking hands warmly and respectfully with the customer. Keep the customer's exact face, identity, hair, expression, skin tone, and clothing preserved. Prime Minister Narendra Modi is styled authentically in his classic kurta jacket and spectacles, greeting the customer with a respectful, warm smile and a firm handshake matching the customer's stance and height. Dignified professional lighting and natural background.${ADAPTIVE_FIT_DIRECTIVE}`;
    }
    if (interaction === "meeting") {
      return `From this customer photo, create a realistic, photorealistic, high quality photo of the customer seated in an official formal meeting and warm discussion with Prime Minister Narendra Modi in a dignified office or conference room. Keep the customer's exact face, hair, and identity preserved. Prime Minister Narendra Modi in his signature kurta jacket and spectacles, engaging in a friendly conversation matching the customer's seating position. Natural warm indoor lighting.${ADAPTIVE_FIT_DIRECTIVE}`;
    }
    if (interaction === "scarf") {
      return `From this customer photo, create a realistic, photorealistic, high quality photo of Prime Minister Narendra Modi warmly presenting and honoring the customer with a ceremonial saffron scarf and angavastram ${bjpScarfDesc} Keep the customer's exact face, expression, and identity preserved. Prime Minister Narendra Modi is smiling warmly, holding or draping the saffron stole over the customer's shoulders. Dignified ceremonial lighting and event stage background.${ADAPTIVE_FIT_DIRECTIVE}`;
    }
    if (interaction === "gift") {
      return `From this customer photo, create a realistic, photorealistic, high quality photo of the customer presenting a ceremonial memento, floral bouquet, or traditional gift to Prime Minister Narendra Modi, with the Prime Minister smiling warmly and graciously accepting it. Keep the customer's exact face, expression, and identity preserved. Prime Minister Narendra Modi is styled authentically with neat white beard, spectacles, and traditional elegant kurta jacket. Dignified ceremonial event lighting and background.${ADAPTIVE_FIT_DIRECTIVE}`;
    }
    if (interaction === "flag") {
      return `From this customer photo, create a realistic, photorealistic, high quality photo of Prime Minister Narendra Modi standing side by side with the customer, celebrating proudly with the flag and ceremonial saffron stole on a grand stage. Prime Minister Narendra Modi is styled authentically with neat white beard, spectacles, and traditional elegant kurta jacket. Keep the customer's exact face, expression, and identity preserved. Dignified ceremonial lighting and background.${ADAPTIVE_FIT_DIRECTIVE}`;
    }
    return `From this customer photo, create a realistic, photorealistic, high quality selfie photo of Prime Minister Narendra Modi standing side by side beside the customer, smiling warmly and posing together for a selfie matching the customer's camera angle and height. Keep the customer's exact face and identity preserved. Prime Minister Narendra Modi in his signature kurta jacket and spectacles. Warm natural stage lighting.${ADAPTIVE_FIT_DIRECTIVE}`;
  }

  if (scene === "yogi") {
    if (interaction === "meeting") {
      return `From this customer photo, create a realistic, photorealistic, high quality photo of Chief Minister Yogi Adityanath seated in an official meeting room in a friendly, respectful discussion with the customer. Chief Minister Yogi Adityanath is styled authentically with shaved head, warm smile, and traditional vibrant saffron robes (bhagwa kurta and shawl). Keep the customer's exact face, hair, and identity completely preserved. Dignified official meeting background and warm professional lighting.${ADAPTIVE_FIT_DIRECTIVE}`;
    }
    if (interaction === "scarf") {
      return `From this customer photo, create a realistic, photorealistic, high quality photo of Chief Minister Yogi Adityanath presenting and draping a ceremonial saffron scarf ${bjpScarfDesc} over the customer's shoulders in a traditional gesture of honor and felicitation. Chief Minister Yogi Adityanath is smiling warmly in traditional saffron robes. Keep the customer's exact identity, face, expression, and hair preserved. Dignified ceremonial stage lighting.${ADAPTIVE_FIT_DIRECTIVE}`;
    }
    if (interaction === "gift") {
      return `From this customer photo, create a realistic, photorealistic, high quality photo of the customer presenting a traditional memento, bouquet, or ceremonial gift to Chief Minister Yogi Adityanath with Chief Minister Yogi Adityanath accepting it with a warm respectful smile. Chief Minister Yogi Adityanath is styled in traditional saffron robes. Keep the customer's exact face, hair, and identity preserved. Dignified ceremonial stage lighting.${ADAPTIVE_FIT_DIRECTIVE}`;
    }
    if (interaction === "handshake") {
      return `From this customer photo, create a realistic, photorealistic, high quality photo of Chief Minister Yogi Adityanath shaking hands warmly and respectfully with the customer. Chief Minister Yogi Adityanath is styled authentically with shaved head, smiling warmly in traditional saffron robes matching the customer's stance and height. Keep the customer's exact face, hair, expression, and identity preserved. Warm natural lighting.${ADAPTIVE_FIT_DIRECTIVE}`;
    }
    if (interaction === "hug") {
      return `From this customer photo, create a realistic, photorealistic, high quality photo of Chief Minister Yogi Adityanath sharing a warm respectful greeting and friendly embrace with the customer. Chief Minister Yogi Adityanath is styled authentically with shaved head and traditional saffron robes. Keep the customer's exact face and identity preserved. Warm festive stage lighting.${ADAPTIVE_FIT_DIRECTIVE}`;
    }
    if (interaction === "flag") {
      return `From this customer photo, create a realistic, photorealistic, high quality photo of Chief Minister Yogi Adityanath standing with the customer, celebrating with an official flag and ceremonial saffron stoles on a grand stage. Chief Minister Yogi Adityanath is styled authentically with shaved head, warm smile, and traditional saffron robes. Keep the customer's exact face, hair, and identity preserved. Celebratory event stage lighting.${ADAPTIVE_FIT_DIRECTIVE}`;
    }
    return `From this customer photo, create a realistic, photorealistic, high quality selfie photograph of Chief Minister Yogi Adityanath standing side by side with the customer, posing together with warm smiles matching the customer's angle and perspective. Chief Minister Yogi Adityanath is styled authentically with shaved head, warm smile, and traditional vibrant saffron robes (bhagwa vastra). Keep the customer's exact face, hair, and identity preserved. Natural perspective and warm lighting.${ADAPTIVE_FIT_DIRECTIVE}`;
  }

  if (scene === "bjp") {
    if (interaction === "scarf" || interaction === "selfie") {
      return `From this customer photo, create a photorealistic, high quality portrait of the customer wearing ${bjpScarfDesc} and optional ${bjpCapDesc}. The background is a grand celebratory event stage with soft warm saffron and green festive bokeh lighting and lotus emblem banners. The customer's exact face, identity, hair, expression, and skin tone are completely preserved. Realistic photographic lighting.${ADAPTIVE_FIT_DIRECTIVE}`;
    }
    if (interaction === "flag") {
      return `From this customer photo, create a photorealistic, high quality celebration photo of the customer holding and posing proudly with the official party flag with saffron and green panels and lotus emblem on a grand celebratory stage, wearing ${bjpScarfDesc} and optional ${bjpCapDesc}. Warm celebratory stage lighting. Preserve the customer's exact face and identity.${ADAPTIVE_FIT_DIRECTIVE}`;
    }
    if (interaction === "gift") {
      return `From this customer photo, create a photorealistic photo of the customer holding a dignified ceremonial felicitation memento or plaque on stage, wearing ${bjpScarfDesc} Warm celebratory stage lighting. Preserve the customer's exact face and identity.${ADAPTIVE_FIT_DIRECTIVE}`;
    }
    if (interaction === "event") {
      return `From this customer photo, create a photorealistic photo of the customer standing proudly at a grand celebration event stage, wearing ${bjpScarfDesc} and holding or standing by official flags. Celebratory saffron and green festive backdrops. Preserve the customer's exact face and identity.${ADAPTIVE_FIT_DIRECTIVE}`;
    }
    const base = `Enhance this vertical customer photo with authentic celebratory styling: wearing ${bjpScarfDesc} on a grand celebratory stage with lotus emblems and saffron and green lighting. Preserve the customer's exact identity, face, expression, and skin tone.${ADAPTIVE_FIT_DIRECTIVE}`;
    return cfg.ai.bjpImagePrompt ? `${base} ${cfg.ai.bjpImagePrompt}` : base;
  }

  return "Enhance this photo with clean, dignified lighting and natural colors while preserving all identities.";
}

export function getFallbackEnhancePrompt(
  scene: string,
  interaction: string,
  cfg: AppConfig,
): string {
  const safeStole =
    "an authentic ceremonial Indian silk stole (Bhagwa Patka / Angavastram) in rich radiant saffron-orange and green with delicate floral lotus motifs and emerald-green borders, draped flat and symmetrically straight down over both shoulders across the chest. Not a winter muffler, not wrapped around the neck.";

  if (scene === "yogi") {
    if (interaction === "meeting") {
      return `From this customer photo, create a realistic, photorealistic, high quality photo of a revered Indian spiritual leader and state Chief Minister with shaved head, calm warm smile, and traditional vibrant saffron robes, seated in an official meeting room in a friendly dignified conversation with the customer. Keep the customer's exact face, identity, hair, expression, and skin tone preserved. Warm natural indoor lighting.${ADAPTIVE_FIT_DIRECTIVE}`;
    }
    if (interaction === "scarf") {
      return `From this customer photo, create a realistic, photorealistic, high quality photo of a revered Indian spiritual leader with shaved head, warm smile, and traditional saffron robes presenting and draping a ceremonial saffron stole ${safeStole} over the customer's shoulders in a traditional gesture of honor. Keep the customer's exact identity, face, expression, and hair preserved. Dignified stage lighting.${ADAPTIVE_FIT_DIRECTIVE}`;
    }
    if (interaction === "gift") {
      return `From this customer photo, create a realistic, photorealistic, high quality photo of the customer presenting a ceremonial gift or traditional memento to a revered Indian spiritual leader in traditional saffron robes, who accepts it with a warm welcoming smile. Keep the customer's exact face and identity preserved. Dignified stage lighting.${ADAPTIVE_FIT_DIRECTIVE}`;
    }
    if (interaction === "handshake") {
      return `From this customer photo, create a realistic, photorealistic, high quality photo of a revered Indian spiritual leader with shaved head, dressed in traditional saffron robes, shaking hands warmly and respectfully with the customer matching their stance. Keep the customer's exact face, expression, and identity preserved. Warm natural lighting.${ADAPTIVE_FIT_DIRECTIVE}`;
    }
    if (interaction === "hug") {
      return `From this customer photo, create a realistic, photorealistic, high quality photo of a revered Indian spiritual leader with shaved head in traditional saffron robes sharing a warm respectful greeting and embrace with the customer. Keep the customer's exact face and identity preserved. Warm festive stage lighting.${ADAPTIVE_FIT_DIRECTIVE}`;
    }
    if (interaction === "flag") {
      return `From this customer photo, create a realistic, photorealistic, high quality photo of a revered Indian spiritual leader with shaved head in traditional saffron robes standing proudly with the customer celebrating with a ceremonial flag on stage. Keep the customer's exact face and identity preserved. Warm festive stage lighting.${ADAPTIVE_FIT_DIRECTIVE}`;
    }
    return `From this customer photo, create a realistic, photorealistic, high quality selfie photo of a revered Indian spiritual leader with shaved head, warm smile, and traditional saffron robes standing side by side with the customer, posing together for a warm selfie. Keep the customer's exact face, hair, and identity preserved. Natural perspective and warm lighting.${ADAPTIVE_FIT_DIRECTIVE}`;
  }

  if (scene === "bjp") {
    return `From this customer photo, create a photorealistic, high quality celebration portrait of the customer wearing ${safeStole} and an optional traditional saffron folded side-cap. Festive grand celebration background with warm radiant saffron and green lighting and celebratory banners. Keep the customer's exact face, identity, hair, expression, and skin tone completely preserved.${ADAPTIVE_FIT_DIRECTIVE}`;
  }

  return getEnhancePrompt(scene, interaction, cfg);
}

/** Structured server-side logger that prevents leaking sensitive keys or private URLs. */
function logAiEvent(
  level: "info" | "warn" | "error",
  data: {
    event: string;
    provider: string;
    scene: string;
    interaction?: string;
    category?: string;
    status?: number;
    fallbackTriggered?: boolean;
    errorSummary?: string;
  },
) {
  const payload = JSON.stringify({
    timestamp: new Date().toISOString(),
    ...data,
  });
  if (level === "error") {
    console.error(`[AI Enhance] ${payload}`);
  } else if (level === "warn") {
    console.warn(`[AI Enhance] ${payload}`);
  } else {
    console.log(`[AI Enhance] ${payload}`);
  }
}

interface ProviderResult {
  success: boolean;
  b64?: string;
  category:
    | "success"
    | "quota"
    | "rate_limit"
    | "auth_error"
    | "server_error"
    | "timeout"
    | "network_error"
    | "no_image_returned"
    | "not_configured"
    | "bad_request";
  status: number;
  retryable: boolean;
  message?: string;
}

/** Call primary Lovable AI provider. */
async function callLovable(key: string, imageBlob: Blob, prompt: string): Promise<ProviderResult> {
  try {
    const out = new FormData();
    out.append("model", LOVABLE_MODEL);
    out.append("prompt", prompt);
    // Ensure blob is native to the runtime's global FormData context
    const imageBytes = await imageBlob.arrayBuffer();
    const safeImageBlob = new globalThis.Blob([imageBytes], {
      type: imageBlob.type || "image/jpeg",
    });
    out.append("image", safeImageBlob, "capture.jpg");
    out.append("size", "1024x1536");
    out.append("output_format", "jpeg");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    const res = await fetch(`${LOVABLE_GATEWAY}/v1/images/edits`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: out,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      const status = res.status;
      const category =
        status === 402
          ? "quota"
          : status === 429
            ? "rate_limit"
            : status === 401 || status === 403
              ? "auth_error"
              : status >= 500
                ? "server_error"
                : "bad_request";
      const retryable = status === 429 || status === 402 || status >= 500;
      return {
        success: false,
        category,
        status,
        retryable,
        message: errText.slice(0, 160),
      };
    }

    const json = (await res.json()) as { data?: { b64_json?: string }[] };
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) {
      return {
        success: false,
        category: "no_image_returned",
        status: 502,
        retryable: true,
        message: "Empty image data in response",
      };
    }
    return { success: true, b64, category: "success", status: 200, retryable: false };
  } catch (err: unknown) {
    const isTimeout =
      err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError");
    return {
      success: false,
      category: isTimeout ? "timeout" : "network_error",
      status: isTimeout ? 504 : 502,
      retryable: true,
      message: err instanceof Error ? err.message : "Network error",
    };
  }
}

export async function handleEnhanceRequest(request: Request): Promise<Response> {
  const lovableKey = process.env["LOVABLE_API_KEY"];

  if (!lovableKey) {
    logAiEvent("warn", {
      event: "ai_not_configured",
      provider: "lovable",
      scene: "unknown",
      category: "not_configured",
      status: 503,
    });
    return Response.json({ code: "not_configured" }, { status: 503 });
  }

  const form = await request.formData();
  const image = form.get("image");
  const scene = String(form.get("scene") ?? "");
  const interaction = String(form.get("interaction") ?? "selfie");

  const isImageBlob =
    (typeof File !== "undefined" && image instanceof File) ||
    (typeof Blob !== "undefined" && image instanceof Blob) ||
    (typeof image === "object" &&
      image !== null &&
      "size" in image &&
      "arrayBuffer" in image &&
      typeof (image as { arrayBuffer: unknown }).arrayBuffer === "function");

  if (
    !image ||
    !isImageBlob ||
    image.size > 10_000_000 ||
    !SCENES.includes(scene) ||
    !(INTERACTIONS as readonly string[]).includes(interaction)
  ) {
    return Response.json({ code: "invalid" }, { status: 400 });
  }

  const { loadConfig } = await import("@/lib/config.server");
  const cfg = await loadConfig();
  if (scene === "demo" ? !cfg.demo.enabled : !cfg.ai.imageEnabled) {
    return Response.json({ code: "not_configured" }, { status: 503 });
  }

  const prompt = getEnhancePrompt(scene, interaction, cfg);

  let res = await callLovable(lovableKey, image, prompt);

  if (!res.success && (res.status === 400 || res.category === "bad_request")) {
    const fallbackPrompt = getFallbackEnhancePrompt(scene, interaction, cfg);
    if (fallbackPrompt !== prompt) {
      logAiEvent("warn", {
        event: "ai_retrying_with_safety_fallback",
        provider: "lovable",
        scene,
        interaction,
        fallbackTriggered: true,
        errorSummary: res.message,
      });
      res = await callLovable(lovableKey, image, fallbackPrompt);
    }
  }

  if (res.success && res.b64) {
    logAiEvent("info", {
      event: "ai_generation_success",
      provider: "lovable",
      scene,
      interaction,
    });
    return Response.json({ b64: res.b64, provider: "lovable" });
  }

  logAiEvent("error", {
    event: "ai_provider_error",
    provider: "lovable",
    scene,
    interaction,
    category: res.category,
    status: res.status,
    fallbackTriggered: false,
    errorSummary: res.message,
  });

  const finalCategory = res.category;
  const finalStatus = res.status;
  const code =
    finalCategory === "quota"
      ? "credits"
      : finalCategory === "rate_limit"
        ? "busy"
        : finalCategory === "auth_error"
          ? "denied"
          : finalCategory === "not_configured"
            ? "not_configured"
            : "failed";

  return Response.json({ code }, { status: finalStatus });
}

/**
 * Post-capture AI image generation and styling using Lovable AI key.
 */
export const Route = createFileRoute("/api/enhance")({
  server: {
    handlers: {
      POST: ({ request }) => handleEnhanceRequest(request),
    },
  },
});
