import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageIntro from '../components/PageIntro';
import StepHeader from '../components/StepHeader';
import { useOverflowAction } from '../hooks/useOverflowAction';
import { useAppStore } from '../store';
import type { ScanScope } from '../types';

export default function NewProjectPage() {
  const navigate = useNavigate();
  const modeDraft = useAppStore((s) => s.modeDraft);
  const createProject = useAppStore((s) => s.createProject);

  const mode = modeDraft ?? 'local';
  const [name, setName] = useState('');
  const [startUrl, setStartUrl] = useState('');
  const [sourceRoot, setSourceRoot] = useState('');
  const [scanScope, setScanScope] = useState<ScanScope>('crawl');
  const { bottomRef, showTop } = useOverflowAction([mode, scanScope]);

  const pickFolder = async () => {
    if (window.a11y?.selectFolder) {
      const path = await window.a11y.selectFolder();
      if (path) setSourceRoot(path);
      return;
    }
    const manual = window.prompt('소스 폴더 경로를 입력하세요');
    if (manual) setSourceRoot(manual);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('프로젝트 이름은 필수입니다.');
      return;
    }
    if (mode === 'local' && !sourceRoot.trim()) {
      alert('로컬에서는 코드 폴더가 필요합니다.');
      return;
    }
    if (scanScope !== 'folder' && !startUrl.trim()) {
      alert('사이트 주소를 입력하거나, 로컬 폴더 전체 검사를 선택하세요.');
      return;
    }
    if (mode === 'production' && scanScope === 'folder') {
      alert('운영에서는 폴더 전체 검사를 쓸 수 없습니다.');
      return;
    }
    createProject({
      name: name.trim(),
      mode,
      startUrl: startUrl.trim(),
      sourceRoot: mode === 'local' ? sourceRoot.trim() : undefined,
      scanScope,
      maxDepth: scanScope === 'single' ? 0 : 3,
      maxPages: 100,
      excludePatterns: '/login, /logout',
      rulePackId: 'wa-a11y',
    });
    navigate('/inventory');
  };

  return (
    <div className="app-shell">
      <StepHeader active={1} onPrev={() => navigate('/')} />
      <main className="content narrow">
        <form className={`stack lg${mode === 'local' ? ' form-local' : ''}`} onSubmit={onSubmit}>
          <PageIntro
            title="기본 정보만 입력하세요"
            description={
              mode === 'local'
                ? '코드 폴더는 필수입니다. 주소는 폴더 전체 검사 시 비워도 됩니다.'
                : '시작 주소와 검사 범위를 정하면 됩니다.'
            }
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
            <label htmlFor="url">
              검사할 사이트 주소
              {mode === 'local' && scanScope === 'folder' ? ' (선택)' : ''}
            </label>
            <div className="field-control">
              <input
                id="url"
                value={startUrl}
                onChange={(e) => setStartUrl(e.target.value)}
                placeholder={
                  mode === 'local' ? '예: http://localhost:8080' : '예: https://example.com'
                }
              />
            </div>
          </div>
          {mode === 'local' && (
            <div className="field">
              <label htmlFor="src">코드가 있는 폴더</label>
              <div className="field-control">
                <input
                  id="src"
                  value={sourceRoot}
                  onChange={(e) => setSourceRoot(e.target.value)}
                  placeholder="폴더 선택…"
                />
                <button className="btn solid" type="button" onClick={pickFolder}>
                  폴더 선택
                </button>
              </div>
            </div>
          )}
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
              {mode === 'local' && (
                <label className="scope-option">
                  <input
                    type="radio"
                    name="scanScope"
                    checked={scanScope === 'folder'}
                    onChange={() => setScanScope('folder')}
                  />
                  <span>폴더 내 HTML·JSP</span>
                </label>
              )}
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
