import AxeBuilder from '@axe-core/playwright';
import { launchBrowser } from './browser';
import { collectDomCustomFindings } from './domCustomRules';

export type Finding = {
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

export type ScanProgress = {
  ruleIndex: number;
  ruleTotal: number;
  ruleId: string;
  pageIndex: number;
  pageTotal: number;
  currentUrl: string;
};

const AUTO_FIXABLE = new Set(['image-alt', 'ko-blank-link-title', 'ko-linked-img-empty-alt']);

/** wa-* 중 DOM으로 확정 검사하는 항목 (수동 스킵 제외) */
const DOM_CUSTOM_RULES = new Set(['wa-10-keyboard', 'wa-11-focus', 'wa-12-target-size']);

function isManualRule(ruleId: string): boolean {
  if (DOM_CUSTOM_RULES.has(ruleId)) return false;
  return (
    ruleId === 'html-validate-recommended' ||
    ruleId === 'compat-html' ||
    ruleId.startsWith('wa-') ||
    ruleId.startsWith('compat-')
  );
}

function isDomBundleRule(ruleId: string): boolean {
  return (
    ruleId === 'ko-linked-img-empty-alt' ||
    DOM_CUSTOM_RULES.has(ruleId)
  );
}

function isTransientScanError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /Execution context was destroyed|Target closed|Navigation|Protocol error|most likely because of a navigation/i.test(
    msg,
  );
}

