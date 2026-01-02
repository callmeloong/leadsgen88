import type { Metadata } from "next";
import { Handjet } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner'

const handjet = Handjet({ subsets: ['latin'], variable: '--font-handjet' })

export const metadata: Metadata = {
  title: 'PoolRank - Retro Digital',
  description: 'Hệ thống xếp hạng bi-a nội bộ',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${handjet.variable} font-sans antialiased min-h-screen bg-background text-foreground`}>
        {children}
        <Toaster richColors position="top-center" theme="dark" />
      </body>
    </html>
  );
}
