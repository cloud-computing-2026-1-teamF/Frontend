type NumberFieldProps = {
  label: string;
  value: string;
  suffix: string;
  onChange: (value: string) => void;
};

export function NumberField({ label, value, suffix, onChange }: NumberFieldProps) {
  return (
    <label className="vacancy-number-field">
      <span>{label}</span>
      <div>
        <input
          type="number"
          min="0"
          inputMode="decimal"
          value={value}
          onChange={event => onChange(event.target.value)}
        />
        <em>{suffix}</em>
      </div>
    </label>
  );
}

