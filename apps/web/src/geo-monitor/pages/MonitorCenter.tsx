import React, { useState, useEffect } from 'react';
import { COLORS, RADIUS } from '../styles/theme';
import { Card, Button, Input, StatusBadge, ProgressBar, EmptyState, Spinner } from '../components/ui';
import { Icons } from '../components/Icons';
import { mockService } from '../services/mockService';

const API_PREFIX = (import.meta as any).env?.VITE_API_PREFIX || "/api";

interface MonitorCenterProps {
  onViewResult: (runId: string, data?: any) => void;
  mockMode?: boolean;
}

interface QueryItem {
  id: string;
  query: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  response_text?: string;
}

const MonitorCenter: React.FC<MonitorCenterProps> = ({ onViewResult, mockMode = false }) => {
  const [category, setCategory] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [queries, setQueries] = useState<QueryItem[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [recentRuns, setRecentRuns] = useState<any[]>([]);

  // 获取最近运行记录
  useEffect(() => {
    fetchRecentRuns();
  }, [mockMode]);

  const fetchRecentRuns = async () => {
    if (mockMode) {
      setRecentRuns(mockService.getMockHistory());
      return;
    }
    try {
      const res = await fetch(`${API_PREFIX}/pipelines/category?page_size=5`);
      const data = await res.json();
      if (data.runs) {
        setRecentRuns(data.runs);
      }
    } catch (e) {
      console.error('Failed to fetch recent runs:', e);
    }
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('zh-CN');
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleStart = async () => {
    if (!category.trim()) return;
    
    setIsRunning(true);
    setProgress(0);
    setQueries([]);
    setLogs([]);
    addLog('正在提交任务...');

    // Mock模式：使用模拟数据
    if (mockMode) {
      addLog('⚡ Mock模式 - 快速演示流程');
      await mockService.simulateCategoryPipeline(category.trim(), {
        onQueryUpdate: setQueries,
        onLog: addLog,
        onProgress: setProgress,
        onComplete: (result) => {
          setIsRunning(false);
          fetchRecentRuns();
          onViewResult(result.id, result);
        },
      });
      return;
    }

    // 真实模式：调用API
    try {
      const res = await fetch(`${API_PREFIX}/pipelines/category`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: category.trim() })
      });
      const data = await res.json();
      
      if (data.run_id) {
        setCurrentRunId(data.run_id);
        addLog(`任务创建成功，ID: ${data.run_id.slice(0, 8)}...`);
        pollStatus(data.run_id);
      } else {
        throw new Error(data.error || '创建任务失败');
      }
    } catch (e: any) {
      addLog(`错误: ${e.message}`);
      setIsRunning(false);
    }
  };

  const pollStatus = async (runId: string) => {
    const maxAttempts = 120; // 最多轮询2分钟
    let attempts = 0;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        addLog('任务超时');
        setIsRunning(false);
        return;
      }

      attempts++;

      try {
        const res = await fetch(`${API_PREFIX}/pipelines/category/${runId}`);
        const data = await res.json();

        // 更新查询状态
        if (data.queries) {
          setQueries(data.queries);
          const completed = data.queries.filter((q: any) => 
            q.status === 'completed' || q.status === 'failed'
          ).length;
          setProgress(Math.round((completed / data.queries.length) * 100));
        }

        // 检查状态
        if (data.status === 'completed') {
          addLog('分析完成！');
          setIsRunning(false);
          fetchRecentRuns();
          onViewResult(runId, data);
          return;
        } else if (data.status === 'failed') {
          addLog(`任务失败: ${data.error || '未知错误'}`);
          setIsRunning(false);
          return;
        } else if (data.status === 'analyzing') {
          addLog('正在进行AI分析...');
        }

        // 继续轮询
        setTimeout(poll, 2000);
      } catch (e) {
        setTimeout(poll, 2000);
      }
    };

    poll();
  };

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 700,
              color: COLORS.textPrimary,
              marginBottom: '8px',
            }}>
              实时监测中心
            </h1>
            <p style={{
              fontSize: '14px',
              color: COLORS.textSecondary,
            }}>
              输入品类关键词，自动生成多维度查询并分析品牌在AI搜索中的表现
            </p>
          </div>
          {mockMode && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #F59E0B20, #F97316 20)',
              borderRadius: RADIUS.lg,
              border: '1px solid #F59E0B40',
            }}>
              <span style={{ fontSize: '14px' }}>⚡</span>
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#F59E0B' }}>
                Mock演示模式
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>
        {/* Left Panel */}
        <div>
          {/* Input Card */}
          <Card style={{ marginBottom: '24px' }}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: COLORS.textPrimary,
                marginBottom: '8px',
              }}>
                目标品类
              </label>
              <Input
                placeholder="输入品类名称，例如：扫地机器人、空调、耳机..."
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={isRunning}
                icon={<Icons.Search />}
                style={{ fontSize: '16px', padding: '14px 16px 14px 44px' }}
              />
            </div>
            
            <div style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
            }}>
              <Button
                variant="primary"
                size="lg"
                onClick={handleStart}
                loading={isRunning}
                icon={!isRunning ? <Icons.Play /> : undefined}
                style={{ flex: 1 }}
              >
                {isRunning ? '监测进行中...' : '启动监测'}
              </Button>
              
              {isRunning && (
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => setIsRunning(false)}
                  icon={<Icons.Stop />}
                >
                  停止
                </Button>
              )}
            </div>
          </Card>

          {/* Progress Section */}
          {isRunning && queries.length > 0 && (
            <Card style={{ marginBottom: '24px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: COLORS.textPrimary,
                }}>
                  查询进度
                </h3>
                <span style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: COLORS.primary,
                }}>
                  {progress}%
                </span>
              </div>
              
              <ProgressBar value={progress} />

              <div style={{
                marginTop: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxHeight: '240px',
                overflowY: 'auto',
              }}>
                {queries.map((q, i) => (
                  <div
                    key={q.id || i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      background: COLORS.bgSecondary,
                      borderRadius: RADIUS.md,
                    }}
                  >
                    <span style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: q.status === 'completed' ? COLORS.accent 
                        : q.status === 'running' ? COLORS.primary 
                        : q.status === 'failed' ? COLORS.error 
                        : COLORS.border,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      color: 'white',
                      flexShrink: 0,
                    }}>
                      {q.status === 'completed' ? '✓' 
                        : q.status === 'running' ? <Spinner size={12} color="white" />
                        : q.status === 'failed' ? '✗' 
                        : i + 1}
                    </span>
                    <span style={{
                      flex: 1,
                      fontSize: '13px',
                      color: COLORS.textPrimary,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {q.query}
                    </span>
                    <StatusBadge status={q.status as any} size="sm" />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Logs */}
          {logs.length > 0 && (
            <Card>
              <h3 style={{
                fontSize: '14px',
                fontWeight: 600,
                color: COLORS.textPrimary,
                marginBottom: '12px',
              }}>
                运行日志
              </h3>
              <div style={{
                background: '#1E293B',
                borderRadius: RADIUS.md,
                padding: '16px',
                maxHeight: '200px',
                overflowY: 'auto',
                fontFamily: 'monospace',
                fontSize: '12px',
                lineHeight: '1.8',
              }}>
                {logs.map((log, i) => (
                  <div key={i} style={{ color: '#94A3B8' }}>{log}</div>
                ))}
              </div>
            </Card>
          )}

          {/* Empty State */}
          {!isRunning && queries.length === 0 && logs.length === 0 && (
            <Card>
              <EmptyState
                icon="🔍"
                title="开始品类监测"
                description="输入品类关键词，系统将自动生成相关查询，通过AI搜索获取品牌舆情数据"
              />
            </Card>
          )}
        </div>

        {/* Right Panel - Recent Runs */}
        <div>
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
                最近任务
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchRecentRuns}
                icon={<Icons.Refresh />}
              >
                刷新
              </Button>
            </div>

            {recentRuns.length === 0 ? (
              <p style={{
                fontSize: '14px',
                color: COLORS.textMuted,
                textAlign: 'center',
                padding: '40px 0',
              }}>
                暂无任务记录
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {recentRuns.map(run => (
                  <div
                    key={run.id}
                    onClick={() => onViewResult(run.id, run)}
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
                      alignItems: 'flex-start',
                      marginBottom: '8px',
                    }}>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        color: COLORS.textPrimary,
                      }}>
                        {run.category}
                      </span>
                      <StatusBadge status={run.status} size="sm" />
                    </div>
                    <div style={{
                      display: 'flex',
                      gap: '16px',
                      fontSize: '12px',
                      color: COLORS.textMuted,
                    }}>
                      <span>
                        {new Date(run.created_at).toLocaleDateString('zh-CN')}
                      </span>
                      <span>
                        {new Date(run.created_at).toLocaleTimeString('zh-CN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Quick Stats */}
          <Card style={{ marginTop: '16px' }}>
            <h3 style={{
              fontSize: '14px',
              fontWeight: 600,
              color: COLORS.textPrimary,
              marginBottom: '16px',
            }}>
              使用提示
            </h3>
            <div style={{
              fontSize: '13px',
              color: COLORS.textSecondary,
              lineHeight: '1.8',
            }}>
              <p>💡 输入具体的产品品类可以获得更精准的结果</p>
              <p>📊 系统会自动生成10-15个相关查询问题</p>
              <p>⏱️ 完整分析通常需要2-5分钟</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MonitorCenter;
