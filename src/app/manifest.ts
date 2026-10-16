import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Utango · 노래로 배우는 일본어",
    short_name: "Utango",
    description: "좋아하는 노래로 만드는 나만의 일본어 단어장",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f5f9",
    theme_color: "#f4f5f9",
    lang: "ko",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
