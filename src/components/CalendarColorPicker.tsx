import { useStore } from '../store/useStore';
import {
  THEME_CALENDAR_COLOR_ID,
  calendarColorLabel,
  calendarColorOptionsForPalette,
  resolveStoredCalendarColorId,
  themeCalendarSwatchStyle,
} from '../utils/themeCalendarColor';

interface CalendarColorPickerProps {
  value: string | undefined;
  onChange: (colorId: string) => void;
  compact?: boolean;
}

export function CalendarColorPicker({ value, onChange, compact }: CalendarColorPickerProps) {
  const colorPalette = useStore((s) => s.colorPalette);
  const theme = useStore((s) => s.theme);
  const isDark = theme === 'dark';

  const selected = resolveStoredCalendarColorId(value, colorPalette);
  const presetOptions = calendarColorOptionsForPalette(colorPalette);
  const themeStyle = themeCalendarSwatchStyle(colorPalette, isDark);
  const themeName = calendarColorLabel(colorPalette);

  const isThemeSelected = !value || value === THEME_CALENDAR_COLOR_ID;

  return (
    <div className={compact ? 'flex items-center gap-1.5 flex-wrap' : ''}>
      {!compact && (
        <label className="text-xs text-muted-foreground block mb-1.5">Color</label>
      )}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          title={`${themeName} (theme)`}
          onClick={() => onChange(THEME_CALENDAR_COLOR_ID)}
          className={`w-5 h-5 rounded-full border-2 transition-transform cursor-pointer hover:scale-110 ${
            isThemeSelected ? 'ring-2 ring-offset-1 ring-foreground/30 scale-110' : ''
          }`}
          style={{
            backgroundColor: themeStyle.backgroundColor,
            borderColor: isThemeSelected ? themeStyle.borderColor : 'transparent',
          }}
        />
        {presetOptions.map((color) => {
          const picked = !isThemeSelected && selected === color.id;
          return (
            <button
              key={color.id}
              type="button"
              title={color.name}
              onClick={() => onChange(color.id)}
              className={`w-5 h-5 rounded-full border-2 transition-transform cursor-pointer hover:scale-110 ${
                picked ? 'ring-2 ring-offset-1 ring-foreground/30 scale-110' : ''
              }`}
              style={{
                backgroundColor: isDark ? color.borderDark : color.border,
                borderColor: picked ? (isDark ? color.textDark : color.text) : 'transparent',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
