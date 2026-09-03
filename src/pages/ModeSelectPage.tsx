import { useNavigate } from 'react-router-dom';
import StepHeader from '../components/StepHeader';
import { useAppStore } from '../store';
import type { AppMode } from '../types';

const MODES: {
  mode: AppMode;
  title: string;
  lines: [string, string];
}[] = [
  {
    mode: 'production',
    title: '운영 중인 사이트',
    lines: ['인터넷에 열려 있는 주소를 검사합니다.', '결과는 볼 수 있고, 코드는 고치지 않습니다.'],
  },
  {
    mode: 'local',
    title: '내 컴퓨터에 있는 프로젝트',
    lines: ['로컬 주소를 검사하고,', '문제 있는 코드도 고칠 수 있습니다.'],
  },
];

export default function ModeSelectPage() {
  const navigate = useNavigate();
  const setModeDraft = useAppStore((s) => s.setModeDraft);

  const go = (mode: AppMode) => {
    setModeDraft(mode);
    navigate('/project/new');
  };

  return (
    <div className="app-shell">
      <StepHeader active={null} />
      <main className="content center-col">
        <h2 className="title-xl">어떤 사이트를 검사할까요?</h2>
        <p className="muted lead">
          처음이시면 아래 중 하나만 고르세요. 나머지는 다음 화면에서 안내합니다.
        </p>
        <div className="cards mode-pick">
          {MODES.map((m) => (
            <div key={m.mode} className="card stack">
              <h3>{m.title}</h3>
              <p className="muted">
                {m.lines[0]}
                <br />
                {m.lines[1]}
              </p>
              <div>
                <button className="btn primary" type="button" onClick={() => go(m.mode)}>
                  이걸로 시작
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
