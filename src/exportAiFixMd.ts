import {
  alternativeFixes,
  findingTitle,
  impactLabel,
  isMethodOnlyFix,
  primaryFixLabel,
  suggestFixedHtml,
} from './findingsUi';
import { RULE_CATALOG } from './rules/catalog';
import type { Finding } from './types';

function ruleLabel(ruleId: string) {
  return RULE_CATALOG.find((r) => r.id === ruleId)?.label || ruleId;
}

function fence(lang: string, code: string) {
  const body = (code || '').trim() || '(코드 없음)';
  return '```' + lang + '\n' + body + '\n```';
}

function dontTouchLines(ruleId: string): string[] {
  const common = [
    '이 오류와 무관한 파일·컴포넌트·스타일 변경',
    '문서에 없는 리팩터링·포맷·이름 변경',
  ];
  if (ruleId === 'image-alt' || ruleId === 'ko-linked-img-empty-alt') {
    return ['이미지 src·불필요한 class·주변 레이아웃 변경', ...common];
  }
  if (ruleId === 'link-name' || ruleId === 'ko-blank-link-title') {
    return ['href·불필요한 class 변경', '같은 문구를 전역으로 일괄 치환', ...common];
  }
  if (ruleId === 'color-contrast' || ruleId === 'wa-12-target-size') {
    return ['디자인 전체를 바꾸지 말고 해당 요소만 기준에 맞게 조정', ...common];
  }
  return common;
}

function doneLines(ruleId: string): string[] {
  if (isMethodOnlyFix(ruleId)) {
    return ['해당 요소가 기준(수치·비율)을 만족함', '다른 요소·전역 테마를 건드리지 않음'];
  }
  return ['해당 선택자·오류 지점만 기준에 맞게 수정됨', '동일 선택자 외 마크업·로직 변경 없음'];
}

