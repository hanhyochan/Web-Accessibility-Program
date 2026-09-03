import AxeBuilder from '@axe-core/playwright';
import { launchBrowser } from './browser';

export type Finding = {
  id: string;
  ruleId: string;
  engine: string;
  url: string;
  selector: string;
  message: string;
  impact: string;
  htmlSnippet: string;
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

const AUTO_FIXABLE = new Set(['image-alt', 'ko-blank-link-title']);

function isManualRule(ruleId: string): boolean {
  return (
    ruleId === 'html-validate-recommended' ||
    ruleId === 'compat-html' ||
    ruleId.startsWith('wa-') ||
    ruleId.startsWith('compat-')
  );
}

/** axe에 없는 한국형 규칙 */
async function runCustomRule(
  page: import('playwright').Page,
  ruleId: string,
  url: string,
): Promise<Finding[]> {
  if (ruleId === 'ko-blank-link-title') {
    const nodes = await page.$$eval('a[target="_blank"]', (els) =>
      els.map((el) => {
        const a = el as HTMLAnchorElement;
        const title = a.getAttribute('title') || '';
        return {
          selector: a.outerHTML.slice(0, 120),
          html: a.outerHTML.slice(0, 200),
          ok: /새창/.test(title),
        };
      }),
    );
    return nodes
      .filter((n) => !n.ok)
      .map((n, i) => ({
        id: `${ruleId}-${url}-${i}`,
        ruleId,
        engine: 'axe-custom',
        url,
        selector: 'a[target="_blank"]',
        message: '새창 링크에 title에 "새창" 안내가 없습니다',
        impact: 'serious',
        htmlSnippet: n.html,
        autoFixable: true,
      }));
  }
  return [];
}

async function collectRuleFindings(
  page: import('playwright').Page,
  ruleId: string,
  url: string,
  findings: Finding[],
): Promise<void> {
  if (ruleId.startsWith('ko-')) {
    findings.push(...(await runCustomRule(page, ruleId, url)));
    return;
  }

  const results = await new AxeBuilder({ page }).withRules([ruleId]).analyze();
  for (const v of results.violations) {
    for (let ni = 0; ni < v.nodes.length; ni++) {
      const node = v.nodes[ni];
      findings.push({
        id: `${ruleId}-${url}-${ni}-${findings.length}`,
        ruleId: v.id,
        engine: 'axe',
        url,
        selector: node.target?.join(' ') || '',
        message: v.help || v.description,
        impact: v.impact || 'moderate',
        htmlSnippet: (node.html || '').slice(0, 240),
        autoFixable: AUTO_FIXABLE.has(v.id),
      });
    }
  }
}

/** 단일 규칙 (하위 호환) */
export async function runRuleOnPages(options: {
  ruleId: string;
  pages: string[];
}): Promise<{ findings: Finding[]; note: string }> {
  return runRulesOnPages({ ruleIds: [options.ruleId], pages: options.pages });
}

/**
 * 페이지마다 1회 접속 후 규칙을 순회.
 * 브라우저를 규칙마다 다시 띄우지 않음 (@axe-core/playwright는 context page 필요).
 */
export async function runRulesOnPages(options: {
  ruleIds: string[];
  pages: string[];
  onProgress?: (progress: ScanProgress) => void;
}): Promise<{ findings: Finding[]; note: string }> {
  const { ruleIds, pages } = options;
  const findings: Finding[] = [];
  const autoRules = ruleIds.filter((id) => !isManualRule(id));
  const manualCount = ruleIds.length - autoRules.length;

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
    });
    const page = await context.newPage();

    for (let pi = 0; pi < pages.length; pi++) {
      const url = pages[pi];
      let opened = false;
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        opened = true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        for (const ruleId of autoRules) {
          findings.push({
            id: `${ruleId}-${url}-error`,
            ruleId,
            engine: 'axe',
            url,
            selector: '',
            message: `페이지 검사 실패: ${msg}`,
            impact: 'serious',
            htmlSnippet: '',
            autoFixable: false,
          });
        }
        options.onProgress?.({
          ruleIndex: autoRules.length,
          ruleTotal: autoRules.length,
          ruleId: autoRules[autoRules.length - 1] || '',
          pageIndex: pi + 1,
          pageTotal: pages.length,
          currentUrl: url,
        });
        continue;
      }

      for (let ri = 0; ri < autoRules.length; ri++) {
        const ruleId = autoRules[ri];
        options.onProgress?.({
          ruleIndex: ri + 1,
          ruleTotal: autoRules.length,
          ruleId,
          pageIndex: pi + 1,
          pageTotal: pages.length,
          currentUrl: url,
        });
        if (!opened) continue;
        try {
          await collectRuleFindings(page, ruleId, url, findings);
        } catch (err) {
          findings.push({
            id: `${ruleId}-${url}-error`,
            ruleId,
            engine: 'axe',
            url,
            selector: '',
            message: `페이지 검사 실패: ${err instanceof Error ? err.message : String(err)}`,
            impact: 'serious',
            htmlSnippet: '',
            autoFixable: false,
          });
        }
      }
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
