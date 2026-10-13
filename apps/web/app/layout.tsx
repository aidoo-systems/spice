import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import ErrorBoundary from "./components/ErrorBoundary";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

// Display face for the wordmark, headings and plan titles: Bricolage
// Grotesque, the same self-hosted file aidoo.biz uses (OFL, see app/fonts).
// Exposed as `--font-bricolage` and surfaced through `font-display`.
const bricolage = localFont({
  src: "./fonts/bricolage-grotesque-latin.woff2",
  display: "swap",
  weight: "200 800",
  variable: "--font-bricolage",
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
    "theme-color": "#141312",
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
        {process.env.NEXT_PUBLIC_UMAMI_URL && process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID && (
          <script
            defer
            src={`${process.env.NEXT_PUBLIC_UMAMI_URL}/script.js`}
            data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
          />
        )}
      </head>
      <body className={`${inter.className} ${bricolage.variable} text-stone-900 dark:text-ink min-h-screen`}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
