import React from 'react';
import { COLORS, SHADOWS, RADIUS } from '../../styles/theme';

// ============ Card Component ============
interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  style,
  hover = true,
  padding = 'md'
}) => {
  const paddingMap = { sm: '16px', md: '24px', lg: '32px' };
  
  return (
    <div 
      className={`geo-card ${className}`}
      style={{
        background: COLORS.bgPrimary,
        borderRadius: RADIUS.lg,
        padding: paddingMap[padding],
        boxShadow: SHADOWS.sm,
        transition: hover ? 'all 0.2s ease' : undefined,
        ...style
      }}
    >
      {children}
    </div>
  );
};

// ============ Button Component ============
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  disabled,
  style,
  ...props
}) => {
  const sizeStyles = {
    sm: { padding: '8px 16px', fontSize: '13px' },
    md: { padding: '10px 20px', fontSize: '14px' },
    lg: { padding: '14px 28px', fontSize: '16px' },
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
      color: 'white',
      border: 'none',
    },
    secondary: {
      background: COLORS.bgPrimary,
      color: COLORS.primary,
      border: `1px solid ${COLORS.border}`,
    },
    ghost: {
      background: 'transparent',
      color: COLORS.textSecondary,
      border: 'none',
    },
    danger: {
      background: `linear-gradient(135deg, ${COLORS.error} 0%, #DC2626 100%)`,
      color: 'white',
      border: 'none',
    },
  };

  return (
    <button
      disabled={disabled || loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        borderRadius: RADIUS.md,
        fontWeight: 500,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.6 : 1,
        transition: 'all 0.2s ease',
        outline: 'none',
        ...sizeStyles[size],
        ...variantStyles[variant],
        ...style,
      }}
      {...props}
    >
      {loading ? (
        <span style={{ 
          width: '16px', 
          height: '16px', 
          border: '2px solid currentColor',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      ) : icon}
      {children}
    </button>
  );
};

// ============ Input Component ============
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  style,
  ...props
}) => {
  return (
    <div style={{ width: '100%' }}>
      {label && (
        <label style={{
          display: 'block',
          marginBottom: '8px',
          fontSize: '14px',
          fontWeight: 500,
          color: COLORS.textPrimary,
        }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {icon && (
          <span style={{
            position: 'absolute',
            left: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: COLORS.textMuted,
          }}>
            {icon}
          </span>
        )}
        <input
          className="geo-input"
          style={{
            paddingLeft: icon ? '44px' : '16px',
            borderColor: error ? COLORS.error : undefined,
            ...style,
          }}
          {...props}
        />
      </div>
      {error && (
        <span style={{
          display: 'block',
          marginTop: '4px',
          fontSize: '12px',
          color: COLORS.error,
        }}>
          {error}
        </span>
      )}
    </div>
  );
};

// ============ Status Badge Component ============
interface StatusBadgeProps {
  status: 'completed' | 'running' | 'failed' | 'pending' | 'analyzing';
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const config: Record<string, { bg: string; color: string; label: string }> = {
    completed: { bg: '#ECFDF5', color: '#059669', label: '已完成' },
    running: { bg: '#EFF6FF', color: '#2563EB', label: '运行中' },
    analyzing: { bg: '#FEF3C7', color: '#D97706', label: '分析中' },
    failed: { bg: '#FEF2F2', color: '#DC2626', label: '失败' },
    pending: { bg: '#F8FAFC', color: '#64748B', label: '等待中' },
  };

  const { bg, color, label } = config[status] || config.pending;
  const sizeStyle = size === 'sm' 
    ? { padding: '2px 8px', fontSize: '11px' }
    : { padding: '4px 12px', fontSize: '12px' };

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      borderRadius: '9999px',
      fontWeight: 500,
      background: bg,
      color: color,
      ...sizeStyle,
    }}>
      <span style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: color,
        animation: status === 'running' || status === 'analyzing' ? 'pulse 2s infinite' : undefined,
      }} />
      {label}
    </span>
  );
};

// ============ Progress Bar Component ============
interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  showLabel?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  color = COLORS.primary,
  showLabel = false,
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  return (
    <div style={{ width: '100%' }}>
      <div style={{
        height: '8px',
        background: COLORS.borderLight,
        borderRadius: '9999px',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${percentage}%`,
          height: '100%',
          background: color,
          borderRadius: '9999px',
          transition: 'width 0.3s ease',
        }} />
      </div>
      {showLabel && (
        <span style={{
          display: 'block',
          marginTop: '4px',
          fontSize: '12px',
          color: COLORS.textSecondary,
          textAlign: 'right',
        }}>
          {percentage.toFixed(0)}%
        </span>
      )}
    </div>
  );
};

// ============ Tabs Component ============
interface TabsProps {
  tabs: { id: string; label: string; icon?: React.ReactNode }[];
  activeTab: string;
  onChange: (id: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange }) => {
  return (
    <div style={{
      display: 'flex',
      gap: '4px',
      padding: '4px',
      background: COLORS.bgTertiary,
      borderRadius: RADIUS.lg,
    }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: RADIUS.md,
            border: 'none',
            background: activeTab === tab.id ? COLORS.bgPrimary : 'transparent',
            color: activeTab === tab.id ? COLORS.primary : COLORS.textSecondary,
            fontWeight: activeTab === tab.id ? 600 : 400,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: activeTab === tab.id ? SHADOWS.sm : 'none',
          }}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
};

// ============ Empty State Component ============
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px 20px',
      textAlign: 'center',
    }}>
      {icon && (
        <div style={{
          fontSize: '48px',
          marginBottom: '16px',
          opacity: 0.5,
        }}>
          {icon}
        </div>
      )}
      <h3 style={{
        fontSize: '18px',
        fontWeight: 600,
        color: COLORS.textPrimary,
        marginBottom: '8px',
      }}>
        {title}
      </h3>
      {description && (
        <p style={{
          fontSize: '14px',
          color: COLORS.textSecondary,
          marginBottom: '24px',
          maxWidth: '400px',
        }}>
          {description}
        </p>
      )}
      {action}
    </div>
  );
};

// ============ Loading Spinner ============
export const Spinner: React.FC<{ size?: number; color?: string }> = ({
  size = 24,
  color = COLORS.primary,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ animation: 'spin 1s linear infinite' }}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke={color}
        strokeWidth="3"
        fill="none"
        strokeDasharray="62.83"
        strokeDashoffset="20"
        strokeLinecap="round"
      />
    </svg>
  );
};

// ============ Stat Card Component ============
interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: React.ReactNode;
  color?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  icon,
  color = COLORS.primary,
}) => {
  return (
    <Card padding="md">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{
            fontSize: '13px',
            color: COLORS.textSecondary,
            marginBottom: '8px',
          }}>
            {title}
          </p>
          <p style={{
            fontSize: '28px',
            fontWeight: 700,
            color: COLORS.textPrimary,
          }}>
            {value}
          </p>
          {change !== undefined && (
            <p style={{
              fontSize: '12px',
              marginTop: '8px',
              color: change >= 0 ? COLORS.accent : COLORS.error,
            }}>
              {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% 较上周
            </p>
          )}
        </div>
        {icon && (
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: RADIUS.lg,
            background: `${color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
          }}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
};
