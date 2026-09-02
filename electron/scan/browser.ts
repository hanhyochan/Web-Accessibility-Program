import path from 'node:path';
import { chromium, type Browser } from 'playwright';

function ensureBrowsersPath() {
  if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
    const local =
      process.env.LOCALAPPDATA ||
      path.join(process.env.USERPROFILE || '', 'AppData', 'Local');
    process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(local, 'ms-playwright');
  }
}

/**
 * Cursor 샌드박스 캐시에만 브라우저가 있으면 Electron에서 못 찾음.
 * 1) 설치된 Chrome  2) Edge  3) Playwright Chromium 순으로 시도.
 */
export async function launchBrowser(): Promise<Browser> {
  ensureBrowsersPath();

  const attempts: Array<{ label: string; run: () => Promise<Browser> }> = [
    {
      label: 'chrome',
      run: () => chromium.launch({ headless: true, channel: 'chrome' }),
    },
    {
      label: 'msedge',
      run: () => chromium.launch({ headless: true, channel: 'msedge' }),
    },
    {
      label: 'chromium',
      run: () => chromium.launch({ headless: true }),
    },
  ];

  const errors: string[] = [];
  for (const a of attempts) {
    try {
      return await a.run();
    } catch (err) {
      errors.push(`${a.label}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  throw new Error(
    `브라우저를 실행할 수 없습니다. Chrome 또는 Edge를 설치하거나, 프로젝트 폴더에서 "npx playwright install chromium"을 실행하세요.\n${errors.join('\n')}`,
  );
}
