import { useTheme } from "./theme-context";

export function useThemedStyles() {
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === "dark";

  return {
    isDark,
    background: isDark ? "#0D1117" : "#FFF7ED",
    card:       isDark ? "#1E3A8A" : "#FFFFFF",
    text:       isDark ? "#E5E7EB" : "#1F2937",
    accent:     isDark ? "#3B82F6" : "#f97316",
    border:     isDark ? "#1E3A8A" : "#f59e0b",
    muted:      isDark ? "#9CA3AF" : "#92400E",
    inputBg:    isDark ? "#0F172A" : "#FFF1E6",
    inputText:  isDark ? "#E5E7EB" : "#7C2D12",
    placeholder:isDark ? "#9CA3AF" : "#FF8C00",
    softBg: isDark ? '#0b1220' : '#fff7ed',
    successBorder: isDark ? '#166534' : '#86efac',
    successBg: isDark ? '#052e16' : '#ecfdf5',
    successText: isDark ? '#86efac' : '#166534',
    successTextMuted: isDark ? '#34d399' : '#16a34a',
    info: '#3b82f6',
    danger: '#ef4444',
  };
}
