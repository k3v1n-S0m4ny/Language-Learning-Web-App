import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_Thai } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { AmbientMesh } from "@/components/ambient-mesh";

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
      className={`${geistSans.variable} ${geistMono.variable} ${notoSansThai.variable} ${lxgwWenKai.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashTheme }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AmbientMesh />
        {children}
      </body>
    </html>
  );
}
