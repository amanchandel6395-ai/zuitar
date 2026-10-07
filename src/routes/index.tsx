import { createFileRoute, Link } from "@tanstack/react-router";
import modi from "@/assets/narendra-modi-cutout.png.asset.json";
import yogi from "@/assets/yogi-adityanath-cutout.png.asset.json";
import bjp from "@/assets/bjp-look.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ZUITAR — AI Selfie with Yogi, Modi & BJP Look" },
      { name: "description", content: "Take an AI-generated selfie with CM Yogi Adityanath, PM Narendra Modi, or in a BJP look." },
      { property: "og:title", content: "ZUITAR — AI Selfie with Yogi, Modi & BJP Look" },
      { property: "og:description", content: "Take an AI-generated selfie with CM Yogi Adityanath, PM Narendra Modi, or in a BJP look." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const OPTIONS = [
  { kind: "yogi", title: "Selfie with CM Yogi Adityanath", img: yogi.url, cover: false },
  { kind: "modi", title: "Selfie with PM Narendra Modi", img: modi.url, cover: false },
  { kind: "bjp", title: "Selfie with BJP Look", img: bjp, cover: true },
] as const;

function Index() {
  return (
    <div className="neon-bg min-h-screen">
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-center font-display text-3xl font-extrabold md:text-5xl">
          ZUIT<span className="text-glow text-accent">AR</span>
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">Take a selfie → choose → generate → download</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {OPTIONS.map((o) => (
            <Link key={o.kind} to="/selfie/$kind" params={{ kind: o.kind }} className="glass group relative flex h-64 overflow-hidden rounded-3xl transition-transform active:scale-[0.98] md:h-96">
              <img src={o.img} alt="" className={`absolute inset-0 h-full w-full transition-transform duration-500 group-hover:scale-105 ${o.cover ? "object-cover" : "object-contain object-bottom pt-4"}`} />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background via-background/80 to-transparent p-5 pt-16">
                <p className="font-display text-xl font-bold uppercase leading-tight">{o.title}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
