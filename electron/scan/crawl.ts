import { launchBrowser } from './browser';

export type CrawlPage = {
  url: string;
  depth: number;
  status: 'ok' | 'skip' | 'fail';
  discoveredFrom: string;
  included: boolean;
  failReason?: string;
};

export type CrawlProgress = {
  found: number;
  maxPages: number;
  currentUrl: string;
};

function normalizeUrl(raw: string, base: string): string | null {
  try {
    const u = new URL(raw, base);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    u.hash = '';
    let href = u.href;
    if (href.endsWith('/') && u.pathname !== '/') {
      href = href.slice(0, -1);
    }
    return href;
  } catch {
    return null;
  }
}

function isStaticAsset(url: string): boolean {
  return /\.(pdf|jpg|jpeg|png|gif|svg|zip|css|js|woff2?|ico)(\?|$)/i.test(url);
}

function matchesExclude(url: string, excludePatterns: string[]): boolean {
  const lower = url.toLowerCase();
  return excludePatterns.some((p) => p && lower.includes(p.toLowerCase()));
}

export async function crawlSite(options: {
  startUrl: string;
  maxDepth: number;
  maxPages: number;
  excludePatterns?: string;
  onProgress?: (progress: CrawlProgress) => void;
}): Promise<{ pages: CrawlPage[]; note: string }> {
  const start = normalizeUrl(options.startUrl, options.startUrl);
  if (!start) throw new Error('시작 URL이 올바르지 않습니다.');

  const startHost = new URL(start).host;
  const exclude = (options.excludePatterns || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const browser = await launchBrowser();
  const context = await browser.newContext();
  const page = await context.newPage();

  const visited = new Set<string>();
  const results: CrawlPage[] = [];
  const queue: { url: string; depth: number; from: string }[] = [
    { url: start, depth: 0, from: '(시작)' },
  ];

  const report = (currentUrl: string) => {
    options.onProgress?.({
      found: results.length,
      maxPages: options.maxPages,
      currentUrl,
    });
  };

  try {
    while (queue.length > 0 && results.length < options.maxPages) {
      const cur = queue.shift()!;
      if (visited.has(cur.url)) continue;
      visited.add(cur.url);
      report(cur.url);

      if (isStaticAsset(cur.url)) {
        results.push({
          url: cur.url,
          depth: cur.depth,
          status: 'skip',
          discoveredFrom: cur.from,
          included: false,
          failReason: '미디어·파일',
        });
        report(cur.url);
        continue;
      }

      if (matchesExclude(cur.url, exclude)) {
        results.push({
          url: cur.url,
          depth: cur.depth,
          status: 'skip',
          discoveredFrom: cur.from,
          included: false,
          failReason: '검사 제외 페이지',
        });
        report(cur.url);
        continue;
      }

      try {
        const res = await page.goto(cur.url, {
          waitUntil: 'domcontentloaded',
          timeout: 20000,
        });
        const status = res?.status() ?? 0;
        const ok = !!res && status > 0 && status < 400;
        let failReason: string | undefined;
        if (!ok) {
          if (status === 401 || status === 403) failReason = '검사 제외 페이지';
          else if (status === 404) failReason = '페이지 없음(404)';
          else if (status >= 400) failReason = `HTTP ${status}`;
          else failReason = '응답 없음';
        }
        results.push({
          url: cur.url,
          depth: cur.depth,
          status: ok ? 'ok' : 'fail',
          discoveredFrom: cur.from,
          included: ok,
          failReason,
        });
        report(cur.url);

        if (!ok || cur.depth >= options.maxDepth) continue;

        const hrefs = await page.$$eval('a[href]', (as) =>
          as.map((a) => (a as HTMLAnchorElement).getAttribute('href') || ''),
        );

        for (const href of hrefs) {
          const next = normalizeUrl(href, cur.url);
          if (!next) continue;
          if (new URL(next).host !== startHost) continue;
          if (visited.has(next)) continue;
          if (queue.some((q) => q.url === next)) continue;
          if (results.length + queue.length >= options.maxPages) break;
          queue.push({
            url: next,
            depth: cur.depth + 1,
            from: new URL(cur.url).pathname || '/',
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const failReason = /timeout/i.test(msg)
          ? '접속 시간 초과'
          : /net::|NS_ERROR|Navigation/i.test(msg)
            ? '접속 실패'
            : '페이지 열기 실패';
        results.push({
          url: cur.url,
          depth: cur.depth,
          status: 'fail',
          discoveredFrom: cur.from,
          included: false,
          failReason,
        });
        report(cur.url);
      }
    }
  } finally {
    await browser.close();
  }

  return {
    pages: results,
    note: `Playwright 크롤 · ${results.length}페이지 (depth≤${options.maxDepth})`,
  };
}
