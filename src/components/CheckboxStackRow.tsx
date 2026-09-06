type Props = {
  title: string;
  desc: string;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  onChange?: () => void;
};

/** 체크박스 + 제목/설명 스택 리스트 행 */
export default function CheckboxStackRow({
  title,
  desc,
  checked,
  defaultChecked,
  disabled,
  onChange,
}: Props) {
  return (
    <label className={`list-row${disabled ? ' is-disabled' : ''}`}>
      <input
        type="checkbox"
        disabled={disabled}
        {...(onChange
          ? { checked: !!checked, onChange }
          : { defaultChecked: !!defaultChecked })}
      />
      <span className="grow list-stack">
        <span className="list-primary">{title}</span>
        <span className="muted">{desc}</span>
      </span>
    </label>
  );
}
