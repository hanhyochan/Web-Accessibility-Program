import type { ReactNode, Ref } from 'react';

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  inputRef?: Ref<HTMLInputElement>;
  trailing?: ReactNode;
};

export default function SelectAllRow({
  checked,
  onChange,
  label,
  inputRef,
  trailing,
}: Props) {
  return (
    <div className="list-row list-select-all">
      <label className="select-all-label">
        <input
          ref={inputRef}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="list-primary">{label}</span>
      </label>
      {trailing}
    </div>
  );
}
