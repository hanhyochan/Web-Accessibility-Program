/** DOM으로 확정 가능한 커스텀·WA 보강 규칙 (운영·로컬 공통) */

export type DomFinding = {
  id: string;
  ruleId: string;
  engine: string;
  url: string;
  selector: string;
  locationLabel?: string;
  message: string;
  impact: string;
  htmlSnippet: string;
  fixedSnippet?: string;
  autoFixable: boolean;
};

const CONTROL_ROLES = new Set(['button', 'link', 'menuitem', 'tab', 'option']);

function suggestControlImgFix(html: string): string {
  const h = html || '';
  if (/<img\b[^>]*\salt\s*=\s*["']\s*["']/i.test(h)) {
    return h.replace(/\salt\s*=\s*["']\s*["']/, ' alt="대체 텍스트"');
  }
  if (/<img\b/i.test(h) && !/\salt\s*=/i.test(h)) {
    return h.replace(/<img\b/i, '<img alt="대체 텍스트"');
  }
  return h;
}

function suggestOutlineFix(html: string): string {
  return (html || '').replace(/outline\s*:\s*(none|0)\s*;?/gi, '').replace(/\sstyle="\s*"/i, '');
}

function suggestTabindexFix(html: string): string {
  return (html || '')
    .replace(/\s tabIndex\s*=\s*["']-?\d+["']/gi, '')
    .replace(/\s tabindex\s*=\s*["']-?\d+["']/gi, '');
}

/** 페이지에서 확정 가능한 DOM 이슈 수집 */
export async function collectDomCustomFindings(
  page: import('playwright').Page,
  url: string,
  ruleIds: string[],
): Promise<DomFinding[]> {
  const want = new Set(ruleIds);
  const raw = await page.evaluate((roles) => {
    const CONTROL_ROLES = new Set(roles);
    const nameOf = (el: Element) => {
      const tag = el.tagName.toLowerCase();
      if (tag === 'img') return '이미지';
      if (tag === 'a') return '링크';
      if (tag === 'button') return '버튼';
      if (tag === 'input') return '입력칸';
      if (tag === 'summary') return '요약';
      return tag;
    };
    const classTokens = (el: Element) => {
      const raw = typeof (el as HTMLElement).className === 'string' ? (el as HTMLElement).className : '';
      return raw.trim().split(/\s+/).filter(Boolean).slice(0, 3);
    };
    const classedNoun = (el: Element, noun: string) => {
      const tokens = classTokens(el);
      return tokens.length ? `.${tokens.join('.')} 클래스를 가진 ${noun}` : noun;
    };
    const describe = (el: Element) => {
      const objBit = classedNoun(el, nameOf(el));
      const parent = el.parentElement;
      if (!parent || parent === document.documentElement) return objBit;
      const nth = Math.max(1, Array.from(parent.children).indexOf(el) + 1);
      const parentTokens = classTokens(parent);
      if (parentTokens.length) {
        return `.${parentTokens.join('.')} 클래스를 가진 부모의 ${nth}번째 자식의 ${objBit}`;
      }
      return `${classedNoun(parent, nameOf(parent))}의 ${nth}번째 자식의 ${objBit}`;
    };

    const isControl = (el: Element) => {
      const tag = el.tagName.toLowerCase();
      if (tag === 'a' && el.hasAttribute('href')) return true;
      if (tag === 'button' || tag === 'summary') return true;
      const role = (el.getAttribute('role') || '').toLowerCase();
      return CONTROL_ROLES.has(role);
    };

    const controlHasName = (el: Element) => {
      if ((el.getAttribute('aria-label') || '').trim()) return true;
      if ((el.getAttribute('aria-labelledby') || '').trim()) return true;
      const clone = el.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('img, script, style, noscript, svg').forEach((n) => n.remove());
      return !!(clone.textContent || '').replace(/\s+/g, ' ').trim();
    };

    const disabledClass = (el: Element) => {
      const cls = typeof (el as HTMLElement).className === 'string' ? (el as HTMLElement).className : '';
      return /\b(off|disabled|dim|inactive|is-disabled|btn-off)\b/i.test(cls);
    };

    const focusable = (el: Element) => {
      const tag = el.tagName.toLowerCase();
      if ((el as HTMLInputElement).disabled) return false;
      const ti = el.getAttribute('tabindex');
      if (ti === '-1') return false;
      if (tag === 'a' && el.hasAttribute('href')) return true;
      if (tag === 'button' || tag === 'input' || tag === 'select' || tag === 'textarea') return true;
      if (ti !== null && Number(ti) >= 0) return true;
      return false;
    };

    type Row = {
      kind: string;
      html: string;
      locationLabel: string;
      selector: string;
      impact: string;
      message: string;
      w?: number;
      h?: number;
    };
    const rows: Row[] = [];

    // —— 컨트롤 안 img alt ——
    const controls = Array.from(document.querySelectorAll('a[href], button, summary, [role]')).filter(
      (el) => isControl(el),
    );
    for (const ctrl of controls) {
      const imgs = Array.from(ctrl.querySelectorAll(':scope img'));
      if (imgs.length === 0) continue;
      const named = controlHasName(ctrl);
      for (const img of imgs) {
        const hasAlt = img.hasAttribute('alt');
        const alt = img.getAttribute('alt');
        const empty = hasAlt && (alt || '') === '';
        const missing = !hasAlt;
        if (!named && (missing || empty)) {
          rows.push({
            kind: 'control-img-alt',
            html: ctrl.outerHTML.slice(0, 500),
            locationLabel: describe(ctrl),
            selector: ctrl.tagName.toLowerCase(),
            impact: 'serious',
            message:
              '컨트롤 안에 이미지만 있고 대체 텍스트(alt)가 없거나 비어 있습니다. 비어 있지 않은 alt를 넣거나, 컨트롤에 설명 텍스트를 두세요',
          });
        }
      }
    }

    // —— input type=image ——
    for (const input of Array.from(document.querySelectorAll('input[type="image"]'))) {
      const hasAlt = input.hasAttribute('alt');
      const alt = (input.getAttribute('alt') || '').trim();
      if (!hasAlt || !alt) {
        rows.push({
          kind: 'control-img-alt',
          html: input.outerHTML.slice(0, 500),
          locationLabel: describe(input),
          selector: 'input[type=image]',
          impact: 'serious',
          message: 'image 타입 입력에 비어 있지 않은 alt가 필요합니다',
        });
      }
    }

    // —— tabindex 양수 ——
    for (const el of Array.from(document.querySelectorAll('[tabindex]'))) {
      const n = Number(el.getAttribute('tabindex'));
      if (!Number.isFinite(n) || n < 1) continue;
      rows.push({
        kind: 'tabindex-positive',
        html: (el as HTMLElement).outerHTML.slice(0, 500),
        locationLabel: describe(el),
        selector: el.tagName.toLowerCase(),
        impact: 'serious',
        message: '양수 tabindex는 초점 순서를 어지럽힙니다. 제거하세요',
      });
    }

    // —— a[href] tabindex=-1 ——
    for (const a of Array.from(document.querySelectorAll('a[href]'))) {
      if (a.getAttribute('tabindex') !== '-1') continue;
      rows.push({
        kind: 'link-tabindex-neg',
        html: a.outerHTML.slice(0, 500),
        locationLabel: describe(a),
        selector: 'a[href]',
        impact: 'serious',
        message: '링크가 tabindex=-1 로 탭 순서에서 제외되어 있습니다',
      });
    }

    // —— role 컨트롤인데 초점 불가 ——
    for (const el of Array.from(document.querySelectorAll('[role]'))) {
      const role = (el.getAttribute('role') || '').toLowerCase();
      if (!CONTROL_ROLES.has(role)) continue;
      const tag = el.tagName.toLowerCase();
      if (tag === 'button' || tag === 'a' || tag === 'input') continue;
      if (focusable(el)) continue;
      rows.push({
        kind: 'role-not-focusable',
        html: (el as HTMLElement).outerHTML.slice(0, 500),
        locationLabel: describe(el),
        selector: `[role=${role}]`,
        impact: 'serious',
        message: `role="${role}" 요소가 키보드 초점을 받을 수 없습니다`,
      });
    }

    // —— 비활성 추정인데 초점 가능 (권장) ——
    const disabledCand = Array.from(
      document.querySelectorAll(
        '[aria-disabled="true"], .off, .disabled, .dim, .inactive, .is-disabled, .btn-off',
      ),
    );
    for (const el of disabledCand) {
      const ariaDis = (el.getAttribute('aria-disabled') || '').toLowerCase() === 'true';
      if (!ariaDis && !disabledClass(el)) continue;
      if ((el as HTMLInputElement).disabled) continue;
      if (!focusable(el)) continue;
      rows.push({
        kind: 'disabled-but-focusable',
        html: (el as HTMLElement).outerHTML.slice(0, 500),
        locationLabel: describe(el),
        selector: el.tagName.toLowerCase(),
        impact: 'serious',
        message:
          '비활성으로 보이는데 초점을 받을 수 있습니다. 키보드로 확인해 보세요',
      });
    }

    // —— outline none/0 (필수) ——
    const candidates = Array.from(
      document.querySelectorAll('a[href], button, input, select, textarea, [tabindex], [role=button], [role=link]'),
    );
    for (const el of candidates) {
      const s = window.getComputedStyle(el);
      const outlineStyle = s.outlineStyle;
      const outlineWidth = parseFloat(s.outlineWidth) || 0;
      if (outlineStyle === 'none' || outlineWidth === 0) {
        const inline = (el.getAttribute('style') || '').toLowerCase();
        const cls = typeof (el as HTMLElement).className === 'string' ? (el as HTMLElement).className : '';
        // 전역 리셋만 있는 페이지는 오탐 많음 → inline 또는 클래스명에 outline/focus 힌트가 있거나, :focus에서 none인 경우만
        let bad = /outline\s*:\s*(none|0)/i.test(inline);
        if (!bad && /\b(no-outline|outline-none|focus-none)\b/i.test(cls)) bad = true;
        if (!bad) {
          try {
            // :focus 계산은 불가에 가까워 computed가 none이면 브라우저 기본이 지워진 경우로 보고 critical — 오탐 줄이려 inline/클래스만
          } catch {
            /* ignore */
          }
        }
        if (!bad) continue;
        rows.push({
          kind: 'outline-none',
          html: (el as HTMLElement).outerHTML.slice(0, 500),
          locationLabel: describe(el),
          selector: el.tagName.toLowerCase(),
          impact: 'critical',
          message: '초점 윤곽(outline)이 제거되어 있습니다. 포커스 링이 보이게 하세요',
        });
      }
    }

    // —— 타겟 크기 24 / 44 ——
    const targets = Array.from(
      document.querySelectorAll('a[href], button, input, select, textarea, [role=button], [role=link], summary'),
    );
    for (const el of targets) {
      if ((el as HTMLInputElement).disabled) continue;
      if (el.closest('p, li, td, th, span') && el.tagName.toLowerCase() === 'a') {
        // 인라인 링크 예외(문장 안) — 부모에 다른 텍스트가 많으면 스킵
        const p = el.parentElement;
        if (p) {
          const t = (p.textContent || '').replace(/\s+/g, ' ').trim();
          const self = (el.textContent || '').replace(/\s+/g, ' ').trim();
          if (t.length > self.length + 8) continue;
        }
      }
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;
      const w = Math.round(r.width);
      const h = Math.round(r.height);
      if (w < 24 || h < 24) {
        rows.push({
          kind: 'target-size-24',
          html: (el as HTMLElement).outerHTML.slice(0, 500),
          locationLabel: describe(el),
          selector: el.tagName.toLowerCase(),
          impact: 'critical',
          message: `조작 영역이 24×24 CSS px 미만입니다 (${w}×${h})`,
          w,
          h,
        });
      } else if (w < 44 || h < 44) {
        rows.push({
          kind: 'target-size-44',
          html: (el as HTMLElement).outerHTML.slice(0, 500),
          locationLabel: describe(el),
          selector: el.tagName.toLowerCase(),
          impact: 'serious',
          message: `조작 영역이 44×44 CSS px 미만입니다 (${w}×${h}) · 권장`,
          w,
          h,
        });
      }
    }

    return rows;
  }, Array.from(CONTROL_ROLES));

  const out: DomFinding[] = [];
  let i = 0;
  for (const row of raw) {
    const mapKind = (kind: string): { ruleId: string; run: boolean } | null => {
      if (kind === 'control-img-alt' && want.has('ko-linked-img-empty-alt')) {
        return { ruleId: 'ko-linked-img-empty-alt', run: true };
      }
      if (
        (kind === 'tabindex-positive' ||
          kind === 'link-tabindex-neg' ||
          kind === 'outline-none') &&
        want.has('wa-11-focus')
      ) {
        return { ruleId: 'wa-11-focus', run: true };
      }
      if (
        (kind === 'role-not-focusable' || kind === 'disabled-but-focusable' || kind === 'link-tabindex-neg') &&
        want.has('wa-10-keyboard')
      ) {
        // link-tabindex-neg: 10과 11 둘 다 해당 — 11 우선, 10에도 있으면 10에도 넣지 않고 11만 (중복 방지)
        if (kind === 'link-tabindex-neg' && want.has('wa-11-focus')) return null;
        return { ruleId: 'wa-10-keyboard', run: true };
      }
      if ((kind === 'target-size-24' || kind === 'target-size-44') && want.has('wa-12-target-size')) {
        return { ruleId: 'wa-12-target-size', run: true };
      }
      return null;
    };

    const m = mapKind(row.kind);
    if (!m) continue;

    let fixed = row.html;
    if (row.kind === 'control-img-alt') fixed = suggestControlImgFix(row.html);
    else if (row.kind === 'outline-none') fixed = suggestOutlineFix(row.html);
    else if (row.kind === 'tabindex-positive' || row.kind === 'link-tabindex-neg') {
      fixed = suggestTabindexFix(row.html);
    } else if (row.kind === 'target-size-24' || row.kind === 'target-size-44') {
      fixed = ''; // 방법 멘트만 (UI)
    } else if (row.kind === 'role-not-focusable') {
      fixed = row.html.includes('tabindex')
        ? row.html
        : row.html.replace(/^<([a-z0-9]+)/i, '<$1 tabindex="0"');
    }

    out.push({
      id: `${m.ruleId}-${url}-${i++}`,
      ruleId: m.ruleId,
      engine: 'axe-custom',
      url,
      selector: row.selector,
      locationLabel: row.locationLabel,
      message: row.message,
      impact: row.impact,
      htmlSnippet: row.html,
      fixedSnippet: fixed || undefined,
      autoFixable: row.kind === 'control-img-alt' || row.kind.startsWith('tabindex') || row.kind === 'link-tabindex-neg',
    });
  }

  return out;
}
