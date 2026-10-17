/**
 * 시작 화면(앱 아이콘 + 이름). 레이아웃 HTML에 들어 있고, 탭을 처음 열 때만 잠깐 보인다.
 * 화면이 준비되면 부드럽게 감춘다. 너무 빨리 사라져 깜빡이지 않게 조금은 보여 준다.
 */
const MIN_MS = 700;

/** 페이지 HTML을 읽는 동안(그리기 전) 돌리는 스크립트: 이 탭에서 이미 봤거나 화면 미리보기면 바로 숨긴다. ?splash=1 이면 계속 띄워 둔다. */
export const SPLASH_SCRIPT = `(function(){var s=document.getElementById("splash");if(!s)return;try{var q=location.search;if(/[?&]splash=1/.test(q)){s.dataset.state="hold";return}if(sessionStorage.getItem("utango-splash")||sessionStorage.getItem("utango-preview")||/[?&]preview=1/.test(q)||location.pathname==="/preview"){s.dataset.state="off";return}sessionStorage.setItem("utango-splash","1")}catch(e){}})()`;

export function hideSplash() {
  const el = document.getElementById("splash");
  if (!el || el.dataset.state) return;
  setTimeout(() => (el.dataset.state = "out"), Math.max(0, MIN_MS - performance.now()));
}
