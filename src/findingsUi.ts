/** 결과·상세 화면용 표시 헬퍼 */

import type { Finding } from './types';

/** 자동으로 위반을 확정하기 어려워 항목 선택 하단에 둘 규칙 */
export const GUIDE_ONLY_RULE_IDS = new Set([
  'wa-04-linear',
  'wa-05-instructions',
  'wa-06-color-alone',
  'wa-09-adjacent',
  'wa-13-char-key',
  'wa-15-pause',
  'wa-20-fixed-ref',
  'wa-21-pointer',
  'wa-22-pointer-cancel',
  'wa-24-motion',
  'wa-27-help',
  'wa-28-error',
  'wa-30-auth',
  'wa-31-redundant-entry',
  'wa-33-webapp',
  'html-validate-recommended',
  'compat-html',
  'compat-css',
  'compat-utf8',
  'compat-js',
  'compat-plugin',
  'compat-func',
  'compat-display',
  'compat-m-func',
  'compat-m-display',
]);

/** 수정 예시가 코드가 아니라 기준·방법 멘트만인 규칙 */
export function isMethodOnlyFix(ruleId: string) {
  return ruleId === 'color-contrast' || ruleId === 'wa-12-target-size';
}

export const FINDING_TITLE: Record<string, string> = {
  'image-alt': '이미지에 대체 텍스트 없음',
  'ko-blank-link-title': '새 창 열림 안내 없음',
  'ko-linked-img-empty-alt': '컨트롤 이미지에 대체 텍스트 없음',
  label: '입력칸 이름 없음',
  'link-name': '링크 이름이 모호함',
  'button-name': '버튼 이름 없음',
  'color-contrast': '명도 대비 부족',
  'label-content-name-mismatch': '보이는 이름과 접근성 이름 불일치',
  'document-title': '페이지 제목 없음',
  'page-has-heading-one': 'h1 제목 없음',
  'html-has-lang': '페이지 언어 미지정',
  'meta-refresh': '자동 새로고침·리다이렉트',
  bypass: '본문 바로가기 없음',
  blink: '깜빡임 요소 사용',
  'video-caption': '영상 자막 없음',
  'th-has-data-cells': '표 헤더 연결 오류',
  'no-autoplay-audio': '자동 재생 오디오',
  'wa-10-keyboard': '키보드로 조작·초점 받기 어려움',
  'wa-11-focus': '초점 이동·표시 문제',
  'wa-12-target-size': '조작 영역 크기 부족',
  'scan-error': '페이지 검사 실패',
};

export function findingTitle(ruleId: string, message: string) {
  return FINDING_TITLE[ruleId] || message;
}

export function impactLabel(impact: string) {
  if (impact === 'critical') return '필수확인 오류';
  if (impact === 'serious') return '권장';
  return '참고';
}

export function impactChip(impact: string) {
  if (impact === 'critical') return '필수';
  if (impact === 'serious') return '권장';
  return '참고';
}

export function impactTone(impact: string): 'critical' | 'warn' | 'note' {
  if (impact === 'critical') return 'critical';
  if (impact === 'serious') return 'warn';
  return 'note';
}

/** 오브젝트에 묶인 오류 중 가장 높은 심각도 */
export function worstImpact(impacts: string[]): string {
  let best = impacts[0] || 'moderate';
  let bestRank = -1;
  for (const impact of impacts) {
    const rank = impact === 'critical' ? 3 : impact === 'serious' ? 2 : impact === 'moderate' ? 1 : 0;
    if (rank > bestRank) {
      bestRank = rank;
      best = impact;
    }
  }
  return best;
}

export function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const GENERIC_SELECTORS = new Set(['', 'a[target="_blank"]', 'a img[alt=""]']);

