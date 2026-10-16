import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Providers } from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Utango · 노래로 배우는 일본어",
  description: "좋아하는 노래 가사를 붙여넣으면 AI가 단어장과 예문을 만들어 주는 일본어 공부 앱",
  applicationName: "Utango",
  appleWebApp: { capable: true, title: "Utango", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf6f1" },
    { media: "(prefers-color-scheme: dark)", color: "#15120f" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full">
        <Providers>
          <main className="pt-safe mx-auto min-h-dvh max-w-xl px-4 pb-28">{children}</main>
          <Suspense>
            <BottomNav />
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}
