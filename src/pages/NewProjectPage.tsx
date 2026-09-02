import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StepHeader from '../components/StepHeader';
import { useAppStore } from '../store';

export default function NewProjectPage() {
  const navigate = useNavigate();
  const modeDraft = useAppStore((s) => s.modeDraft);
  const createProject = useAppStore((s) => s.createProject);

  const mode = modeDraft ?? 'local';
  const [name, setName] = useState('');
  const [startUrl, setStartUrl] = useState(
    mode === 'local' ? 'http://localhost:8080' : 'https://example.com',
  );
  const [sourceRoot, setSourceRoot] = useState('');

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
    if (!name.trim() || !startUrl.trim()) {
      alert('이름과 사이트 주소는 필수입니다.');
      return;
    }
    if (mode === 'local' && !sourceRoot.trim()) {
      alert('로컬 모드에서는 코드 폴더가 필요합니다.');
      return;
    }
    createProject({
      name: name.trim(),
      mode,
      startUrl: startUrl.trim(),
      sourceRoot: mode === 'local' ? sourceRoot.trim() : undefined,
      maxDepth: 3,
      maxPages: 100,
      excludePatterns: '/login, /logout',
      rulePackId: 'wa-a11y',
    });
    navigate('/inventory');
  };

  return (
    <div className="app-shell">
      <StepHeader active={1} onPrev={() => navigate('/')} nextDisabled />
      <main className="content narrow">
        <form className="stack lg" onSubmit={onSubmit}>
          <div>
            <h2 className="title-xl">기본 정보만 입력하세요</h2>
            <p className="muted">어려운 옵션은 나중에. 지금은 이름과 주소만 있으면 됩니다.</p>
          </div>
          <div className="field">
            <label htmlFor="name">프로젝트 이름</label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 우리 회사 홈페이지"
            />
          </div>
          <div className="field">
            <label htmlFor="url">검사할 사이트 주소</label>
            <input id="url" value={startUrl} onChange={(e) => setStartUrl(e.target.value)} />
          </div>
          {mode === 'local' && (
            <div className="field">
              <label htmlFor="src">코드가 있는 폴더</label>
              <div className="row">
                <input
                  id="src"
                  style={{ flex: 1, minWidth: 200 }}
                  value={sourceRoot}
                  onChange={(e) => setSourceRoot(e.target.value)}
                  placeholder="폴더 선택…"
                />
                <button className="btn" type="button" onClick={pickFolder}>
                  폴더 선택
                </button>
              </div>
            </div>
          )}
          <div>
            <button className="btn primary" type="submit">
              페이지 찾기
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