function normalizeAttrValue(v: string) {
  return v
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function isWeakHref(href: string) {
  const h = normalizeAttrValue(href).toLowerCase();
  if (!h || h === '#' || h === '#none' || h === '/#none') return true;
  if (h.startsWith('javascript:')) return true;
  return false;
}

export function objectGroupKey(f: { selector: string; htmlSnippet: string; locationLabel?: string }) {
  const html = f.htmlSnippet || '';
  const href = html.match(/\bhref\s*=\s*["']([^"']*)["']/i)?.[1];
  const normHref = href ? normalizeAttrValue(href) : '';
  if (normHref && !isWeakHref(normHref)) return `a:${normHref}`;

  const src = html.match(/\bsrc\s*=\s*["']([^"']*)["']/i)?.[1];
  if (src) return `img:${normalizeAttrValue(src)}`;

  const sel = (f.selector || '').trim();
  if (sel && !GENERIC_SELECTORS.has(sel)) return `sel:${sel}`;

  const cls = html.match(/\bclass\s*=\s*["']([^"']*)["']/i)?.[1] || '';
  if (f.locationLabel) {
    return `loc:${f.locationLabel}\0cls:${cls}\0href:${normHref}\0${html.slice(0, 160)}`;
  }
  return `html:${html}\0${f.locationLabel || ''}`;
}

export type ObjectFindingGroup = {
  key: string;
  htmlSnippet: string;
  locationLabel: string;
  findings: Finding[];
  ruleIds: string[];
};

export function groupFindingsByObject(findings: Finding[]): ObjectFindingGroup[] {
  const map = new Map<string, Finding[]>();
  for (const f of findings) {
    const key = objectGroupKey(f);
    const list = map.get(key);
    if (list) list.push(f);
    else map.set(key, [f]);
  }
  return Array.from(map.entries()).map(([key, items]) => {
    const deduped: Finding[] = [];
    const seenRule = new Set<string>();
    for (const f of items) {
      if (seenRule.has(f.ruleId)) continue;
      seenRule.add(f.ruleId);
      deduped.push(f);
    }
    const htmlSnippet = deduped.reduce(
      (best, f) => ((f.htmlSnippet || '').length > best.length ? f.htmlSnippet : best),
      deduped[0]?.htmlSnippet || '',
    );
    const locationLabel =
      deduped.find((f) => f.locationLabel)?.locationLabel || deduped[0]?.selector || '';
    const ruleIds = Array.from(new Set(deduped.map((f) => f.ruleId)));
    return { key, htmlSnippet, locationLabel, findings: deduped, ruleIds };
  });
}

function markRuleHighlights(ruleId: string, e: string): string {
  const mark = (src: string, re: RegExp) =>
    src.replace(re, (m) =>
      m.includes('result-code-bad') ? m : `<span class="result-code-bad">${m}</span>`,
    );
  if (ruleId === 'image-alt' || ruleId === 'ko-linked-img-empty-alt') {
    e = mark(e, /alt=&quot;&quot;/g);
    e = mark(e, /alt=''/g);
    if (!e.includes('result-code-bad')) e = mark(e, /&lt;img\b[\s\S]*?&gt;/i);
  } else if (ruleId === 'ko-blank-link-title') {
    e = mark(e, /target=&quot;_blank&quot;/i);
    if (!e.includes('result-code-bad')) e = mark(e, /&lt;a\b[\s\S]*?&gt;/i);
  } else if (ruleId === 'link-name' || ruleId === 'button-name') {
    e = mark(e, /&lt;(?:a|button)\b[\s\S]*?&gt;/i);
  } else if (ruleId === 'html-has-lang') {
    e = mark(e, /&lt;html\b[\s\S]*?&gt;/i);
  } else if (ruleId === 'color-contrast') {
    e = mark(e, /style=&quot;[^&]*&quot;/i);
    if (!e.includes('result-code-bad')) e = mark(e, /class=&quot;[^&]*&quot;/i);
    if (!e.includes('result-code-bad')) e = mark(e, /&lt;[a-z0-9]+\b[\s\S]*?&gt;/i);
  } else if (ruleId === 'label-content-name-mismatch') {
    e = mark(e, /aria-label=&quot;[^&]*&quot;/i);
  } else if (ruleId === 'wa-11-focus') {
    e = mark(e, /tabindex=&quot;[^&]*&quot;/i);
    e = mark(e, /outline\s*:\s*(none|0)/i);
  } else if (ruleId === 'meta-refresh') {
    e = mark(e, /http-equiv=&quot;refresh&quot;/i);
  } else {
    e = mark(e, /&lt;[a-z0-9]+\b[\s\S]*?&gt;/i);
  }
  return e;
}

export function highlightErrorCode(ruleId: string | string[], html: string): string {
  const ids = Array.isArray(ruleId) ? ruleId : [ruleId];
  let e = escapeHtml(html || '');
  for (const id of ids) e = markRuleHighlights(id, e);
  return e;
}

function inputNameHint(html: string) {
  const type = html.match(/\btype\s*=\s*["']([^"']*)["']/i)?.[1] || '';
  const name = html.match(/\bname\s*=\s*["']([^"']*)["']/i)?.[1] || '';
  const id = html.match(/\bid\s*=\s*["']([^"']*)["']/i)?.[1] || '';
  const key = `${type} ${name} ${id}`.toLowerCase();
  if (/password|pswd|pwd|passwd/.test(key)) return '비밀번호';
  if (/email|mail/.test(key)) return '이메일';
  if (/search/.test(key)) return '검색';
  if (/tel|phone/.test(key)) return '전화번호';
  if (/\b(user)?id\b|login|userid|user_id/.test(key)) return '아이디';
  return '입력 항목';
}

function withInputLabelTag(html: string) {
  const h = html || '';
  if (/<label\b/i.test(h)) return h;
  const text = inputNameHint(h);
  const id = h.match(/\bid\s*=\s*["']([^"']+)["']/i)?.[1];
  if (id) return `<label for="${id}">${text}</label>\n${h}`;
  return `<label>${text} ${h}</label>`;
}

function withInputAriaLabel(html: string) {
  const h = html || '';
  if (/\saria-label\s*=/i.test(h)) return h;
  const text = inputNameHint(h);
  if (/<input\b/i.test(h)) return h.replace(/<input\b/i, `<input aria-label="${text}"`);
  if (/<textarea\b/i.test(h)) return h.replace(/<textarea\b/i, `<textarea aria-label="${text}"`);
  if (/<select\b/i.test(h)) return h.replace(/<select\b/i, `<select aria-label="${text}"`);
  return h;
}

function withAriaNewWindowHint(html: string): string {
  if (/aria-label\s*=/i.test(html)) {
    return html.replace(/aria-label\s*=\s*(["'])([^"']*)\1/i, (full, q, v) => {
      if (/새\s*창|새창열림/.test(v)) return full;
      return `aria-label=${q}${v} (새창열림)${q}`;
    });
  }
  return html.replace(/<a\b/i, '<a aria-label="새창열림"');
}

function withHiddenNewWindowText(html: string): string {
  const span =
    '<span class="blind" style="position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0,0,0,0)">새창열림</span>';
  if (/새\s*창|새창열림/.test(html) && /blind|position\s*:\s*absolute/i.test(html)) return html;
  if (/<\/a>/i.test(html)) return html.replace(/<\/a>/i, `${span}</a>`);
  return `${html}${span}`;
}

function withControlImgAlt(html: string): string {
  const h = html || '';
  if (/\salt\s*=\s*["']\s*["']/.test(h)) return h.replace(/\salt\s*=\s*["']\s*["']/, ' alt="대체 텍스트"');
  if (/<img\b/i.test(h) && !/\salt\s*=/i.test(h)) return h.replace(/<img\b/i, '<img alt="대체 텍스트"');
  return h;
}

function withControlBlindText(html: string): string {
  const h = html || '';
  const withEmptyAlt = h.replace(/<img\b([^>]*)>/i, (_m, attrs: string) => {
    if (/\salt\s*=/i.test(attrs)) return `<img${attrs.replace(/\salt\s*=\s*["'][^"']*["']/, ' alt=""')}>`;
    return `<img alt=""${attrs}>`;
  });
  const blind = '<span class="blind">대체 텍스트</span>';
  if (/<\/a>/i.test(withEmptyAlt)) return withEmptyAlt.replace(/<\/a>/i, `${blind}</a>`);
  if (/<\/button>/i.test(withEmptyAlt)) return withEmptyAlt.replace(/<\/button>/i, `${blind}</button>`);
  return `${withEmptyAlt}${blind}`;
}

export function suggestFixedHtml(ruleId: string, html: string): string {
  const h = html || '';
  if (isMethodOnlyFix(ruleId)) return '';
  if (ruleId === 'image-alt') {
    if (/alt\s*=\s*["']\s*["']/.test(h)) return h.replace(/alt\s*=\s*["']\s*["']/, 'alt="이미지 설명"');
    if (!/\salt\s*=/i.test(h)) return h.replace(/<img\b/i, '<img alt="이미지 설명"');
    return h;
  }
  if (ruleId === 'ko-linked-img-empty-alt') return withControlImgAlt(h);
  if (ruleId === 'ko-blank-link-title') {
    if (/\stitle\s*=/i.test(h)) return h.replace(/\stitle\s*=\s*["'][^"']*["']/, ' title="새창열림"');
    return h.replace(/<a\b/i, '<a title="새창열림"');
  }
  if (ruleId === 'link-name') {
    if (/\saria-label\s*=/i.test(h)) return h;
    return h.replace(/<a\b/i, '<a aria-label="링크 목적"');
  }
  if (ruleId === 'button-name') {
    if (/\saria-label\s*=/i.test(h)) return h;
    return h.replace(/<button\b/i, '<button aria-label="버튼 이름"');
  }
  if (ruleId === 'label') return withInputLabelTag(h);
  if (ruleId === 'html-has-lang') {
    if (/\slang\s*=/i.test(h)) return h.replace(/\slang\s*=\s*["'][^"']*["']/, ' lang="ko"');
    return h.replace(/<html\b/i, '<html lang="ko"');
  }
  if (ruleId === 'label-content-name-mismatch') {
    return h.replace(/\saria-label\s*=\s*["'][^"']*["']/, '');
  }
  if (ruleId === 'meta-refresh') {
    return h.replace(/<meta[^>]*http-equiv\s*=\s*["']refresh["'][^>]*>/gi, '');
  }
  if (ruleId === 'blink') {
    return h.replace(/<\/?blink>/gi, '').replace(/<\/?marquee[^>]*>/gi, '');
  }
  if (ruleId === 'video-caption') {
    if (/<video\b/i.test(h) && !/<track\b/i.test(h)) {
      return h.replace(
        /<video\b([^>]*)>/i,
        '<video$1>\n  <track kind="captions" srclang="ko" label="한국어 자막" src="captions-ko.vtt" default />',
      );
    }
    return h;
  }
  if (ruleId === 'no-autoplay-audio') {
    return h.replace(/\sautoplay(=["'][^"']*["'])?/gi, '');
  }
  if (ruleId === 'wa-11-focus') {
    let out = h.replace(/\s tabindex\s*=\s*["'][^"']*["']/gi, '');
    out = out.replace(/outline\s*:\s*(none|0)\s*;?/gi, '');
    return out;
  }
  if (ruleId === 'wa-10-keyboard') {
    if (/tabindex\s*=\s*["']-1["']/i.test(h)) {
      return h.replace(/\s tabindex\s*=\s*["']-1["']/gi, '');
    }
    if (/role\s*=\s*["']button["']/i.test(h) && !/tabindex\s*=/i.test(h)) {
      return h.replace(/<([a-z0-9]+)/i, '<$1 tabindex="0"');
    }
    return h;
  }
  if (ruleId === 'bypass') {
    return `${h}\n<!-- 예: <a href="#content">본문 바로가기</a> -->`;
  }
  return h;
}

export type AlternativeFix = { label: string; code: string };

export function alternativeFixes(ruleIds: string[], html: string): AlternativeFix[] {
  const out: AlternativeFix[] = [];
  if (ruleIds.includes('ko-blank-link-title')) {
    out.push({ label: 'aria-label에 새창 안내 넣기', code: withAriaNewWindowHint(html) });
    out.push({ label: '화면에서 숨긴 안내 문구 넣기', code: withHiddenNewWindowText(html) });
  }
  if (ruleIds.includes('label')) {
    out.push({ label: 'aria-label로 입력칸 이름 넣기', code: withInputAriaLabel(html) });
  }
  if (ruleIds.includes('ko-linked-img-empty-alt')) {
    out.push({
      label: '숨김 텍스트를 두고 이미지는 alt=""',
      code: withControlBlindText(html),
    });
  }
  if (ruleIds.includes('video-caption')) {
    out.push({
      label: '영상 대본 링크 제공하기',
      code: `${html}\n<p><a href="#transcript">영상 대본 보기</a></p>`,
    });
  }
  return out;
}

export function suggestFixedHtmlAll(ruleIds: string[], html: string): string {
  return ruleIds
    .filter((id) => !isMethodOnlyFix(id))
    .reduce((out, id) => suggestFixedHtml(id, out), html || '');
}

const PRIMARY_FIX_LABEL: Record<string, string> = {
  'image-alt': 'alt에 이미지 설명 넣기',
  'ko-linked-img-empty-alt': '컨트롤 이미지에 비어 있지 않은 alt 넣기',
  'ko-blank-link-title': 'title에 새창열림 안내 넣기',
  'link-name': 'aria-label로 링크 목적 넣기',
  'button-name': 'aria-label로 버튼 이름 넣기',
  'html-has-lang': 'html에 lang="ko" 지정하기',
  'color-contrast':
    '이 텍스트의 전경·배경 명도 대비를 일반 텍스트 4.5:1(큰 텍스트는 3:1) 이상이 되도록 조정하세요',
  'label-content-name-mismatch': '보이는 이름과 aria-label 맞추기',
  label: 'label 태그로 입력칸 이름 연결하기',
  'meta-refresh': 'meta refresh 자동 이동·새로고침 제거하기',
  blink: 'blink·marquee 제거하고 일반 콘텐츠로 바꾸기',
  'video-caption': 'video에 한국어 자막 track 연결하기',
  'no-autoplay-audio': 'autoplay 속성 제거하기',
  'wa-10-keyboard': '키보드로 초점·활성화할 수 있게 속성·구조를 점검하기',
  'wa-11-focus': 'tabindex·outline을 조정해 초점 이동·표시를 확보하기',
  'wa-12-target-size':
    '이 컨트롤의 클릭·터치 영역을 최소 24×24 CSS px(권장 44×44) 이상이 되도록 조정하세요',
  bypass: '본문 바로가기(skip) 링크 제공하기',
};

export function primaryFixLabel(ruleIds: string[]): string {
  const parts = Array.from(
    new Set(ruleIds.map((id) => PRIMARY_FIX_LABEL[id]).filter(Boolean) as string[]),
  );
  return parts.join(' · ') || '접근성 기준에 맞게 수정하기';
}

/** 카드 맨 아래 수동 확인 권유 */
export function manualCheckTip(ruleIds: string[]): string | null {
  const tips: string[] = [];
  if (ruleIds.some((id) => id === 'wa-10-keyboard' || id === 'wa-11-focus')) {
    tips.push(
      '키보드(Tab / Shift+Tab / Enter·Space / Esc)로 해당 구간을 직접 조작·이동하며 순서와 초점 표시를 확인해 보세요.',
    );
  }
  if (ruleIds.includes('video-caption')) {
    tips.push('자막 내용이 대사와 맞는지, 필요 시 대본·수어가 있는지도 확인해 보세요.');
  }
  if (ruleIds.includes('no-autoplay-audio')) {
    tips.push('스크립트가 로드 직후 play()를 호출하는지도 확인해 보세요.');
  }
  return tips.length ? tips.join(' ') : null;
}
