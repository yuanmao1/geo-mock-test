import React, { useState, useEffect } from 'react';
import { COLORS, RADIUS } from '../styles/theme';
import { Card, Button, Input, StatusBadge, Spinner, EmptyState } from '../components/ui';
import { Icons } from '../components/Icons';

const API_PREFIX = (import.meta as any).env?.VITE_API_PREFIX || "/api";

interface BrandDuelProps {
  onViewResult: (runId: string, data?: any) => void;
}

interface DuelRound {
  query: string;
  winner: string;
  reason: string;
  detail?: string;
}

interface DuelResult {
  winner: string;
  score: { A: number; B: number; Tie: number };
  verdict: string;
  rounds: DuelRound[];
}

const BrandDuel: React.FC<BrandDuelProps> = ({ onViewResult }) => {
  const [brandA, setBrandA] = useState('');
  const [brandB, setBrandB] = useState('');
  const [category, setCategory] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [result, setResult] = useState<DuelResult | null>(null);
  const [queries, setQueries] = useState<any[]>([]);
  const [recentDuels, setRecentDuels] = useState<any[]>([]);

  useEffect(() => {
    fetchRecentDuels();
  }, []);

  const fetchRecentDuels = async () => {
    try {
      const res = await fetch(`${API_PREFIX}/pipelines/brand-duel?page_size=5`);
      const data = await res.json();
      if (data.runs) {
        setRecentDuels(data.runs);
      }
    } catch (e) {
      console.error('Failed to fetch recent duels:', e);
    }
  };

  const handleStart = async () => {
    if (!brandA.trim() || !brandB.trim() || !category.trim()) return;

    setIsRunning(true);
    setResult(null);
    setQueries([]);

    try {
      const res = await fetch(`${API_PREFIX}/pipelines/brand-duel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandA: brandA.trim(),
          brandB: brandB.trim(),
          category: category.trim()
        })
      });
      const data = await res.json();

      if (data.run_id) {
        setCurrentRunId(data.run_id);
        pollStatus(data.run_id);
      } else {
        throw new Error(data.error || '创建任务失败');
      }
    } catch (e: any) {
      console.error('Error:', e);
      setIsRunning(false);
    }
  };

  const pollStatus = async (runId: string) => {
    const poll = async () => {
      try {
        const res = await fetch(`${API_PREFIX}/pipelines/brand-duel/${runId}`);
        const data = await res.json();

        if (data.queries) {
          setQueries(data.queries);
        }

        if (data.status === 'completed') {
          setIsRunning(false);
          if (data.analysis_result) {
            // 处理分析结果
            const analysisResult = typeof data.analysis_result === 'string' 
              ? JSON.parse(data.analysis_result) 
              : data.analysis_result;
            setResult(analysisResult);
          }
          fetchRecentDuels();
          return;
        } else if (data.status === 'failed') {
          setIsRunning(false);
          return;
        }

        setTimeout(poll, 2000);
      } catch (e) {
        setTimeout(poll, 2000);
      }
    };

    poll();
  };

  const getWinnerColor = (winner: string) => {
    if (winner === brandA) return COLORS.primary;
    if (winner === brandB) return COLORS.chart.orange;
    return COLORS.textMuted;
  };

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
          品牌对抗分析
        </h1>
        <p style={{
          fontSize: '14px',
          color: COLORS.textSecondary,
        }}>
          对比两个品牌在AI搜索中的表现，获得多维度竞争分析
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Left - Input & Results */}
        <div>
          {/* Input Card */}
          <Card style={{ marginBottom: '24px' }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: 600,
              color: COLORS.textPrimary,
              marginBottom: '20px',
            }}>
              设置对抗
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <Input
                label="品牌 A"
                placeholder="例如：格力"
                value={brandA}
                onChange={(e) => setBrandA(e.target.value)}
                disabled={isRunning}
              />
              <Input
                label="品牌 B"
                placeholder="例如：美的"
                value={brandB}
                onChange={(e) => setBrandB(e.target.value)}
                disabled={isRunning}
              />
            </div>

            <Input
              label="产品品类"
              placeholder="例如：空调"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={isRunning}
              style={{ marginBottom: '20px' }}
            />

            <Button
              variant="primary"
              size="lg"
              onClick={handleStart}
              loading={isRunning}
              icon={!isRunning ? <Icons.Zap /> : undefined}
              style={{ width: '100%' }}
              disabled={!brandA || !brandB || !category}
            >
              {isRunning ? '对抗进行中...' : '开始对抗'}
            </Button>
          </Card>

          {/* Progress */}
          {isRunning && queries.length > 0 && (
            <Card style={{ marginBottom: '24px' }}>
              <h3 style={{
                fontSize: '14px',
                fontWeight: 600,
                color: COLORS.textPrimary,
                marginBottom: '16px',
              }}>
                对抗进度
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {queries.map((q, i) => (
                  <div
                    key={q.id || i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      background: COLORS.bgSecondary,
                      borderRadius: RADIUS.md,
                    }}
                  >
                    <StatusBadge status={q.status} size="sm" />
                    <span style={{
                      fontSize: '13px',
                      color: COLORS.textPrimary,
                      flex: 1,
                    }}>
                      {q.query}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Result */}
          {result && (
            <Card>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '24px',
              }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  color: COLORS.textPrimary,
                }}>
                  对抗结果
                </h3>
                <span style={{
                  padding: '6px 16px',
                  borderRadius: RADIUS.full,
                  background: getWinnerColor(result.winner) + '20',
                  color: getWinnerColor(result.winner),
                  fontWeight: 600,
                  fontSize: '14px',
                }}>
                  🏆 {result.winner} 胜出
                </span>
              </div>

              {/* Score */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '40px',
                marginBottom: '24px',
                padding: '20px',
                background: COLORS.bgSecondary,
                borderRadius: RADIUS.lg,
              }}>
                <div style={{ textAlign: 'center' }}>
                  <span style={{
                    display: 'block',
                    fontSize: '36px',
                    fontWeight: 700,
                    color: COLORS.primary,
                  }}>
                    {result.score.A}
                  </span>
                  <span style={{ fontSize: '14px', color: COLORS.textSecondary }}>
                    {brandA}
                  </span>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  color: COLORS.textMuted,
                  fontSize: '24px',
                }}>
                  VS
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{
                    display: 'block',
                    fontSize: '36px',
                    fontWeight: 700,
                    color: COLORS.chart.orange,
                  }}>
                    {result.score.B}
                  </span>
                  <span style={{ fontSize: '14px', color: COLORS.textSecondary }}>
                    {brandB}
                  </span>
                </div>
                {result.score.Tie > 0 && (
                  <>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      color: COLORS.textMuted,
                    }}>
                      |
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{
                        display: 'block',
                        fontSize: '36px',
                        fontWeight: 700,
                        color: COLORS.textMuted,
                      }}>
                        {result.score.Tie}
                      </span>
                      <span style={{ fontSize: '14px', color: COLORS.textSecondary }}>
                        平局
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Verdict */}
              <p style={{
                fontSize: '14px',
                color: COLORS.textSecondary,
                padding: '16px',
                background: COLORS.bgSecondary,
                borderRadius: RADIUS.md,
                borderLeft: `4px solid ${COLORS.primary}`,
              }}>
                {result.verdict}
              </p>
            </Card>
          )}

          {!isRunning && !result && (
            <Card>
              <EmptyState
                icon="⚔️"
                title="开始品牌对抗"
                description="选择两个品牌和品类，系统将生成多个对比问题并通过AI搜索得出结论"
              />
            </Card>
          )}
        </div>

        {/* Right - Rounds & History */}
        <div>
          {/* Rounds Detail */}
          {result && result.rounds && result.rounds.length > 0 && (
            <Card style={{ marginBottom: '24px' }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: 600,
                color: COLORS.textPrimary,
                marginBottom: '20px',
              }}>
                对抗回合详情
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {result.rounds.map((round, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '16px',
                      background: COLORS.bgSecondary,
                      borderRadius: RADIUS.md,
                      borderLeft: `4px solid ${getWinnerColor(round.winner)}`,
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '8px',
                    }}>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        color: COLORS.textPrimary,
                      }}>
                        {round.query}
                      </span>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: getWinnerColor(round.winner),
                        padding: '2px 8px',
                        background: getWinnerColor(round.winner) + '15',
                        borderRadius: RADIUS.sm,
                      }}>
                        {round.winner === 'Tie' ? '平局' : round.winner}
                      </span>
                    </div>
                    <p style={{
                      fontSize: '13px',
                      color: COLORS.textSecondary,
                      marginBottom: round.detail ? '8px' : 0,
                    }}>
                      {round.reason}
                    </p>
                    {round.detail && (
                      <p style={{
                        fontSize: '12px',
                        color: COLORS.textMuted,
                        fontStyle: 'italic',
                      }}>
                        {round.detail}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Recent Duels */}
          <Card>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: 600,
                color: COLORS.textPrimary,
              }}>
                历史对抗
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchRecentDuels}
                icon={<Icons.Refresh />}
              >
                刷新
              </Button>
            </div>

            {recentDuels.length === 0 ? (
              <p style={{
                fontSize: '14px',
                color: COLORS.textMuted,
                textAlign: 'center',
                padding: '40px 0',
              }}>
                暂无对抗记录
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {recentDuels.map(duel => (
                  <div
                    key={duel.id}
                    onClick={() => onViewResult(duel.id, duel)}
                    style={{
                      padding: '16px',
                      background: COLORS.bgSecondary,
                      borderRadius: RADIUS.md,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = COLORS.bgTertiary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = COLORS.bgSecondary;
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px',
                    }}>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        color: COLORS.textPrimary,
                      }}>
                        {duel.brand_a} vs {duel.brand_b}
                      </span>
                      <StatusBadge status={duel.status} size="sm" />
                    </div>
                    <div style={{
                      display: 'flex',
                      gap: '16px',
                      fontSize: '12px',
                      color: COLORS.textMuted,
                    }}>
                      <span>{duel.category}</span>
                      <span>
                        {new Date(duel.created_at).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BrandDuel;
