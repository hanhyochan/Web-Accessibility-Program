import type { RuleDef } from '../types';

/** MVP 규칙 카탈로그 — 이후 axe 전체 + KO 팩으로 확장 */
export const RULE_CATALOG: RuleDef[] = [
  {
    id: 'image-alt',
    label: '이미지 alt',
    engine: 'axe',
    pack: 'kwcag-auto',
    enabled: true,
    autoFixable: true,
    description: 'img에 alt 또는 presentation role',
  },
  {
    id: 'link-name',
    label: '링크명',
    engine: 'axe',
    pack: 'kwcag-auto',
    enabled: true,
    description: '링크에 인식 가능한 텍스트',
  },
  {
    id: 'label',
    label: '폼 label',
    engine: 'axe',
    pack: 'kwcag-auto',
    enabled: true,
    description: '폼 요소 label 연결',
  },
  {
    id: 'button-name',
    label: '버튼명',
    engine: 'axe',
    pack: 'kwcag-auto',
    enabled: true,
    description: '버튼에 인식 가능한 텍스트',
  },
  {
    id: 'html-has-lang',
    label: 'html lang',
    engine: 'axe',
    pack: 'kwcag-auto',
    enabled: true,
    description: 'html lang 속성',
  },
  {
    id: 'document-title',
    label: '문서 title',
    engine: 'axe',
    pack: 'kwcag-auto',
    enabled: true,
    description: '비어 있지 않은 title',
  },
  {
    id: 'color-contrast',
    label: '색 대비',
    engine: 'axe',
    pack: 'kwcag-auto',
    enabled: false,
    description: 'WCAG AA 색 대비',
  },
  {
    id: 'heading-order',
    label: '제목 순서',
    engine: 'axe',
    pack: 'kwcag-auto',
    enabled: false,
    description: 'heading 순서 (best-practice)',
  },
  {
    id: 'ko-blank-link-title',
    label: '새창 링크 title',
    engine: 'axe-custom',
    pack: 'kwcag-auto',
    enabled: true,
    autoFixable: true,
    description: 'target=_blank 링크에 title에 새창 포함',
  },
  {
    id: 'html-validate-recommended',
    label: 'HTML 문법 (recommended)',
    engine: 'html-validate',
    pack: 'compat',
    enabled: true,
    description: 'html-validate recommended preset',
  },
];

export const RULE_PACKS = [
  { id: 'kwcag-auto', label: 'KWCAG 자동팩' },
  { id: 'compat', label: '웹호환성' },
  { id: 'custom', label: '내 커스텀' },
] as const;
