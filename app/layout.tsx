import "./globals.css";

export const metadata = {
  title: "WhatChordIsThis",
  description: "Type notes. Get a chord name.",
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
