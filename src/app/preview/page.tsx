import type { Metadata } from "next";
import { PreviewClient } from "./preview-client";

export const metadata: Metadata = {
  title: "화면 미리보기 · Utango",
  description: "샘플 데이터로 Utango의 모든 화면을 둘러보는 페이지",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <PreviewClient />;
}
