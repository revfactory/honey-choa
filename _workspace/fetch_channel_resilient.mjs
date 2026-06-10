#!/usr/bin/env node
// YouTube 채널 영상·숏츠 수집 파이프라인 (외부 의존성 없음, Node 18+)
//
// 사용법:
//   GOOGLE_API_KEY=<key> node fetch_channel.mjs --handle youzin --out data
//   GOOGLE_API_KEY=<key> node fetch_channel.mjs --channel UCNExEo8zrCEXs6DA6yeEcoA --out data
//
// 산출물: <out>/channel.json, <out>/videos.json, <out>/shorts.json
// 종료 코드: 0=성공, 1=설정 오류, 2=API 오류, 3=검증 실패

import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const API = 'https://www.googleapis.com/youtube/v3';
const KEY = process.env.GOOGLE_API_KEY;

// 숏츠 길이 경계(초). 2024-10 이후 숏츠는 최대 3분까지 가능하므로 183초 이하만 HEAD 검사 대상.
const SHORTS_MAX_SECONDS = 183;
const HEAD_CONCURRENCY = 8;

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { handle: null, channel: null, out: 'data', max: Infinity };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--handle') out.handle = args[++i]?.replace(/^@/, '');
    else if (args[i] === '--channel') out.channel = args[++i];
    else if (args[i] === '--out') out.out = args[++i];
    else if (args[i] === '--max') out.max = Number(args[++i]);
  }
  return out;
}

function diagnose(errBody) {
  const reason = errBody?.error?.errors?.[0]?.reason
    ?? errBody?.error?.details?.find(d => d.reason)?.reason;
  const guides = {
    API_KEY_SERVICE_BLOCKED:
      'API 키가 YouTube Data API v3를 허용하지 않습니다.\n' +
      '  → Google Cloud Console > API 및 서비스 > 사용자 인증 정보 > 해당 키 >\n' +
      '    "API 제한사항"에서 YouTube Data API v3를 허용 목록에 추가하거나 "키 제한 안함"을 선택하세요.\n' +
      '  → 프로젝트에서 YouTube Data API v3 자체가 비활성화된 경우: API 라이브러리에서 "사용 설정".\n' +
      '  → 변경 후 전파에 수 분이 걸릴 수 있습니다.',
    quotaExceeded: '일일 쿼터(기본 10,000 유닛)를 초과했습니다. 태평양 시간 자정에 리셋됩니다.',
    keyInvalid: 'API 키가 유효하지 않습니다. GOOGLE_API_KEY 값을 확인하세요.',
    badRequest: '요청 파라미터 오류입니다. 채널 ID/핸들을 확인하세요.',
  };
  return `[${reason ?? 'unknown'}] ${errBody?.error?.message ?? ''}\n${guides[reason] ?? ''}`;
}

async function yt(endpoint, params) {
  const url = new URL(`${API}/${endpoint}`);
  for (const [k, v] of Object.entries({ ...params, key: KEY })) url.searchParams.set(k, v);
  const res = await fetch(url);
  const body = await res.json();
  if (!res.ok) {
    const e = new Error(diagnose(body));
    e.status = res.status;
    e.reason = body?.error?.errors?.[0]?.reason;
    throw e;
  }
  return body;
}

async function ytRetry(endpoint, params, tries = 8) {
  for (let i = 0; i < tries; i++) {
    try {
      return await yt(endpoint, params);
    } catch (e) {
      // 5xx 재시도 + 키 전파 불균일로 인한 일시적 "API key expired"(badRequest) 재시도.
      const transientExpired = e.reason === 'badRequest' && /expired/i.test(e.message);
      if ((e.status >= 500 || transientExpired) && i < tries - 1) {
        await new Promise(r => setTimeout(r, 800 * 2 ** Math.min(i, 4)));
        continue;
      }
      throw e;
    }
  }
}

// ISO8601 duration (PT1H2M3S) → 초
function toSeconds(iso) {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso ?? '');
  if (!m) return 0;
  return (Number(m[1] ?? 0) * 3600) + (Number(m[2] ?? 0) * 60) + Number(m[3] ?? 0);
}

