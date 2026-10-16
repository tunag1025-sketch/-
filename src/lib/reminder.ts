/** 매일 학습 알림의 날짜와 문구 (서버 알림 보내기와 테스트에서 쓴다) */

/** 알림을 보내는 시각: 한국 시간 저녁 8시 (vercel.json의 crons와 맞춘다) */
export const REMINDER_HOUR_KST = 20;

const KST_OFFSET = 9 * 3_600_000;

/** 한국 날짜 YYYY-MM-DD (기기의 dayKey와 같은 모양) */
export function kstDay(ts: number): string {
  return new Date(ts + KST_OFFSET).toISOString().slice(0, 10);
}

/**
 * 오늘 보낼 알림. 이미 오늘 학습했으면 보내지 않는다(null).
 * due: 지금 다시 볼 카드 수
 */
export function reminderMessage({ due, studiedToday }: { due: number; studiedToday: boolean }) {
  if (studiedToday) return null;
  return due > 0
    ? { title: "오늘의 복습이 기다려요", body: `다시 볼 단어 ${due}개가 기다리고 있어요. 노래 가사로 잠깐 복습해요.`, url: "/review" }
    : { title: "오늘도 한 곡 어때요?", body: "오늘은 아직 공부하지 않았어요. 노래 속 새 단어를 배워 봐요.", url: "/study" };
}
