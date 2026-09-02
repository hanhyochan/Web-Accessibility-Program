import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright';

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

const AUTO_FIXABLE = new Set(['image-alt', 'ko-blank-link-title']);

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

export async function runRuleOnPages(options: {
  ruleId: string;
  pages: string[];
}): Promise<{ findings: Finding[]; note: string }> {
  const { ruleId, pages } = options;
  const findings: Finding[] = [];

  // html-validate는 별도 엔진 — 이번 단계에서 안내만
  if (ruleId === 'html-validate-recommended') {
    return {
      findings: [],
      note: 'HTML 문법 검사(html-validate)는 다음 단계에서 연결합니다',
    };
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    for (const url of pages) {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

        if (ruleId.startsWith('ko-')) {
          findings.push(...(await runCustomRule(page, ruleId, url)));
          continue;
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
  } finally {
    await browser.close();
  }

  return {
    findings,
    note: `axe · ${ruleId} · ${pages.length}페이지 · 위반 ${findings.length}건`,
  };
}
