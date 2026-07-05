import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Noto_Sans_Thai,
  IBM_Plex_Sans_Thai,
  IBM_Plex_Sans_Thai_Looped,
} from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { AmbientMesh } from "@/components/ambient-mesh";
import { BottomNav } from "@/components/bottom-nav";
import { SignOutButton } from "@/components/sign-out-button";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Read-Thai course (M11/A5) — self-hosted via next/font, scoped through the
// `.font-thai` utility (wired in globals.css) rather than applied globally so
// the Mandarin flow's typography is untouched.
const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-sans-thai",
  subsets: ["thai"],
  weight: ["400", "500", "700"],
});

// Unit-2 flashcard "modern ⇄ classical" font switcher: the SAME IBM Plex Sans
// Thai family in its looped (classical/textbook — the loops/หัว a beginner
// learns) and loopless (modern signage/branding) cuts, so the toggle isolates
// exactly the loop as the only variable. Only rendered on the unit-2 flashcard
// view, so preload:false keeps every other route's font payload unchanged
// (mirrors the on-demand hanzi font below).
const ibmPlexThaiLooped = IBM_Plex_Sans_Thai_Looped({
  variable: "--font-ibm-plex-thai-looped",
  subsets: ["thai"],
  weight: ["400", "600"],
  display: "swap",
  preload: false,
});
const ibmPlexThaiLoopless = IBM_Plex_Sans_Thai({
  variable: "--font-ibm-plex-thai-loopless",
  subsets: ["thai"],
  weight: ["400", "600"],
  display: "swap",
  preload: false,
});

// Glass redesign (Phase 0) — calligraphic Kai for hanzi. Self-hosted subset
// (only the deck's ~200 glyphs, ~37KB) built by scripts/subset-hanzi-font.ts and
// exposed via the `.font-hanzi` utility. Not preloaded: hanzi only render on the
// Mandarin card, so it loads on demand rather than on every route.
const lxgwWenKai = localFont({
  src: "./fonts/lxgw-wenkai-subset.woff2",
  variable: "--font-lxgw",
  weight: "400",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
});

// Runs before first paint: set [data-theme] from the stored choice, else the OS
// preference — no flash of the wrong theme. Dependency-free, failure-tolerant.
const noFlashTheme = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;}catch(e){}})();`;

export const metadata: Metadata = {
  title: "Learn Languages",
  description: "Private Chinese spaced-repetition flashcards.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${notoSansThai.variable} ${ibmPlexThaiLooped.variable} ${ibmPlexThaiLoopless.variable} ${lxgwWenKai.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashTheme }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AmbientMesh />
        {children}
        {/* Mobile-only persistent nav (Phase 4). Mounted globally so it renders
            on every route; self-resolves mode from <html data-lang>, so the
            server layout needs no per-route query. SignOutButton is a server
            component (sign-out server action), passed in as a prop. */}
        <BottomNav signOut={<SignOutButton variant="ghost" />} />
      </body>
    </html>
  );
}
