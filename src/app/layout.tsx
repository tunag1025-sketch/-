import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Providers } from "@/components/Providers";
import { SPLASH_IMAGES } from "@/lib/splash-images";
import { SPLASH_SCRIPT } from "@/lib/splash";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "@fontsource-variable/outfit";
import "./globals.css";

const TITLE = "Utango · 노래로 배우는 일본어";
const DESCRIPTION = "좋아하는 노래 가사를 붙여넣으면 AI가 단어장과 예문을 만들어 주는 일본어 공부 앱";

export const metadata: Metadata = {
  // 링크 미리보기(카카오톡 등)의 이미지 주소를 절대 주소로 만든다.
  metadataBase: new URL(process.env.APP_URL || "https://utango.vercel.app"),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION, siteName: "Utango", locale: "ko_KR", type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
  applicationName: "Utango",
  // 홈 화면 앱을 켤 때 iPhone·iPad가 먼저 보여 주는 시작 화면 (앱 안 시작 화면과 똑같이 그린 이미지)
  appleWebApp: { capable: true, title: "Utango", statusBarStyle: "default", startupImage: SPLASH_IMAGES },
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
    { media: "(prefers-color-scheme: light)", color: "#f7f8fc" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0e15" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full">
        <div id="splash" aria-hidden="true" suppressHydrationWarning>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" width={108} height={108} className="splash-icon" />
          <p className="splash-name">Utango</p>
          <p className="splash-tag">노래로 배우는 일본어</p>
        </div>
        <script dangerouslySetInnerHTML={{ __html: SPLASH_SCRIPT }} />
        <Providers>
          <main className="pt-safe mx-auto min-h-dvh max-w-xl px-5 pb-32">{children}</main>
          <Suspense>
            <BottomNav />
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}
