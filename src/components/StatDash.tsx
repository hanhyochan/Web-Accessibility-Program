import { formatCountUnit } from '../format';

type StatTone = 'neutral' | 'critical' | 'warn' | 'note';

type StatItem = {
  label: string;
  /** 숫자면 N개로 표시. 문자열이면 그대로 표시 */
  count?: number;
  value?: string;
  tone?: StatTone;
};

type Props = {
  items: StatItem[];
};

export default function StatDash({ items }: Props) {
  return (
    <div className="stat-dash">
      {items.map((item) => (
        <div
          key={item.label}
          className={`stat-box${item.tone && item.tone !== 'neutral' ? ` tone-${item.tone}` : ''}`}
        >
          <span className="stat-label">{item.label}</span>
          <span className="stat-value">
            {item.value ?? formatCountUnit(item.count ?? 0)}
          </span>
        </div>
      ))}
    </div>
  );
}
