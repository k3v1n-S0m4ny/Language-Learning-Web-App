import { signOut } from "@/auth";

// Sign-out control, using a server-action form (works without client JS).
export function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut();
      }}
    >
      <button
        type="submit"
        className="rounded-full border border-border-base px-4 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:bg-surface active:scale-95"
      >
        Sign out
      </button>
    </form>
  );
}
