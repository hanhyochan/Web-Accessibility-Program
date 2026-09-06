type Row = { key: string; pct: number };

type Props = {
  title: string;
  note: string;
  pct?: number;
  rows?: Row[];
};

function clampPct(pct: number) {
  return Math.max(0, Math.min(100, Number.isFinite(pct) ? Math.round(pct) : 0));
}

function ProgressRow({ pct, total }: { pct: number; total?: boolean }) {
  const shown = clampPct(pct);
  return (
    <div className="progress-row">
      <div className="progress-track">
        <div
          className={`progress-fill${total ? ' is-total' : ''}`}
          style={{ width: `${shown}%` }}
        />
      </div>
      <span className="progress-pct muted">{shown}%</span>
    </div>
  );
}

/** 크롤/검사 진행률 중앙 패널 */
export default function ProgressPanel({ title, note, pct, rows }: Props) {
  const list = rows && rows.length > 0 ? rows : [{ key: 'one', pct: pct ?? 0 }];
  const overall = Math.round(
    list.reduce((sum, r) => sum + clampPct(r.pct), 0) / Math.max(list.length, 1),
  );
  return (
    <main className="content center-col">
      <h2 className="title-xl">{title}</h2>
      <p className="muted">{note}</p>
      <div className="progress-rows">
        <ProgressRow pct={overall} total />
        <div className="progress-split" />
        <div className="progress-items">
          {list.map((r) => (
            <ProgressRow key={r.key} pct={r.pct} />
          ))}
        </div>
      </div>
    </main>
  );
}