/** AI에 넣어 오류만 고치게 하는 수정 지시서 Markdown */
export function buildAiFixMarkdown(options: {
  projectName: string;
  startUrl: string;
  exportedAt: string;
  findings: Finding[];
}): string {
  const { projectName, startUrl, exportedAt, findings } = options;
  const lines: string[] = [];

  lines.push('# 웹접근성 오류 수정 지시서');
  lines.push('');
  lines.push('> 이 파일을 AI(코딩 에이전트)에 그대로 넣고, **아래 오류만** 수정하세요.');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 0. AI 작업 규칙 (필수)');
  lines.push('');
  lines.push(
    '1. **이 문서에 적힌 오류만** 수정한다. 문서에 없는 리팩터링·포맷·이름 변경·의존성 추가는 하지 않는다.',
  );
  lines.push(
    '2. **관련 없는 코드는 절대 건드리지 않는다.** 오류 대상 요소(또는 그 요소를 고치는 데 꼭 필요한 최소 범위)만 변경한다.',
  );
  lines.push(
    '3. 수정 예시·해결 방안은 **참고**다. 사용자 프로젝트의 실제 마크업·클래스·프레임워크 관례에 맞게 적용하되, **의도(접근성 기준)는 유지**한다.',
  );
  lines.push(
    '4. 한 오류를 고칠 때 **같은 파일의 다른 영역**이나 **다른 페이지 공통 컴포넌트**를 끼워 넣듯 함께 고치지 않는다. 공통 컴포넌트를 고쳐야만 해결되면, 변경 이유를 짧게 남기고 **해당 오류 해결에 필요한 최소 diff**만 한다.',
  );
  lines.push(
    '5. 확신이 없으면 **추측으로 대규모 수정하지 말고** 그 항목은 건너뛰거나, 사용자에게 확인할 질문을 한다.',
  );
  lines.push('6. 작업이 끝나면 오류별로 **무엇을 바꿨는지** 한 줄씩만 보고한다.');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 1. 프로젝트 정보');
  lines.push('');
  lines.push('| 항목 | 값 |');
  lines.push('| --- | --- |');
  lines.push(`| 프로젝트명 | ${projectName || '(이름 없음)'} |`);
  lines.push(`| 내보낸 시각 | ${exportedAt} |`);
  lines.push(`| 시작 URL | ${startUrl || '(없음)'} |`);
  lines.push(`| 오류 건수 | ${findings.length} |`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 2. 오류 목록');
  lines.push('');
  lines.push(
    '각 항목은 독립 작업 단위다. **위에서부터 순서대로** 처리하되, 서로 무관한 파일은 섞어 수정하지 말 것.',
  );
  lines.push('');

  if (findings.length === 0) {
    lines.push('오류가 없습니다. 수정할 항목이 없으면 코드를 변경하지 마세요.');
    lines.push('');
  }

  findings.forEach((f, i) => {
    const n = i + 1;
    const title = findingTitle(f.ruleId, f.message);
    const fixed = isMethodOnlyFix(f.ruleId)
      ? ''
      : f.fixedSnippet || suggestFixedHtml(f.ruleId, f.htmlSnippet);
    const alts = alternativeFixes([f.ruleId], f.htmlSnippet);
    const tip = primaryFixLabel([f.ruleId]);

    lines.push('---');
    lines.push('');
    lines.push(`### 오류 ${n}`);
    lines.push('');
    lines.push('| 항목 | 내용 |');
    lines.push('| --- | --- |');
    lines.push(`| ID | \`${f.id}\` |`);
    lines.push(`| 심각도 | ${impactLabel(f.impact)} |`);
    lines.push(`| 검사 항목 | ${ruleLabel(f.ruleId)} |`);
    lines.push(`| 규칙 ID | \`${f.ruleId}\` |`);
    lines.push(`| 오류 제목 | ${title} |`);
    lines.push(`| 페이지 URL | \`${f.url}\` |`);
    lines.push(`| 위치 | ${f.locationLabel || '(위치 정보 없음)'} |`);
    lines.push(`| 선택자 | \`${f.selector || '(없음)'}\` |`);
    lines.push('');
    lines.push('**문제**');
    lines.push('');
    lines.push(f.message || title);
    lines.push('');
    lines.push('**현재 코드 (오류 지점)**');
    lines.push('');
    lines.push(fence('html', f.htmlSnippet));
    lines.push('');
    lines.push('**수정 방향**');
    lines.push('');
    lines.push(`- ${tip}`);
    if (isMethodOnlyFix(f.ruleId)) {
      lines.push('- 방법·수치 기준만 맞춘다. 구체 색코드·임의 CSS를 문서에 없는 방식으로 강요하지 말 것.');
    } else if (fixed && fixed !== f.htmlSnippet) {
      lines.push('- 예시(참고):');
      lines.push('');
      lines.push(fence('html', fixed));
      lines.push('');
    }
    for (const alt of alts) {
      lines.push(`- 다른 해결 방법 · ${alt.label}:`);
      lines.push('');
      lines.push(fence('html', alt.code));
      lines.push('');
    }
    lines.push('**수정 시 하지 말 것**');
    lines.push('');
    for (const d of dontTouchLines(f.ruleId)) {
      lines.push(`- ${d}`);
    }
    lines.push('');
    lines.push('**완료 조건**');
    lines.push('');
    for (const d of doneLines(f.ruleId)) {
      lines.push(`- ${d}`);
    }
    lines.push('');
  });

  lines.push('---');
  lines.push('');
  lines.push('## 3. 작업 후 체크');
  lines.push('');
  findings.forEach((_, i) => {
    lines.push(`- [ ] 오류 ${i + 1} 수정됨 · 관련 없는 diff 없음`);
  });
  lines.push('- [ ] 이 문서에 없는 파일/라인을 바꾸지 않음');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 4. (선택) 사용자 메모');
  lines.push('');
  lines.push(
    '<!-- 사용자가 AI에게 추가로 적을 자리. 예: 우리 프로젝트는 JSP, 공통 헤더는 /include/header.jsp -->',
  );
  lines.push('');
  lines.push('-');
  lines.push('');

  return lines.join('\n');
}

export function downloadTextFile(fileName: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
