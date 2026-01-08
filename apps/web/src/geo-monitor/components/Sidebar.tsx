import React from 'react';
import { COLORS, SHADOWS, RADIUS } from '../styles/theme';
import { Icons } from './Icons';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

const navItems: NavItem[] = [
  { id: 'monitor', label: '监测中心', icon: <Icons.Monitor /> },
  { id: 'brand-duel', label: '品牌对抗', icon: <Icons.BrandDuel /> },
  { id: 'history', label: '历史记录', icon: <Icons.History /> },
  { id: 'gpt-demo', label: 'GPT演示', icon: <Icons.Robot /> },
];

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  return (
    <aside style={{
      width: '260px',
      height: '100vh',
      background: COLORS.bgPrimary,
      borderRight: `1px solid ${COLORS.border}`,
      display: 'flex',
      flexDirection: 'column',
      position: 'sticky',
      top: 0,
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{
        padding: '24px 20px',
        borderBottom: `1px solid ${COLORS.borderLight}`,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: RADIUS.lg,
            background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
          }}>
            <span style={{ color: 'white', fontWeight: 'bold', fontSize: '18px' }}>G</span>
          </div>
          <div>
            <h1 style={{
              fontSize: '18px',
              fontWeight: 700,
              color: COLORS.textPrimary,
              margin: 0,
            }}>
              GEO Monitor
            </h1>
            <p style={{
              fontSize: '12px',
              color: COLORS.textMuted,
              margin: 0,
            }}>
              品牌舆情监测平台
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{
        flex: 1,
        padding: '16px 12px',
        overflowY: 'auto',
      }}>
        <p style={{
          fontSize: '11px',
          fontWeight: 600,
          color: COLORS.textMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '12px',
          paddingLeft: '12px',
        }}>
          功能模块
        </p>
        
        {navItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '12px 16px',
                borderRadius: RADIUS.md,
                border: 'none',
                background: isActive ? COLORS.primary + '10' : 'transparent',
                color: isActive ? COLORS.primary : COLORS.textSecondary,
                fontSize: '14px',
                fontWeight: isActive ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                marginBottom: '4px',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = COLORS.bgSecondary;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {item.icon}
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && (
                <span style={{
                  background: COLORS.error,
                  color: 'white',
                  fontSize: '10px',
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: '9999px',
                  minWidth: '18px',
                  textAlign: 'center',
                }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        <div style={{
          margin: '24px 0',
          borderTop: `1px solid ${COLORS.borderLight}`,
        }} />

        <p style={{
          fontSize: '11px',
          fontWeight: 600,
          color: COLORS.textMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '12px',
          paddingLeft: '12px',
        }}>
          其他
        </p>

        <button
          onClick={() => onTabChange('settings')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            width: '100%',
            padding: '12px 16px',
            borderRadius: RADIUS.md,
            border: 'none',
            background: activeTab === 'settings' ? COLORS.primary + '10' : 'transparent',
            color: activeTab === 'settings' ? COLORS.primary : COLORS.textSecondary,
            fontSize: '14px',
            fontWeight: activeTab === 'settings' ? 600 : 400,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            textAlign: 'left',
          }}
        >
          <Icons.Settings />
          <span>设置</span>
        </button>
      </nav>

      {/* Status Footer */}
      <div style={{
        padding: '16px',
        borderTop: `1px solid ${COLORS.borderLight}`,
      }}>
        <div style={{
          padding: '12px',
          background: COLORS.bgSecondary,
          borderRadius: RADIUS.md,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px',
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: COLORS.accent,
              animation: 'pulse 2s infinite',
            }} />
            <span style={{
              fontSize: '12px',
              fontWeight: 500,
              color: COLORS.textPrimary,
            }}>
              系统运行正常
            </span>
          </div>
          <p style={{
            fontSize: '11px',
            color: COLORS.textMuted,
            margin: 0,
          }}>
            GPT服务已连接 · API v1.0
          </p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
