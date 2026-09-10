import type { Metadata } from "next";
import { Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/ui/Header";
import PwaRegister from "@/components/ui/PwaRegister";

const manrope = Manrope({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-manrope",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "vietnamese"],
  weight: ["500"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
    : undefined,
  title: "Kỳ Đài | Cờ, game bài và trò chơi trí tuệ",
  description:
    "Cờ vua, cờ tướng, game bài nhiều người và minigame trên một đấu trường trực tuyến dành cho người Việt.",
  applicationName: "Kỳ Đài",
  generator: "Next.js",
  keywords: ["Kỳ Đài", "cờ vua", "cờ tướng", "game bài", "game Việt Nam"],
  alternates: { canonical: "/" },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: "/",
    siteName: "Kỳ Đài",
    title: "Kỳ Đài | Cờ, game bài và trò chơi trí tuệ",
    description:
      "Một sân chơi Việt Nam cho cờ, game bài, đấu giải và những ván đấu nhanh.",
    images: [
      {
        url: "/images/branding/ky-dai-hero-v2.webp",
        width: 1536,
        height: 1024,
        alt: "Kỳ Đài — game hub Việt Nam",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kỳ Đài | Cờ, game bài và trò chơi trí tuệ",
    description: "Chọn game, vào bàn và chơi ngay trên Kỳ Đài.",
    images: ["/images/branding/ky-dai-hero-v2.webp"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className={`${manrope.variable} ${jetbrainsMono.variable} min-h-[100dvh]`}
        suppressHydrationWarning
      >
        <Header />
        <main>{children}</main>
        <PwaRegister />
      </body>
    </html>
  );
}
