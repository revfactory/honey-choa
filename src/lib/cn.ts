/** 클래스명 조건부 결합 유틸. falsy 값 제거 후 공백 결합. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
