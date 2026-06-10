/**
 * copy-data.mjs — 빌드/개발 전 data/*.json 을 public/data/ 로 복사한다.
 *
 * 데이터 주입 전략(frontend-standards 데이터 로딩 규약 + product_spec §2.2):
 *  - 1차(권장): src/lib/content.ts 가 data/*.json 을 빌드 타임 import → 타입 안전·트리셰이킹.
 *  - 2차(보조): /public/data/*.json 정적 자산으로도 노출 → 숏츠 점진 로드 등
 *    런타임 fetch('/data/...') 가 필요한 컴포넌트의 폴백 경로.
 *
 * 단일 진실원은 /data 다. public/data 는 항상 이 스크립트로 생성되며 .gitignore 됨.
 * (prebuild/predev 훅에서 자동 실행)
 */
import { cpSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const srcDir = join(root, "data");
const destDir = join(root, "public", "data");

if (!existsSync(srcDir)) {
  console.error(`[copy-data] data/ 디렉토리가 없습니다: ${srcDir}`);
  process.exit(1);
}

mkdirSync(destDir, { recursive: true });

const files = readdirSync(srcDir).filter((f) => f.endsWith(".json"));
for (const file of files) {
  cpSync(join(srcDir, file), join(destDir, file));
}

console.log(`[copy-data] ${files.length}개 JSON → public/data/ 복사 완료: ${files.join(", ")}`);
