import React from 'react';
import { COLORS, RADIUS } from '../styles/theme';

// 图表颜色
export const CHART_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'
];

// ============ Pie Chart ============
interface PieChartProps {
  data: { label: string; value: number; color?: string }[];
  size?: number;
  showLegend?: boolean;
  innerRadius?: number;
  showLabels?: boolean;
}

export const PieChart: React.FC<PieChartProps> = ({ 
  data, 
  size = 200, 
  showLegend = true,
  innerRadius = 0.5,
  showLabels = false
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return null;
  
  let currentAngle = -90;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 4;
  const innerR = outerR * innerRadius;

  const paths = data.map((item, index) => {
    const angle = (item.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1Outer = cx + outerR * Math.cos(startRad);
    const y1Outer = cy + outerR * Math.sin(startRad);
    const x2Outer = cx + outerR * Math.cos(endRad);
    const y2Outer = cy + outerR * Math.sin(endRad);
    
    const x1Inner = cx + innerR * Math.cos(endRad);
    const y1Inner = cy + innerR * Math.sin(endRad);
    const x2Inner = cx + innerR * Math.cos(startRad);
    const y2Inner = cy + innerR * Math.sin(startRad);

    const largeArc = angle > 180 ? 1 : 0;
    const color = item.color || CHART_COLORS[index % CHART_COLORS.length];

    // Label position
    const midAngle = ((startAngle + endAngle) / 2 * Math.PI) / 180;
    const labelR = (outerR + innerR) / 2;
    const labelX = cx + labelR * Math.cos(midAngle);
    const labelY = cy + labelR * Math.sin(midAngle);

    return (
      <g key={index}>
        <path
          d={`
            M ${x1Outer} ${y1Outer}
            A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2Outer} ${y2Outer}
            L ${x1Inner} ${y1Inner}
            A ${innerR} ${innerR} 0 ${largeArc} 0 ${x2Inner} ${y2Inner}
            Z
          `}
          fill={color}
          stroke="white"
          strokeWidth="2"
        />
        {showLabels && item.value / total > 0.08 && (
          <text
            x={labelX}
            y={labelY}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ fontSize: '11px', fontWeight: 600, fill: 'white' }}
          >
            {Math.round((item.value / total) * 100)}%
          </text>
        )}
      </g>
    );
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {paths}
      </svg>
      {showLegend && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {data.map((item, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                width: '12px',
                height: '12px',
                borderRadius: '2px',
                background: item.color || CHART_COLORS[index % CHART_COLORS.length],
                flexShrink: 0,
              }} />
              <span style={{ fontSize: '13px', color: COLORS.textSecondary }}>
                {item.label}
              </span>
              <span style={{ fontSize: '13px', fontWeight: 500, color: COLORS.textPrimary, marginLeft: 'auto' }}>
                {item.value.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============ Bar Chart ============
interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  horizontal?: boolean;
  showValues?: boolean;
  maxValue?: number;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  height = 200,
  horizontal = false,
  showValues = true,
  maxValue,
}) => {
  const max = maxValue || Math.max(...data.map(d => d.value), 1);
  
  if (horizontal) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {data.map((item, index) => (
          <div key={index}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '4px',
              fontSize: '13px',
            }}>
              <span style={{ color: COLORS.textPrimary }}>{item.label}</span>
              {showValues && (
                <span style={{ color: COLORS.textSecondary }}>{item.value.toFixed(1)}%</span>
              )}
            </div>
            <div style={{
              height: '8px',
              background: COLORS.borderLight,
              borderRadius: '4px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${(item.value / max) * 100}%`,
                height: '100%',
                background: item.color || CHART_COLORS[index % CHART_COLORS.length],
                borderRadius: '4px',
                transition: 'width 0.5s ease',
              }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ height, display: 'flex', alignItems: 'flex-end', gap: '8px', padding: '0 4px' }}>
      {data.map((item, index) => {
        const barHeight = (item.value / max) * 100;
        return (
          <div
            key={index}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <div style={{
              width: '100%',
              height: `${barHeight}%`,
              minHeight: '4px',
              background: item.color || CHART_COLORS[index % CHART_COLORS.length],
              borderRadius: '4px 4px 0 0',
              transition: 'height 0.5s ease',
            }} />
            <span style={{
              fontSize: '11px',
              color: COLORS.textMuted,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%',
            }}>
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// ============ Line Chart (Simple) ============
interface LineChartProps {
  data: number[];
  labels?: string[];
  height?: number;
  color?: string;
  showArea?: boolean;
  showPoints?: boolean;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  labels,
  height = 120,
  color = COLORS.primary,
  showArea = true,
  showPoints = true,
}) => {
  if (data.length === 0) return null;
  
  const width = 300;
  const padding = { top: 10, right: 10, bottom: 20, left: 10 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  
  const points = data.map((value, index) => ({
    x: padding.left + (index / (data.length - 1 || 1)) * chartWidth,
    y: padding.top + chartHeight - ((value - min) / range) * chartHeight,
    value,
  }));
  
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Area */}
      {showArea && (
        <path
          d={areaPath}
          fill={`${color}20`}
        />
      )}
      
      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Points */}
      {showPoints && points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="4"
          fill="white"
          stroke={color}
          strokeWidth="2"
        />
      ))}
      
      {/* Labels */}
      {labels && labels.map((label, i) => (
        <text
          key={i}
          x={points[i]?.x || 0}
          y={height - 4}
          textAnchor="middle"
          style={{ fontSize: '10px', fill: COLORS.textMuted }}
        >
          {label}
        </text>
      ))}
    </svg>
  );
};

// ============ Stat Display ============
interface StatDisplayProps {
  value: number | string;
  label: string;
  suffix?: string;
  prefix?: string;
  change?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const StatDisplay: React.FC<StatDisplayProps> = ({
  value,
  label,
  suffix = '',
  prefix = '',
  change,
  size = 'md',
}) => {
  const sizes = {
    sm: { value: '20px', label: '11px' },
    md: { value: '28px', label: '13px' },
    lg: { value: '36px', label: '14px' },
  };

  return (
    <div>
      <p style={{
        fontSize: sizes[size].label,
        color: COLORS.textSecondary,
        marginBottom: '4px',
      }}>
        {label}
      </p>
      <p style={{
        fontSize: sizes[size].value,
        fontWeight: 700,
        color: COLORS.textPrimary,
      }}>
        {prefix}{value}{suffix}
      </p>
      {change !== undefined && (
        <p style={{
          fontSize: '12px',
          color: change >= 0 ? COLORS.chart.green : COLORS.chart.red,
          marginTop: '4px',
        }}>
          {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
        </p>
      )}
    </div>
  );
};

// ============ Sentiment Gauge ============
interface SentimentGaugeProps {
  positive: number;
  neutral: number;
  negative: number;
  size?: 'sm' | 'md';
}

export const SentimentGauge: React.FC<SentimentGaugeProps> = ({
  positive,
  neutral,
  negative,
  size = 'md',
}) => {
  const total = positive + neutral + negative || 1;
  const positiveWidth = (positive / total) * 100;
  const neutralWidth = (neutral / total) * 100;
  const negativeWidth = (negative / total) * 100;
  
  const height = size === 'sm' ? '6px' : '10px';

  return (
    <div>
      <div style={{
        display: 'flex',
        height,
        borderRadius: '4px',
        overflow: 'hidden',
        marginBottom: '8px',
      }}>
        <div style={{ width: `${positiveWidth}%`, background: COLORS.chart.green, transition: 'width 0.3s' }} />
        <div style={{ width: `${neutralWidth}%`, background: COLORS.chart.yellow, transition: 'width 0.3s' }} />
        <div style={{ width: `${negativeWidth}%`, background: COLORS.chart.red, transition: 'width 0.3s' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
        <span style={{ color: COLORS.chart.green }}>正面 {positiveWidth.toFixed(0)}%</span>
        <span style={{ color: COLORS.chart.yellow }}>中性 {neutralWidth.toFixed(0)}%</span>
        <span style={{ color: COLORS.chart.red }}>负面 {negativeWidth.toFixed(0)}%</span>
      </div>
    </div>
  );
};

// ============ Ranking List ============
interface RankingListProps {
  data: { label: string; value: number; badge?: string }[];
  maxItems?: number;
  showRank?: boolean;
  valueFormatter?: (value: number) => string;
}

export const RankingList: React.FC<RankingListProps> = ({
  data,
  maxItems = 10,
  showRank = true,
  valueFormatter = (v) => `${v.toFixed(1)}%`,
}) => {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {data.slice(0, maxItems).map((item, index) => (
        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {showRank && (
            <span style={{
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              background: index < 3 ? CHART_COLORS[index] : COLORS.bgTertiary,
              color: index < 3 ? 'white' : COLORS.textSecondary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 600,
              flexShrink: 0,
            }}>
              {index + 1}
            </span>
          )}
          <div style={{ flex: 1 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '4px',
            }}>
              <span style={{ fontSize: '13px', color: COLORS.textPrimary, fontWeight: 500 }}>
                {item.label}
              </span>
              <span style={{ fontSize: '13px', color: COLORS.textSecondary }}>
                {valueFormatter(item.value)}
              </span>
            </div>
            <div style={{
              height: '4px',
              background: COLORS.borderLight,
              borderRadius: '2px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${(item.value / maxValue) * 100}%`,
                height: '100%',
                background: index < 3 ? CHART_COLORS[index] : COLORS.textMuted,
                borderRadius: '2px',
              }} />
            </div>
          </div>
          {item.badge && (
            <span style={{
              padding: '2px 8px',
              background: COLORS.primary + '15',
              color: COLORS.primary,
              borderRadius: RADIUS.sm,
              fontSize: '11px',
              fontWeight: 500,
            }}>
              {item.badge}
            </span>
          )}
        </div>
      ))}
    </div>
  );
};

export default {
  PieChart,
  BarChart,
  LineChart,
  StatDisplay,
  SentimentGauge,
  RankingList,
  CHART_COLORS,
};
