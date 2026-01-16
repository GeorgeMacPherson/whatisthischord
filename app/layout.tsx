import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  metadataBase: new URL("https://whatisthischord.vercel.app"),
  title: "What Chord Is This? – Free Chord Identifier",
  description:
    "Type in notes like C E G Bb and instantly get the most likely chord name, chord tones, and alternate interpretations.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "What Chord Is This?",
    description: "Identify a chord from a set of notes. Try: C E G Bb.",
    url: "/",
    siteName: "What Chord Is This?",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "What Chord Is This?",
    description: "Identify a chord from a set of notes. Try: C E G Bb.",
  },
  verification: {
    google: "OY6WIVv614Kln3eSSRDS38SMYuHWyv2b_7hn4BtdhmM",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