// 숏츠 확정 판별: /shorts/{id}가 200이면 숏츠, 리다이렉트(303 등)면 일반 영상
async function isShortByHead(videoId) {
  try {
    const res = await fetch(`https://www.youtube.com/shorts/${videoId}`, {
      method: 'HEAD', redirect: 'manual',
    });
    return res.status === 200;
  } catch {
    return null; // 네트워크 실패 → 미확정
  }
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function main() {
  if (!KEY) {
    console.error('오류: 환경변수 GOOGLE_API_KEY가 설정되지 않았습니다.');
    process.exit(1);
  }
  const args = parseArgs();
  if (!args.handle && !args.channel) {
    console.error('오류: --handle <핸들> 또는 --channel <채널ID>가 필요합니다.');
    process.exit(1);
  }

  // 1) 채널 조회 (preflight 겸용 — 키/API 상태가 여기서 검증됨)
  let channelRes;
  try {
    channelRes = await ytRetry('channels', {
      part: 'snippet,statistics,contentDetails',
      ...(args.channel ? { id: args.channel } : { forHandle: args.handle }),
    });
  } catch (e) {
    console.error('API 사전 점검 실패:\n' + e.message);
    process.exit(2);
  }
  const ch = channelRes.items?.[0];
  if (!ch) {
    console.error('오류: 채널을 찾을 수 없습니다.');
    process.exit(2);
  }
  const uploadsId = ch.contentDetails.relatedPlaylists.uploads;
  console.error(`채널: ${ch.snippet.title} (${ch.id}) — 공개 영상 ${ch.statistics.videoCount}개`);

  // 2) 업로드 재생목록 전체 페이지네이션 (1유닛/50개)
  const videoIds = [];
  let pageToken;
  do {
    const page = await ytRetry('playlistItems', {
      part: 'contentDetails', playlistId: uploadsId, maxResults: 50,
      ...(pageToken ? { pageToken } : {}),
    });
    for (const item of page.items) videoIds.push(item.contentDetails.videoId);
    pageToken = page.nextPageToken;
  } while (pageToken && videoIds.length < args.max);

  // 3) 상세 메타데이터 배치 조회 (50개/호출)
  const videos = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = await ytRetry('videos', {
      part: 'snippet,contentDetails,statistics,status',
      id: videoIds.slice(i, i + 50).join(','),
      maxResults: 50,
    });
    for (const v of batch.items) {
      videos.push({
        videoId: v.id,
        title: v.snippet.title,
        description: v.snippet.description,
        publishedAt: v.snippet.publishedAt,
        duration: v.contentDetails.duration,
        durationSeconds: toSeconds(v.contentDetails.duration),
        thumbnails: v.snippet.thumbnails,
        tags: v.snippet.tags ?? [],
        statistics: {
          viewCount: Number(v.statistics?.viewCount ?? 0),
          likeCount: Number(v.statistics?.likeCount ?? 0),
          commentCount: Number(v.statistics?.commentCount ?? 0),
        },
        embeddable: v.status?.embeddable ?? true,
        isShort: null, // 4단계에서 판별
      });
    }
  }

  // 4) 숏츠 판별: 183초 초과 → 일반 영상 확정, 이하 → HEAD로 확정
  const candidates = videos.filter(v => v.durationSeconds > 0 && v.durationSeconds <= SHORTS_MAX_SECONDS);
  console.error(`숏츠 후보 ${candidates.length}건 HEAD 판별 중...`);
  await mapLimit(candidates, HEAD_CONCURRENCY, async v => {
    v.isShort = await isShortByHead(v.videoId);
  });
  for (const v of videos) if (v.isShort === null && v.durationSeconds > SHORTS_MAX_SECONDS) v.isShort = false;
  const undetermined = videos.filter(v => v.isShort === null);

  // 5) 검증 + 산출
  if (videos.length === 0) {
    console.error('검증 실패: 수집된 영상이 0건입니다.');
    process.exit(3);
  }
  const shorts = videos.filter(v => v.isShort === true);
  const regular = videos.filter(v => v.isShort !== true);
  const fetchedAt = new Date().toISOString();

  await mkdir(args.out, { recursive: true });
  await writeFile(join(args.out, 'channel.json'), JSON.stringify({
    channelId: ch.id, title: ch.snippet.title, handle: ch.snippet.customUrl,
    description: ch.snippet.description, publishedAt: ch.snippet.publishedAt,
    thumbnails: ch.snippet.thumbnails,
    statistics: {
      subscriberCount: Number(ch.statistics.subscriberCount ?? 0),
      videoCount: Number(ch.statistics.videoCount ?? 0),
      viewCount: Number(ch.statistics.viewCount ?? 0),
    },
    fetchedAt,
  }, null, 2));
  await writeFile(join(args.out, 'videos.json'), JSON.stringify({ fetchedAt, count: regular.length, items: regular }, null, 2));
  await writeFile(join(args.out, 'shorts.json'), JSON.stringify({ fetchedAt, count: shorts.length, items: shorts }, null, 2));

  console.error([
    '--- 수집 완료 ---',
    `전체: ${videos.length}건 (채널 통계상 ${ch.statistics.videoCount}건)`,
    `일반 영상: ${regular.length}건 / 숏츠: ${shorts.length}건 / 판별 미확정: ${undetermined.length}건`,
    `임베드 불가: ${videos.filter(v => !v.embeddable).length}건`,
    `산출: ${args.out}/channel.json, videos.json, shorts.json`,
  ].join('\n'));
}

main().catch(e => { console.error('예기치 못한 오류:', e.message); process.exit(2); });
