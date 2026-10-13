import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Toaster } from "sonner";
import ErrorBoundary from "./components/ErrorBoundary";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

// Characterful display face for the wordmark, headings, and result titles —
// exposed as `--font-space` and surfaced through the `font-display` utility.
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700"],
  variable: "--font-space",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3737";

export const metadata: Metadata = {
  title: "SPICE – Smart Pantry Intelligence & Culinary Engine",
  description: "Turn your ingredients into a step-by-step meal plan with timing, flavour reasoning, and upgrade suggestions.",
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "SPICE – Smart Pantry Intelligence & Culinary Engine",
    description: "Turn your ingredients into a step-by-step meal plan with timing, flavour reasoning, and upgrade suggestions.",
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary",
    title: "SPICE – Smart Pantry Intelligence & Culinary Engine",
    description: "Turn your ingredients into a step-by-step meal plan with timing, flavour reasoning, and upgrade suggestions.",
  },
  other: {
    "theme-color": "#f59e0b",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("spice-theme");if(t!=="light"){document.documentElement.classList.add("dark")}}catch(e){}})()`,
          }}
        />
        {/* Prevent flash before intro overlay */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem("spice-intro-seen");if(!s){document.documentElement.classList.add("intro-pending")}}catch(e){}})()`,
          }}
        />
        {process.env.NEXT_PUBLIC_UMAMI_URL && process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID && (
          <script
            defer
            src={`${process.env.NEXT_PUBLIC_UMAMI_URL}/script.js`}
            data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
          />
        )}
      </head>
      <body className={`${inter.className} ${spaceGrotesk.variable} app-bg text-stone-900 dark:text-stone-100 min-h-screen`}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
