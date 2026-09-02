import { launchBrowser } from './browser';

export type CrawlPage = {
  url: string;
  depth: number;
  status: 'ok' | 'skip' | 'fail';
  discoveredFrom: string;
  included: boolean;
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
    // trailing slash normalize for root only
    let href = u.href;
    if (href.endsWith('/') && u.pathname !== '/') {
      href = href.slice(0, -1);
    }
    return href;
  } catch {
    return null;
  }
}

function shouldSkip(url: string, excludePatterns: string[]): boolean {
  const lower = url.toLowerCase();
  if (/\.(pdf|jpg|jpeg|png|gif|svg|zip|css|js|woff2?|ico)(\?|$)/i.test(lower)) return true;
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

      if (shouldSkip(cur.url, exclude)) {
        results.push({
          url: cur.url,
          depth: cur.depth,
          status: 'skip',
          discoveredFrom: cur.from,
          included: false,
        });
        report(cur.url);
        continue;
      }

      try {
        const res = await page.goto(cur.url, {
          waitUntil: 'domcontentloaded',
          timeout: 20000,
        });
        const ok = !!res && res.status() < 400;
        results.push({
          url: cur.url,
          depth: cur.depth,
          status: ok ? 'ok' : 'fail',
          discoveredFrom: cur.from,
          included: ok,
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
      } catch {
        results.push({
          url: cur.url,
          depth: cur.depth,
          status: 'fail',
          discoveredFrom: cur.from,
          included: false,
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
