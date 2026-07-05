import { signOut } from "@/auth";

// Sign-out control, using a server-action form (works without client JS).
// `variant="ghost"` is the borderless glass-bar look (Phase 1 Mandarin
// TopBar, which already supplies the surrounding glass chrome); the default
// keeps the original bordered pill so Thai's untouched header (Phase 2)
// doesn't regress visually.
export function SignOutButton({
  variant = "default",
}: {
  variant?: "default" | "ghost";
}) {
  const className =
    variant === "ghost"
      ? "whitespace-nowrap rounded-[var(--r-pill)] px-3 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:bg-[var(--glass-bg-strong)] hover:text-foreground active:scale-95"
      : "rounded-full border border-border-base px-4 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:bg-surface active:scale-95";

  return (
    <form
      action={async () => {
        "use server";
        await signOut();
      }}
    >
      <button type="submit" className={className}>
        Sign out
      </button>
    </form>
  );
}
