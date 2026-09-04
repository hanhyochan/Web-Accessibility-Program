import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageIntro from '../components/PageIntro';
import StepHeader from '../components/StepHeader';
import { useOverflowAction } from '../hooks/useOverflowAction';
import { useAppStore } from '../store';
import type { ScanScope } from '../types';

export default function NewProjectPage() {
  const navigate = useNavigate();
  const createProject = useAppStore((s) => s.createProject);

  const [name, setName] = useState('');
  const [startUrl, setStartUrl] = useState('');
  const [scanScope, setScanScope] = useState<ScanScope>('crawl');
  const { bottomRef, showTop } = useOverflowAction([scanScope]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('프로젝트 이름은 필수입니다.');
      return;
    }
    if (!startUrl.trim()) {
      alert('검사할 사이트 주소를 입력하세요.');
      return;
    }
    createProject({
      name: name.trim(),
      mode: 'production',
      startUrl: startUrl.trim(),
      scanScope,
      maxDepth: scanScope === 'single' ? 0 : 3,
      maxPages: 100,
      excludePatterns:
        '/login, /logout, /join, /signup, /sign-up, /signin, /sign-in, /register, /member/join',
      rulePackId: 'wa-a11y',
    });
    navigate('/inventory');
  };

  return (
    <div className="app-shell">
      <StepHeader active={1} />
      <main className="content narrow">
        <form className="stack lg" onSubmit={onSubmit}>
          <PageIntro
            title="기본 정보만 입력하세요"
            description="시작 주소와 검사 범위를 정하면 됩니다."
            topAction={
              showTop ? (
                <button className="btn primary" type="submit">
                  페이지 찾기
                </button>
              ) : undefined
            }
          />
          <div className="field">
            <label htmlFor="name">프로젝트 이름</label>
            <div className="field-control">
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 우리 회사 홈페이지"
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="url">검사할 사이트 주소</label>
            <div className="field-control">
              <input
                id="url"
                value={startUrl}
                onChange={(e) => setStartUrl(e.target.value)}
                placeholder="예: https://example.com"
              />
            </div>
          </div>
          <div className="scope-field">
            <div className="scope-title">검사 범위</div>
            <div className="scope-options">
              <label className="scope-option">
                <input
                  type="radio"
                  name="scanScope"
                  checked={scanScope === 'single'}
                  onChange={() => setScanScope('single')}
                />
                <span>이 페이지만</span>
              </label>
              <label className="scope-option">
                <input
                  type="radio"
                  name="scanScope"
                  checked={scanScope === 'crawl'}
                  onChange={() => setScanScope('crawl')}
                />
                <span>연결된 모든 페이지</span>
              </label>
            </div>
          </div>
          <div ref={bottomRef}>
            <button className="btn primary" type="submit">
              페이지 찾기
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
