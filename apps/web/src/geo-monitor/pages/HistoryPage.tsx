import React, { useState, useEffect } from 'react';
import { COLORS, RADIUS } from '../styles/theme';
import { Card, Button, StatusBadge, Tabs, EmptyState, Spinner } from '../components/ui';
import { Icons } from '../components/Icons';
import { mockService } from '../services/mockService';

const API_PREFIX = (import.meta as any).env?.VITE_API_PREFIX || "/api";

interface HistoryPageProps {
  onViewResult: (runId: string, data?: any, type?: 'category' | 'brand-duel') => void;
  mockMode?: boolean;
}

const HistoryPage: React.FC<HistoryPageProps> = ({ onViewResult, mockMode = false }) => {
  const [activeTab, setActiveTab] = useState<'category' | 'brand-duel'>('category');
  const [categoryRuns, setCategoryRuns] = useState<any[]>([]);
  const [brandDuelRuns, setBrandDuelRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    fetchData();
  }, [activeTab, page, mockMode]);

  const fetchData = async () => {
    setLoading(true);
    
    // Mock模式：返回模拟数据
    if (mockMode) {
      if (activeTab === 'category') {
        const mockHistory = mockService.getMockHistory();
        setCategoryRuns(mockHistory);
        setTotal(mockHistory.length);
      } else {
        setBrandDuelRuns([
          { id: 'mock-duel-1', brand_a: '格力', brand_b: '美的', category: '空调', status: 'completed', created_at: new Date(Date.now() - 86400000).toISOString() },
          { id: 'mock-duel-2', brand_a: 'Sony', brand_b: 'Bose', category: '耳机', status: 'completed', created_at: new Date(Date.now() - 172800000).toISOString() },
        ]);
        setTotal(2);
      }
      setLoading(false);
      return;
    }
    
    // 真实模式
    try {
      if (activeTab === 'category') {
        const res = await fetch(`${API_PREFIX}/pipelines/category?page=${page}&page_size=${pageSize}`);
        const data = await res.json();
        setCategoryRuns(data.runs || []);
        setTotal(data.total || 0);
      } else {
        const res = await fetch(`${API_PREFIX}/pipelines/brand-duel?page=${page}&page_size=${pageSize}`);
        const data = await res.json();
        setBrandDuelRuns(data.runs || []);
        setTotal(data.total || 0);
      }
    } catch (e) {
      console.error('Failed to fetch history:', e);
    }
    setLoading(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const totalPages = Math.ceil(total / pageSize);

  const renderCategoryList = () => (
    <table className="geo-table">
      <thead>
        <tr>
          <th style={{ width: '30%' }}>品类</th>
          <th style={{ width: '20%' }}>状态</th>
          <th style={{ width: '20%' }}>查询数</th>
          <th style={{ width: '20%' }}>创建时间</th>
          <th style={{ width: '10%' }}>操作</th>
        </tr>
      </thead>
      <tbody>
        {categoryRuns.map(run => (
          <tr key={run.id}>
            <td>
              <span style={{ fontWeight: 500, color: COLORS.textPrimary }}>
                {run.category}
              </span>
            </td>
            <td>
              <StatusBadge status={run.status} />
            </td>
            <td>
              <span style={{ color: COLORS.textSecondary }}>
                {run.query_count || '-'}
              </span>
            </td>
            <td>
              <span style={{ color: COLORS.textSecondary, fontSize: '13px' }}>
                {formatDate(run.created_at)}
              </span>
            </td>
            <td>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewResult(run.id, run, 'category')}
                icon={<Icons.Eye />}
              >
                查看
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderBrandDuelList = () => (
    <table className="geo-table">
      <thead>
        <tr>
          <th style={{ width: '25%' }}>品牌对抗</th>
          <th style={{ width: '15%' }}>品类</th>
          <th style={{ width: '15%' }}>状态</th>
          <th style={{ width: '15%' }}>结果</th>
          <th style={{ width: '20%' }}>创建时间</th>
          <th style={{ width: '10%' }}>操作</th>
        </tr>
      </thead>
      <tbody>
        {brandDuelRuns.map(run => {
          let winner = '-';
          if (run.status === 'completed' && run.analysis_result) {
            const result = typeof run.analysis_result === 'string' 
              ? JSON.parse(run.analysis_result) 
              : run.analysis_result;
            winner = result.winner || '-';
          }
          return (
            <tr key={run.id}>
              <td>
                <span style={{ fontWeight: 500, color: COLORS.textPrimary }}>
                  {run.brand_a} <span style={{ color: COLORS.textMuted }}>vs</span> {run.brand_b}
                </span>
              </td>
              <td>
                <span style={{ color: COLORS.textSecondary }}>
                  {run.category}
                </span>
              </td>
              <td>
                <StatusBadge status={run.status} />
              </td>
              <td>
                {run.status === 'completed' ? (
                  <span style={{
                    padding: '2px 8px',
                    background: COLORS.primary + '15',
                    color: COLORS.primary,
                    borderRadius: RADIUS.sm,
                    fontSize: '12px',
                    fontWeight: 500,
                  }}>
                    🏆 {winner}
                  </span>
                ) : (
                  <span style={{ color: COLORS.textMuted }}>-</span>
                )}
              </td>
              <td>
                <span style={{ color: COLORS.textSecondary, fontSize: '13px' }}>
                  {formatDate(run.created_at)}
                </span>
              </td>
              <td>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewResult(run.id, run, 'brand-duel')}
                  icon={<Icons.Eye />}
                >
                  查看
                </Button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 700,
          color: COLORS.textPrimary,
          marginBottom: '8px',
        }}>
          历史记录
        </h1>
        <p style={{
          fontSize: '14px',
          color: COLORS.textSecondary,
        }}>
          查看所有监测任务和品牌对抗的历史记录
        </p>
      </div>

      {/* Tabs */}
      <div style={{ marginBottom: '24px' }}>
        <Tabs
          tabs={[
            { id: 'category', label: '品类监测', icon: <Icons.Monitor /> },
            { id: 'brand-duel', label: '品牌对抗', icon: <Icons.BrandDuel /> },
          ]}
          activeTab={activeTab}
          onChange={(id) => {
            setActiveTab(id as any);
            setPage(1);
          }}
        />
      </div>

      {/* Content */}
      <Card>
        {loading ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '60px',
          }}>
            <Spinner size={32} />
          </div>
        ) : (activeTab === 'category' ? categoryRuns : brandDuelRuns).length === 0 ? (
          <EmptyState
            icon="📋"
            title="暂无记录"
            description={`还没有${activeTab === 'category' ? '品类监测' : '品牌对抗'}记录`}
          />
        ) : (
          <>
            {activeTab === 'category' ? renderCategoryList() : renderBrandDuelList()}
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '16px',
                marginTop: '24px',
                paddingTop: '24px',
                borderTop: `1px solid ${COLORS.border}`,
              }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  icon={<Icons.ArrowLeft />}
                >
                  上一页
                </Button>
                <span style={{
                  fontSize: '14px',
                  color: COLORS.textSecondary,
                }}>
                  {page} / {totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  icon={<Icons.ArrowRight />}
                >
                  下一页
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
};

export default HistoryPage;
