/**
 * Paleta y estilos base para gráficos (ECharts).
 * Valores de tono medio: legibles en tema claro y oscuro.
 * Ver docs/ui-ux/02-reglas-de-marca.md §3.3.
 */
export const CHART = {
  primary: '#1A8296',
  secondary: '#5B7FA6',
  neutral: '#9AA5B4',
  success: '#2E9A63',
  warning: '#C9822B',
  danger: '#D24545',
  axis: '#808A99',
  grid: 'rgba(128, 138, 153, 0.18)',
  font: 'IBM Plex Sans, system-ui, sans-serif',
};

export const chartTooltip = {
  backgroundColor: '#151C27',
  borderColor: '#2A3039',
  borderWidth: 1,
  padding: [8, 10],
  textStyle: { color: '#E6EAF0', fontSize: 12, fontFamily: CHART.font },
  extraCssText: 'border-radius:6px;box-shadow:0 8px 16px -6px rgba(16,24,40,.25);',
};

export const chartAxis = {
  axisLine: { show: false },
  axisTick: { show: false },
  axisLabel: { color: CHART.axis, fontSize: 11, fontFamily: CHART.font },
  splitLine: { lineStyle: { color: CHART.grid } },
};

export function areaFill(hex: string, opacity = 0.14) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return {
    type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
    colorStops: [
      { offset: 0, color: `rgba(${r}, ${g}, ${b}, ${opacity})` },
      { offset: 1, color: `rgba(${r}, ${g}, ${b}, 0)` },
    ],
  };
}
