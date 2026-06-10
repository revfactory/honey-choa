"use client";

import { useState } from "react";

interface TimecodeEntry {
  /** 초 단위(seek 용). */
  seconds: number;
  /** "01:20" 등 표시 문자열. */
  display: string;
  label: string;
}

interface DescriptionBlockProps {
  description: string;
  timecodes: TimecodeEntry[];
  /** 타임코드 클릭 시 플레이어 seek(player-integrator WatchPlayerClient 의 seekTo). */
  onSeek?: (seconds: number) => void;
}

/**
 * 설명 + 타임코드 블록 — wireframe §9.1 / copy_deck §8.2.
 * 타임코드는 서버에서 파싱해 주입. 클릭 → onSeek(player-integrator seekTo 연동).
 * 더 보기/접기 토글 + seek 호출만 client.
 */
export function DescriptionBlock({ description, timecodes, onSeek }: DescriptionBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const hasOverflow = description.length > 240;
  const text = expanded || !hasOverflow ? description : `${description.slice(0, 240)}…`;

  return (
    <section className="flex flex-col gap-[var(--space-3)]">
      <h2 className="text-[length:var(--text-h3)] font-bold text-[var(--text-primary)]">
        설명
      </h2>

      {timecodes.length > 0 && (
        <ul className="flex flex-col gap-1">
          {timecodes.map((tc, i) => (
            <li key={i}>
              {/* 클릭 → onSeek(player-integrator seekTo). onSeek 없으면 비동작. */}
              <button
                type="button"
                onClick={() => onSeek?.(tc.seconds)}
                className="flex items-baseline gap-[var(--space-3)] text-left text-[length:var(--text-sm)] text-[var(--text-secondary)] hover:text-[var(--honey-300)]"
              >
                <span className="tabular shrink-0 text-[var(--honey-300)]">{tc.display}</span>
                <span>{tc.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="whitespace-pre-line text-[length:var(--text-sm)] leading-relaxed text-[var(--text-secondary)]">
        {text}
      </p>

      {hasOverflow && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="self-start text-[length:var(--text-sm)] font-semibold text-[var(--honey-300)]"
        >
          {expanded ? "접기 ▴" : "더 보기 ▾"}
        </button>
      )}
    </section>
  );
}
