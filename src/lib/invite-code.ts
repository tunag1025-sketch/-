/**
 * 초대 코드: 헷갈리기 쉬운 글자(0·O·1·I·L)를 뺀 대문자·숫자 8자. 보여 줄 때는 ABCD-EFGH.
 * 받은 사람은 로그인한 뒤 가입 화면에서 이 코드를 넣는다.
 */
export const INVITE_CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const INVITE_CODE_LENGTH = 8;

/** 입력한 코드에서 대문자·숫자만 (소문자·띄어쓰기·하이픈은 상관없게) */
export function normalizeInviteCode(input: string): string {
  return input.toUpperCase().replace(/[^0-9A-Z]/g, "");
}

/** ABCDEFGH → ABCD-EFGH. 쓰던 중이면 있는 만큼만 (입력 칸에서도 쓴다). 예전 형식 코드는 그대로. */
export function formatInviteCode(code: string): string {
  if (!/^[0-9A-Z]*$/.test(code) || code.length > INVITE_CODE_LENGTH) return code;
  return code.length > 4 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}
