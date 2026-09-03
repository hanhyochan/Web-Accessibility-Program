import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { CrawlPage } from './crawl';

const PAGE_EXT = new Set(['.html', '.htm', '.xhtml', '.jsp', '.jspf']);
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'target',
  'ckeditor',
  '.svn',
  '.idea',
]);

function walkPageFiles(dir: string, out: string[], maxPages: number) {
  if (out.length >= maxPages) return;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    if (out.length >= maxPages) return;
    const name = ent.name;
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(name.toLowerCase())) continue;
      walkPageFiles(path.join(dir, name), out, maxPages);
    } else if (ent.isFile() && PAGE_EXT.has(path.extname(name).toLowerCase())) {
      out.push(path.join(dir, name));
    }
  }
}

function findWebRoot(filePath: string, sourceRoot: string): string | null {
  const markers = ['webapp', 'WebContent', 'public'];
  const parts = path.normalize(filePath).split(path.sep);
  for (let i = parts.length - 2; i >= 0; i--) {
    if (markers.includes(parts[i])) {
      return parts.slice(0, i + 1).join(path.sep);
    }
  }
  const base = path.basename(sourceRoot).toLowerCase();
  if (markers.map((m) => m.toLowerCase()).includes(base)) return sourceRoot;
  return null;
}

function toHttpUrl(filePath: string, startUrl: string, sourceRoot: string): string | null {
  try {
    const origin = new URL(startUrl).origin;
    const webRoot = findWebRoot(filePath, sourceRoot);
    if (!webRoot) return null;
    const rel = path.relative(webRoot, filePath).split(path.sep).join('/');
    if (!rel || rel.startsWith('..')) return null;
    if (/(^|\/)WEB-INF(\/|$)/i.test(rel)) return null;
    return `${origin}/${rel.replace(/^\//, '')}`;
  } catch {
    return null;
  }
}

function isServerPageExt(ext: string) {
  return ext === '.jsp' || ext === '.jspf';
}

/** 로컬 폴더의 HTML/JSP를 페이지 목록으로 수집 (HTML=file://, JSP는 startUrl 있으면 http 매핑) */
export function scanSourceFolder(options: {
  sourceRoot: string;
  maxPages: number;
  startUrl?: string;
}): { pages: CrawlPage[]; note: string } {
  const root = options.sourceRoot;
  if (!root || !fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new Error('코드 폴더를 찾을 수 없습니다.');
  }

  const files: string[] = [];
  walkPageFiles(root, files, options.maxPages);

  const startUrl = (options.startUrl || '').trim();
  let htmlCount = 0;
  let jspMapped = 0;
  let jspBlocked = 0;

  const pages: CrawlPage[] = files.map((file) => {
    const ext = path.extname(file).toLowerCase();
    if (!isServerPageExt(ext)) {
      htmlCount += 1;
      return {
        url: pathToFileURL(file).href,
        depth: 0,
        status: 'ok' as const,
        discoveredFrom: '(로컬 폴더)',
        included: true,
      };
    }

    if (startUrl) {
      const mapped = toHttpUrl(file, startUrl, root);
      if (mapped) {
        jspMapped += 1;
        return {
          url: mapped,
          depth: 0,
          status: 'ok' as const,
          discoveredFrom: '(로컬 폴더·JSP)',
          // JSP→HTTP 매핑은 .do 등 실제 라우트와 다를 수 있어 기본 비선택
          included: false,
        };
      }
    }

    jspBlocked += 1;
    const failReason = startUrl
      ? 'WEB-INF 등 직접 URL 불가 JSP'
      : 'JSP는 사이트 주소 필요(폴더만으로는 axe 검사 불가)';
    return {
      url: pathToFileURL(file).href,
      depth: 0,
      status: 'fail' as const,
      discoveredFrom: '(로컬 폴더·JSP)',
      included: false,
      failReason,
    };
  });

  const includable = pages.filter((p) => p.included).length;
  const noteParts = [
    `로컬 폴더 · ${pages.length}개 발견`,
    `HTML ${htmlCount}`,
    `JSP매핑 ${jspMapped}`,
    `JSP제외 ${jspBlocked}`,
    `검사가능 ${includable}`,
  ];
  if (includable === 0 && jspBlocked > 0 && !startUrl) {
    noteParts.push('시작 URL을 넣거나 URL 크롤을 사용하세요');
  }

  return {
    pages,
    note: noteParts.join(' · '),
  };
}
