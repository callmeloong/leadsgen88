import type { Metadata } from "next";
import { Handjet } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner'

const handjet = Handjet({
  subsets: ["latin"],
  variable: "--font-handjet",
});

export const metadata: Metadata = {
  title: "Billiard Ranking",
  description: "Internal Billiard Ranking System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${handjet.variable} font-sans antialiased min-h-screen bg-background text-foreground`}
      >
        {children}
        <Toaster theme="dark" position="top-center" />
      </body>
    </html>
  );
}