function suggestFixedHtml(ruleId: string, html: string): string {
  const h = html || '';
  if (ruleId === 'image-alt' || ruleId === 'ko-linked-img-empty-alt') {
    if (/alt\s*=\s*["']\s*["']/.test(h)) return h.replace(/alt\s*=\s*["']\s*["']/, 'alt="이미지 설명"');
    if (!/\salt\s*=/i.test(h)) return h.replace(/<img\b/i, '<img alt="이미지 설명"');
    return h;
  }
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
  if (ruleId === 'label') {
    const type = h.match(/\btype\s*=\s*["']([^"']*)["']/i)?.[1] || '';
    const name = h.match(/\bname\s*=\s*["']([^"']*)["']/i)?.[1] || '';
    const idAttr = h.match(/\bid\s*=\s*["']([^"']*)["']/i)?.[1] || '';
    const key = `${type} ${name} ${idAttr}`.toLowerCase();
    const text = /password|pswd|pwd|passwd/.test(key)
      ? '비밀번호'
      : /email|mail/.test(key)
        ? '이메일'
        : /\b(user)?id\b|login|userid/.test(key)
          ? '아이디'
          : '입력 항목';
    if (/<label\b/i.test(h)) return h;
    if (idAttr) return `<label for="${idAttr}">${text}</label>\n${h}`;
    return `<label>${text} ${h}</label>`;
  }
  if (ruleId === 'html-has-lang') {
    if (/\slang\s*=/i.test(h)) return h.replace(/\slang\s*=\s*["'][^"']*["']/, ' lang="ko"');
    return h.replace(/<html\b/i, '<html lang="ko"');
  }
  if (ruleId === 'color-contrast') {
    return `${h} <!-- 전경·배경 명도 대비를 4.5:1 이상으로 조정 -->`;
  }
  if (ruleId === 'label-content-name-mismatch') {
    return h.replace(/\saria-label\s*=\s*["'][^"']*["']/, '');
  }
  return h;
}

function normalizeAttrValue(v: string) {
  return v
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function blankLinkKey(f: { htmlSnippet: string; locationLabel?: string; selector?: string }) {
  const href = f.htmlSnippet.match(/\bhref\s*=\s*["']([^"']*)["']/i)?.[1];
  const norm = href ? normalizeAttrValue(href) : '';
  const weak =
    !norm ||
    norm === '#' ||
    /^#none$/i.test(norm) ||
    /^\/#none$/i.test(norm) ||
    /^javascript:/i.test(norm);
  if (norm && !weak) return `a:${norm}`;
  if (f.selector && f.selector !== 'a[target="_blank"]') return `sel:${f.selector}`;
  if (f.locationLabel) return `loc:${f.locationLabel}\0${f.htmlSnippet.slice(0, 160)}`;
  return `html:${f.htmlSnippet}`;
}

function hasTargetBlank(html: string) {
  return /target\s*=\s*(["']?)_blank\1/i.test(html);
}

function snippetHasNewWindowHint(html: string) {
  const title = html.match(/\btitle\s*=\s*["']([^"']*)["']/i)?.[1] || '';
  const aria = html.match(/\baria-label\s*=\s*["']([^"']*)["']/i)?.[1] || '';
  return /새\s*창|새창열림/.test(title) || /새\s*창|새창열림/.test(aria);
}

/** axe가 잡은 target=_blank 링크에 새창 안내 오류가 빠지지 않게 보완 */
function ensureBlankLinkFindings(url: string, findings: Finding[]): Finding[] {
  const existing = new Set(
    findings.filter((f) => f.ruleId === 'ko-blank-link-title').map((f) => blankLinkKey(f)),
  );
  const extras: Finding[] = [];
  for (const f of findings) {
    if (f.ruleId === 'ko-blank-link-title') continue;
    if (!hasTargetBlank(f.htmlSnippet)) continue;
    if (snippetHasNewWindowHint(f.htmlSnippet)) continue;
    const key = blankLinkKey(f);
    if (existing.has(key)) continue;
    existing.add(key);
    const html = f.htmlSnippet;
    extras.push({
      id: `ko-blank-link-title-${url}-sup-${extras.length}`,
      ruleId: 'ko-blank-link-title',
      engine: 'axe-custom',
      url,
      selector: f.selector || 'a[target="_blank"]',
      locationLabel: f.locationLabel,
      message:
        'target="_blank" 링크에 새 창 열림 안내(title·aria-label·숨김 텍스트)가 없습니다',
      impact: 'serious',
      htmlSnippet: html,
      fixedSnippet: suggestFixedHtml('ko-blank-link-title', html),
      autoFixable: true,
    });
  }
  return extras.length ? findings.concat(extras) : findings;
}

/** 브라우저 컨텍스트에서 요소 위치 설명 생성 */
async function describeTargets(
  page: import('playwright').Page,
  items: Array<{ target: string[]; html: string }>,
): Promise<string[]> {
  return page.evaluate((list) => {
    const nameOf = (el: Element) => {
      const tag = el.tagName.toLowerCase();
      if (tag === 'img') return '이미지';
      if (tag === 'a') return '링크';
      if (tag === 'button') return '버튼';
      if (tag === 'input') return '입력칸';
      if (tag === 'ul' || tag === 'ol') return '목록';
      if (tag === 'li') return '목록 항목';
      if (tag === 'div') return '영역';
      if (tag === 'span') return '텍스트';
      if (tag === 'section') return '섹션';
      if (tag === 'nav') return '내비게이션';
      if (tag === 'header') return '헤더';
      if (tag === 'footer') return '푸터';
      if (tag === 'main') return '본문';
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

    const fromTarget = (target: string[]) => {
      try {
        if (!target.length) return null;
        let el: Element | null = document.querySelector(target[0]);
        for (let i = 1; i < target.length && el; i++) {
          el = el.querySelector(target[i]) || document.querySelector(target[i]);
        }
        return el;
      } catch {
        return null;
      }
    };

    const fromHtml = (html: string) => {
      const src = html.match(/src=["']([^"']+)/)?.[1];
      if (src) {
        const img = Array.from(document.querySelectorAll('img')).find((i) =>
          (i.getAttribute('src') || '').includes(src.slice(-40)),
        );
        if (img) return img;
      }
      const href = html.match(/href=["']([^"']+)/)?.[1];
      if (href) {
        const a = Array.from(document.querySelectorAll('a')).find(
          (i) => (i.getAttribute('href') || '') === href,
        );
        if (a) return a;
      }
      return null;
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

      const grand = parent.parentElement;
      if (grand && grand !== document.documentElement) {
        const grandTokens = classTokens(grand);
        const parentNth = Math.max(1, Array.from(grand.children).indexOf(parent) + 1);
        if (grandTokens.length) {
          return `.${grandTokens.join('.')} 클래스를 가진 조상의 ${parentNth}번째 자식(${nameOf(parent)})의 ${nth}번째 자식의 ${objBit}`;
        }
      }

      return `${classedNoun(parent, nameOf(parent))}의 ${nth}번째 자식의 ${objBit}`;
    };

    return list.map((item) => {
      const el = fromTarget(item.target) || fromHtml(item.html);
      return el ? describe(el) : item.target.join(' › ') || '위치를 특정할 수 없음';
    });
  }, items);
}

/** axe에 없는 한국형 규칙 */
async function runCustomRule(
  page: import('playwright').Page,
  ruleId: string,
  url: string,
): Promise<Finding[]> {
  if (ruleId === 'ko-blank-link-title') {
    const nodes = await page.evaluate(() => {
      const NEW_WINDOW_HINT = /새\s*창|새창열림/;
      const nameOf = (el: Element) => {
        const tag = el.tagName.toLowerCase();
        if (tag === 'img') return '이미지';
        if (tag === 'a') return '링크';
        if (tag === 'button') return '버튼';
        if (tag === 'ul' || tag === 'ol') return '목록';
        if (tag === 'li') return '목록 항목';
        if (tag === 'div') return '영역';
        if (tag === 'span') return '텍스트';
        if (tag === 'section') return '섹션';
        if (tag === 'nav') return '내비게이션';
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
        const grand = parent.parentElement;
        if (grand && grand !== document.documentElement) {
          const grandTokens = classTokens(grand);
          const parentNth = Math.max(1, Array.from(grand.children).indexOf(parent) + 1);
          if (grandTokens.length) {
            return `.${grandTokens.join('.')} 클래스를 가진 조상의 ${parentNth}번째 자식(${nameOf(parent)})의 ${nth}번째 자식의 ${objBit}`;
          }
        }
        return `${classedNoun(parent, nameOf(parent))}의 ${nth}번째 자식의 ${objBit}`;
      };

      const isVisuallyHidden = (el: Element) => {
        const cls = typeof (el as HTMLElement).className === 'string' ? (el as HTMLElement).className : '';
        if (/\b(blind|sr-only|visually-hidden|hide|hidden|skip|a11y-hidden)\b/i.test(cls)) return true;
        const s = window.getComputedStyle(el);
        if (s.position !== 'absolute' && s.position !== 'fixed') return false;
        if (/rect\(\s*0/.test(s.clip)) return true;
        if (s.overflow === 'hidden' && (parseFloat(s.width) <= 1 || parseFloat(s.height) <= 1)) return true;
        if (parseFloat(s.left) < -100 || parseFloat(s.top) < -100) return true;
        if (s.clipPath && s.clipPath !== 'none') return true;
        return false;
      };

      const hasNewWindowHint = (a: Element) => {
        const title = a.getAttribute('title') || '';
        const aria = a.getAttribute('aria-label') || '';
        if (NEW_WINDOW_HINT.test(title) || NEW_WINDOW_HINT.test(aria)) return true;
        for (const child of Array.from(a.querySelectorAll('*'))) {
          const text = (child.textContent || '').replace(/\s+/g, ' ').trim();
          if (!NEW_WINDOW_HINT.test(text)) continue;
          if (isVisuallyHidden(child)) return true;
        }
        return false;
      };

      const collectBlankLinks = () => {
        const out: Element[] = [];
        const visit = (root: Document | ShadowRoot) => {
          for (const a of Array.from(root.querySelectorAll('a[target]'))) {
            if ((a.getAttribute('target') || '').trim().toLowerCase() === '_blank') out.push(a);
          }
          for (const el of Array.from(root.querySelectorAll('*'))) {
            const sr = (el as HTMLElement).shadowRoot;
            if (sr) visit(sr);
          }
        };
        visit(document);
        return out;
      };

      return collectBlankLinks().map((a, index, all) => ({
        html: a.outerHTML.slice(0, 500),
        ok: hasNewWindowHint(a),
        locationLabel: describe(a),
        index,
        total: all.length,
        name: nameOf(a),
      }));
    });

    return nodes
      .filter((n) => !n.ok)
      .map((n, i) => {
        const html = n.html;
        return {
          id: `${ruleId}-${url}-${i}`,
          ruleId,
          engine: 'axe-custom',
          url,
          selector: 'a[target="_blank"]',
          locationLabel: n.locationLabel,
          message:
            'target="_blank" 링크에 새 창 열림 안내(title·aria-label·숨김 텍스트)가 없습니다',
          impact: 'serious',
          htmlSnippet: html,
          fixedSnippet: suggestFixedHtml(ruleId, html),
          autoFixable: true,
        };
      });
  }

  if (ruleId === 'ko-linked-img-empty-alt') {
    // collectDomCustomFindings 에서 처리
    return [];
  }

  return [];
}

async function collectAxeFindings(
  page: import('playwright').Page,
  url: string,
  violations: Array<{
    id: string;
    help?: string;
    description?: string;
    impact?: string | null;
    nodes: Array<{ target?: string[]; html?: string }>;
  }>,
): Promise<Finding[]> {
  const draft: Array<{
    ruleId: string;
    impact: string;
    target: string[];
    html: string;
    message: string;
  }> = [];

  for (const v of violations) {
    for (const node of v.nodes) {
      draft.push({
        ruleId: v.id,
        impact: v.impact || 'moderate',
        target: node.target || [],
        html: (node.html || '').slice(0, 500),
        message: v.help || v.description || v.id,
      });
    }
  }

  const locations = await describeTargets(
    page,
    draft.map((d) => ({ target: d.target, html: d.html })),
  );

  return draft.map((d, i) => ({
    id: `${d.ruleId}-${url}-${i}`,
    ruleId: d.ruleId,
    engine: 'axe',
    url,
    selector: d.target.join(' '),
    locationLabel: locations[i],
    message: d.message,
    impact: d.impact,
    htmlSnippet: d.html,
    fixedSnippet: suggestFixedHtml(d.ruleId, d.html),
    autoFixable: AUTO_FIXABLE.has(d.ruleId),
  }));
}

async function openPage(page: import('playwright').Page, url: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForLoadState('load', { timeout: 15000 }).catch(() => undefined);
  await new Promise((r) => setTimeout(r, 400));
}

async function scanOnePage(
  page: import('playwright').Page,
  url: string,
  axeRuleIds: string[],
  customRuleIds: string[],
  onProgress?: (partial: { ruleId: string; ruleIndex: number }) => void,
): Promise<Finding[]> {
  let findings: Finding[] = [];

  const runOnce = async () => {
    findings = [];
    await openPage(page, url);

    if (axeRuleIds.length > 0) {
      onProgress?.({ ruleId: axeRuleIds[0], ruleIndex: 1 });
      const results = await new AxeBuilder({ page }).withRules(axeRuleIds).analyze();
      findings.push(...(await collectAxeFindings(page, url, results.violations)));
      onProgress?.({
        ruleId: axeRuleIds[axeRuleIds.length - 1],
        ruleIndex: axeRuleIds.length,
      });
    }

    for (let i = 0; i < customRuleIds.length; i++) {
      const ruleId = customRuleIds[i];
      if (isDomBundleRule(ruleId)) continue;
      onProgress?.({
        ruleId,
        ruleIndex: axeRuleIds.length + i + 1,
      });
      findings.push(...(await runCustomRule(page, ruleId, url)));
    }

    const domBundle = customRuleIds.filter(isDomBundleRule);
    if (domBundle.length > 0) {
      onProgress?.({
        ruleId: domBundle[0],
        ruleIndex: axeRuleIds.length + customRuleIds.length,
      });
      findings.push(...(await collectDomCustomFindings(page, url, domBundle)));
    }

    if (customRuleIds.includes('ko-blank-link-title')) {
      findings = ensureBlankLinkFindings(url, findings);
    }
  };

  try {
    await runOnce();
  } catch (err) {
    if (!isTransientScanError(err)) throw err;
    findings = [];
    await runOnce();
  }

  return findings;
}

export async function runRuleOnPages(options: {
  ruleId: string;
  pages: string[];
}): Promise<{ findings: Finding[]; note: string }> {
  return runRulesOnPages({ ruleIds: [options.ruleId], pages: options.pages });
}

export async function runRulesOnPages(options: {
  ruleIds: string[];
  pages: string[];
  onProgress?: (progress: ScanProgress) => void;
}): Promise<{ findings: Finding[]; note: string }> {
  const { ruleIds, pages } = options;
  const findings: Finding[] = [];
  const autoRules = ruleIds.filter((id) => !isManualRule(id));
  const manualCount = ruleIds.length - autoRules.length;
  const axeRuleIds = autoRules.filter((id) => !id.startsWith('ko-') && !DOM_CUSTOM_RULES.has(id));
  const customRuleIds = autoRules.filter((id) => id.startsWith('ko-') || DOM_CUSTOM_RULES.has(id));
  const ruleTotal = Math.max(axeRuleIds.length + customRuleIds.length, 1);

  if (autoRules.length === 0) {
    return {
      findings: [],
      note:
        manualCount > 0
          ? `수동·보류 항목 ${manualCount}개 (자동 검사 없음)`
          : '검사할 자동 규칙이 없습니다',
    };
  }

  if (pages.length === 0) {
    return { findings: [], note: '검사할 페이지가 없습니다' };
  }

  const browser = await launchBrowser();
  let context: import('playwright').BrowserContext | undefined;
  try {
    context = await browser.newContext({
      ignoreHTTPSErrors: true,
      locale: 'ko-KR',
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    });
    context.setDefaultNavigationTimeout(45000);
    const page = await context.newPage();

    for (let pi = 0; pi < pages.length; pi++) {
      const url = pages[pi];
      options.onProgress?.({
        ruleIndex: 0,
        ruleTotal,
        ruleId: '',
        pageIndex: pi + 1,
        pageTotal: pages.length,
        currentUrl: url,
      });

      try {
        const pageFindings = await scanOnePage(
          page,
          url,
          axeRuleIds,
          customRuleIds,
          ({ ruleId, ruleIndex }) => {
            options.onProgress?.({
              ruleIndex,
              ruleTotal,
              ruleId,
              pageIndex: pi + 1,
              pageTotal: pages.length,
              currentUrl: url,
            });
          },
        );
        findings.push(...pageFindings);
      } catch (err) {
        findings.push({
          id: `scan-error-${url}-${pi}`,
          ruleId: 'scan-error',
          engine: 'axe',
          url,
          selector: '',
          message: `페이지 검사 실패: ${err instanceof Error ? err.message : String(err)}`,
          impact: 'serious',
          htmlSnippet: '',
          autoFixable: false,
        });
      }

      options.onProgress?.({
        ruleIndex: ruleTotal,
        ruleTotal,
        ruleId: autoRules[autoRules.length - 1] || '',
        pageIndex: pi + 1,
        pageTotal: pages.length,
        currentUrl: url,
      });
    }
  } finally {
    await context?.close().catch(() => undefined);
    await browser.close();
  }

  const failCount = findings.filter((f) =>
    String(f.message).startsWith('페이지 검사 실패'),
  ).length;
  return {
    findings,
    note: `axe · 규칙 ${autoRules.length} · 페이지 ${pages.length} · 위반 ${findings.length - failCount} · 실패 ${failCount}${
      manualCount ? ` · 수동 ${manualCount}` : ''
    }`,
  };
}
