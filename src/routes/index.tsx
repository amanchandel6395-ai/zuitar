import { createFileRoute, Link } from "@tanstack/react-router";
import hero from "@/assets/hero.jpg";
import { Logo } from "@/components/AppHeader";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ZUIT AI — AI Camera & Photo Magic" },
      { name: "description", content: "Snap or upload a photo and transform it with AI backgrounds, styles and characters." },
      { property: "og:title", content: "ZUIT AI — AI Camera & Photo Magic" },
      { property: "og:description", content: "Snap or upload a photo and transform it with AI backgrounds, styles and characters." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="neon-bg min-h-screen">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo />
        <Link to="/auth" className="btn-ghost">Sign in</Link>
      </header>
      <main className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:grid-cols-2 md:py-24">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-primary">Create. Transform. Experience.</p>
          <h1 className="mt-4 font-display text-5xl font-extrabold leading-[0.95] md:text-7xl">
            Turn moments <br /> into <span className="text-glow text-accent">magic.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg text-muted-foreground">
            Snap a photo, pick an effect, and watch AI rebuild your world — neon cities, outer space, anime and more.
          </p>
          <div className="mt-8 flex gap-3">
            <Link to="/studio" className="btn-neon">Open camera</Link>
            <Link to="/gallery" className="btn-ghost">My gallery</Link>
          </div>
        </div>
        <div className="relative">
          <div className="absolute -inset-6 rounded-[2.5rem] bg-accent/30 blur-3xl" />
          <img src={hero} alt="Person transformed by ZUIT AI into a neon city scene" width={1024} height={1280} className="relative aspect-[4/5] w-full rounded-[2rem] border border-border object-cover" />
        </div>
      </main>
    </div>
  );
}
