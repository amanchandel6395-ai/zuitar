import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/routes/_authenticated/admin";

export function Logo() {
  return (
    <Link to="/" className="font-display text-xl font-extrabold tracking-tight">
      ZUIT<span className="text-primary">.</span>AI
    </Link>
  );
}

export function AppHeader() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: isAdmin } = useIsAdmin();
  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
  const link = "rounded-full px-4 py-2 text-sm text-muted-foreground transition hover:text-foreground";
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo />
        <nav className="flex items-center gap-1">
          <Link to="/studio" className={link} activeProps={{ className: "bg-secondary text-foreground" }}>
            Studio
          </Link>
          <Link to="/gallery" className={link} activeProps={{ className: "bg-secondary text-foreground" }}>
            Gallery
          </Link>
          {isAdmin && (
            <Link to="/admin" className={link} activeProps={{ className: "bg-secondary text-foreground" }}>
              Admin
            </Link>
          )}
          <button onClick={signOut} className={link}>
            Sign out
          </button>
        </nav>
      </div>
    </header>
  );
}
