import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://whatisthischord.vercel.app"),
  title: {
    default: "What Chord Is This? | Identify a chord from notes",
    template: "%s | What Chord Is This?",
  },
  description:
    "Type in notes like C E G Bb and instantly get the most likely chord name, chord tones, and alternate interpretations.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "What Chord Is This?",
    description:
      "Identify a chord from a set of notes. Try: C E G Bb.",
    url: "/",
    siteName: "What Chord Is This?",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "What Chord Is This?",
    description:
      "Identify a chord from a set of notes. Try: C E G Bb.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
