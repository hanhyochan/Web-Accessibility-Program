type Props = {
  title: string;
  note: string;
  pct: number;
};

/** 크롤/검사 진행률 중앙 패널 */
export default function ProgressPanel({ title, note, pct }: Props) {
  return (
    <main className="content center-col">
      <h2 className="title-xl">{title}</h2>
      <p className="muted">{note}</p>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="muted">{pct}%</p>
    </main>
  );
}
