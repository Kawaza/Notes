import { CALENDAR_COLORS } from '../constants/calendarColors';

interface CalendarColorPickerProps {
  value: string | undefined;
  onChange: (colorId: string) => void;
  compact?: boolean;
}

export function CalendarColorPicker({ value, onChange, compact }: CalendarColorPickerProps) {
  const selected = value ?? 'blue';

  return (
    <div className={compact ? 'flex items-center gap-1.5' : ''}>
      {!compact && (
        <label className="text-xs text-muted-foreground block mb-1.5">Color</label>
      )}
      <div className="flex flex-wrap gap-1.5">
        {CALENDAR_COLORS.map((color) => (
          <button
            key={color.id}
            type="button"
            title={color.name}
            onClick={() => onChange(color.id)}
            className={`w-5 h-5 rounded-full border-2 transition-transform cursor-pointer hover:scale-110 ${
              selected === color.id ? 'ring-2 ring-offset-1 ring-foreground/30 scale-110' : ''
            }`}
            style={{
              backgroundColor: color.border,
              borderColor: selected === color.id ? color.text : 'transparent',
            }}
          />
        ))}
      </div>
    </div>
  );
}
