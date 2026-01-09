import React, { useState, useEffect } from 'react';
import { COLORS, RADIUS } from '../styles/theme';
import { Card, Button, StatusBadge, Spinner } from '../components/ui';
import { Icons } from '../components/Icons';
import { PieChart, SentimentGauge, CHART_COLORS } from '../components/Charts';
import { mockService } from '../services/mockService';

const API_PREFIX = (import.meta as any).env?.VITE_API_PREFIX || "/api";

interface AnalysisDashboardProps {
  runId: string;
  initialData?: any;
  type?: 'category' | 'brand-duel';
  onBack: () => void;
  mockMode?: boolean;
}

const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({
  runId,
  initialData,
  type = 'category',
  onBack,
  mockMode = false
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeQueryTab, setActiveQueryTab] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [runId]);

  const fetchData = async () => {
    setLoading(true);
    
    // Mock模式
    if (mockMode) {
      const mockData = mockService.getMockRunDetail(
        runId, 
        initialData?.category,
        initialData?.brand_a,
        initialData?.brand_b
      );
      setData(mockData);
      if (mockData.queries && mockData.queries.length > 0) {
        setActiveQueryTab(mockData.queries[0].id);
      }
      setLoading(false);
      return;
    }
    
    // 真实模式 - 始终从后端获取完整数据（包括 queries）
    try {
      const endpoint = type === 'category' 
        ? `${API_PREFIX}/pipelines/category/${runId}`
        : `${API_PREFIX}/pipelines/brand-duel/${runId}`;
      
      const res = await fetch(endpoint);
      const result = await res.json();
      setData(result);
      
      // 设置默认的query tab
      if (result.queries && result.queries.length > 0) {
        setActiveQueryTab(result.queries[0].id);
      }
    } catch (e) {
      console.error('Failed to fetch data:', e);
      // 如果请求失败但有初始数据，回退使用初始数据
      if (initialData) {
        setData(initialData);
        if (initialData.queries && initialData.queries.length > 0) {
          setActiveQueryTab(initialData.queries[0].id);
        }
      }
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '400px',
      }}>
        <Spinner size={40} />
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <p style={{ color: COLORS.textMuted }}>无法加载数据</p>
        <Button variant="secondary" onClick={onBack} style={{ marginTop: '16px' }}>
          返回
        </Button>
      </div>
    );
  }

  // 解析分析结果
  let analysisResult = data.analysis_result;
  if (typeof analysisResult === 'string') {
    try {
      analysisResult = JSON.parse(analysisResult);
    } catch {
      analysisResult = null;
    }
  }

  // 提取品牌数据 (品类监测)
  const extractBrandData = () => {
    if (!analysisResult) return [];
    
    // 处理数组格式
    if (Array.isArray(analysisResult)) {
      return analysisResult.map((item: any, index: number) => ({
        brand: item.brand || item.name || `品牌${index + 1}`,
        rank: item.rank || index + 1,
        share: item.share || (30 - index * 3),
        sentiment: item.sentiment || 'neutral',
        keywords: item.keywords || [],
        strengths: item.strengths || item.advantages || [],
        weaknesses: item.weaknesses || item.disadvantages || [],
        summary: item.summary || '',
      }));
    }
    
    // 处理对象格式
    if (analysisResult.summary?.leaderboard) {
      return analysisResult.summary.leaderboard.map((item: any, index: number) => ({
        brand: item.brand,
        rank: item.rank || index + 1,
        share: (item.share || 0) * 100,
        sentiment: item.sentiment > 0.6 ? 'positive' : item.sentiment < 0.4 ? 'negative' : 'neutral',
        keywords: [],
        strengths: [],
        weaknesses: [],
        summary: '',
      }));
    }

    return [];
  };

  const brandData = extractBrandData();
  const queries = data.queries || [];
  const activeQuery = queries.find((q: any) => q.id === activeQueryTab);

  // 计算统计数据
  const totalMentions = brandData.reduce((sum: number, b: any) => sum + (b.share || 0), 0);
  // 如果整个 run 已完成，完成查询数等于查询总数；否则统计各 query 的 completed 状态
  const completedQueries = data.status === 'completed' 
    ? queries.length 
    : queries.filter((q: any) => q.status === 'completed').length;

  const getSentimentColor = (sentiment: string) => {
    if (sentiment === 'positive' || sentiment?.toLowerCase().includes('positive')) return COLORS.accent;
    if (sentiment === 'negative' || sentiment?.toLowerCase().includes('negative')) return COLORS.error;
    return COLORS.warning;
  };

  const getSentimentLabel = (sentiment: string) => {
    if (sentiment === 'positive' || sentiment?.toLowerCase().includes('positive')) return '正面';
    if (sentiment === 'negative' || sentiment?.toLowerCase().includes('negative')) return '负面';
    return '中性';
  };

  const renderDuelContent = () => {
    if (!analysisResult || type !== 'brand-duel') return null;

    const { winner, score, verdict, rounds } = analysisResult;
    const bA = data.brand_a;
    const bB = data.brand_b;

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>
        <div>
          {/* Winner Card */}
          <Card style={{ marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '120px',
              height: '120px',
              background: COLORS.primary + '10',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '48px',
            }}>
              🏆
            </div>
            
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: COLORS.textPrimary, marginBottom: '16px' }}>
              对决结果
            </h3>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '32px', marginBottom: '24px' }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '14px', color: COLORS.textSecondary, marginBottom: '8px' }}>{bA}</p>
                <div style={{ fontSize: '32px', fontWeight: 700, color: winner === bA ? COLORS.primary : COLORS.textMuted }}>
                  {score?.A || 0}
                </div>
              </div>
              <div style={{ fontSize: '20px', fontWeight: 600, color: COLORS.textMuted }}>VS</div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '14px', color: COLORS.textSecondary, marginBottom: '8px' }}>{bB}</p>
                <div style={{ fontSize: '32px', fontWeight: 700, color: winner === bB ? COLORS.chart.orange : COLORS.textMuted }}>
                  {score?.B || 0}
                </div>
              </div>
            </div>

            <div style={{
              padding: '16px',
              background: COLORS.bgSecondary,
              borderRadius: RADIUS.md,
              borderLeft: `4px solid ${COLORS.primary}`,
            }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: COLORS.textPrimary, marginBottom: '4px' }}>综合判定</p>
              <p style={{ fontSize: '14px', color: COLORS.textSecondary, lineHeight: '1.6' }}>{verdict}</p>
            </div>
          </Card>

          {/* Rounds */}
          <Card>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: COLORS.textPrimary, marginBottom: '20px' }}>
              详细对比
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {rounds?.map((round: any, i: number) => (
                <div key={i} style={{
                  padding: '16px',
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: RADIUS.md,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: COLORS.textPrimary }}>{round.query}</span>
                    <span style={{
                      padding: '2px 8px',
                      background: round.winner === bA ? COLORS.primary + '15' : COLORS.chart.orange + '15',
                      color: round.winner === bA ? COLORS.primary : COLORS.chart.orange,
                      borderRadius: RADIUS.sm,
                      fontSize: '12px',
                      fontWeight: 600,
                    }}>
                      {round.winner === 'Tie' ? '平局' : `${round.winner} 胜`}
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: COLORS.textSecondary, lineHeight: '1.5' }}>
                    {round.detail || round.reason}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div>
          <Card style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: COLORS.textPrimary, marginBottom: '16px' }}>
              对决指标分析
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <p style={{ fontSize: '12px', color: COLORS.textMuted, marginBottom: '8px' }}>搜索提及对比</p>
                <div style={{ height: '8px', background: COLORS.bgSecondary, borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                  <div style={{ width: '65%', background: COLORS.primary }} />
                  <div style={{ width: '35%', background: COLORS.chart.orange }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '4px' }}>
                  <span>{bA} (65%)</span>
                  <span>{bB} (35%)</span>
                </div>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: COLORS.textMuted, marginBottom: '8px' }}>用户情感正向率</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '12px', width: '60px' }}>{bA}</span>
                  <div style={{ flex: 1, height: '6px', background: COLORS.bgSecondary, borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: '82%', background: COLORS.accent }} />
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>82%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                  <span style={{ fontSize: '12px', width: '60px' }}>{bB}</span>
                  <div style={{ flex: 1, height: '6px', background: COLORS.bgSecondary, borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: '75%', background: COLORS.accent }} />
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>75%</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <Button
          variant="ghost"
          onClick={onBack}
          icon={<Icons.ArrowLeft />}
          style={{ marginBottom: '16px' }}
        >
          返回
        </Button>
        
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}>
          <div>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 700,
              color: COLORS.textPrimary,
              marginBottom: '8px',
            }}>
              {type === 'category' ? data.category : `${data.brand_a || '品牌A'} vs ${data.brand_b || '品牌B'}`}
            </h1>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}>
              <StatusBadge status={data.status} />
              <span style={{ fontSize: '14px', color: COLORS.textSecondary }}>
                {data.created_at ? new Date(data.created_at).toLocaleString('zh-CN') : ''}
              </span>
            </div>
          </div>
          
          <Button variant="secondary" icon={<Icons.Download />}>
            导出报告
          </Button>
        </div>
      </div>

      {type === 'brand-duel' ? renderDuelContent() : (
        <>
          {/* Stats Overview */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
            marginBottom: '24px',
          }}>
            <Card padding="md">
              <p style={{ fontSize: '13px', color: COLORS.textSecondary, marginBottom: '8px' }}>
                分析品牌数
              </p>
              <p style={{ fontSize: '28px', fontWeight: 700, color: COLORS.textPrimary }}>
                {brandData.length}
              </p>
            </Card>
            <Card padding="md">
              <p style={{ fontSize: '13px', color: COLORS.textSecondary, marginBottom: '8px' }}>
                完成查询数
              </p>
              <p style={{ fontSize: '28px', fontWeight: 700, color: COLORS.textPrimary }}>
                {completedQueries} / {Math.max(queries.length, 1)}
              </p>
            </Card>
            <Card padding="md">
              <p style={{ fontSize: '13px', color: COLORS.textSecondary, marginBottom: '8px' }}>
                数据来源
              </p>
              <p style={{ fontSize: '28px', fontWeight: 700, color: COLORS.textPrimary }}>
                AI搜索
              </p>
            </Card>
            <Card padding="md">
              <p style={{ fontSize: '13px', color: COLORS.textSecondary, marginBottom: '8px' }}>
                分析状态
              </p>
              <p style={{ fontSize: '28px', fontWeight: 700, color: COLORS.accent }}>
                {data.status === 'completed' ? '已完成' : '进行中'}
              </p>
            </Card>
          </div>

          {/* Main Content */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px' }}>
            {/* Left Column */}
            <div>
              {/* Brand Table - 按图片样式设计 */}
              <Card style={{ marginBottom: '24px' }}>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: COLORS.textPrimary,
                  marginBottom: '20px',
                }}>
                  品牌分析表
                </h3>
                
                <div style={{
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: RADIUS.lg,
                  overflow: 'hidden',
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: COLORS.primary }}>
                        <th style={{
                          padding: '14px 16px',
                          textAlign: 'left',
                          color: 'white',
                          fontSize: '13px',
                          fontWeight: 600,
                        }}>
                          品牌
                        </th>
                        <th style={{
                          padding: '14px 16px',
                          textAlign: 'left',
                          color: 'white',
                          fontSize: '13px',
                          fontWeight: 600,
                        }}>
                          优势
                        </th>
                        <th style={{
                          padding: '14px 16px',
                          textAlign: 'left',
                          color: 'white',
                          fontSize: '13px',
                          fontWeight: 600,
                        }}>
                          弱点
                        </th>
                        <th style={{
                          padding: '14px 16px',
                          textAlign: 'left',
                          color: 'white',
                          fontSize: '13px',
                          fontWeight: 600,
                        }}>
                          主要专业领域
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {brandData.map((brand: any, index: number) => (
                        <tr 
                          key={index}
                          style={{
                            borderBottom: index < brandData.length - 1 ? `1px solid ${COLORS.border}` : 'none',
                          }}
                        >
                          <td style={{
                            padding: '14px 16px',
                            fontWeight: 500,
                            color: COLORS.textPrimary,
                            fontSize: '14px',
                          }}>
                            {brand.brand}
                          </td>
                          <td style={{
                            padding: '14px 16px',
                            color: COLORS.textSecondary,
                            fontSize: '13px',
                          }}>
                            {brand.strengths?.join('、') || brand.summary?.slice(0, 30) || '-'}
                          </td>
                          <td style={{
                            padding: '14px 16px',
                            color: COLORS.textSecondary,
                            fontSize: '13px',
                          }}>
                            {brand.weaknesses?.join('、') || '-'}
                          </td>
                          <td style={{
                            padding: '14px 16px',
                            color: COLORS.textSecondary,
                            fontSize: '13px',
                          }}>
                            {brand.keywords?.slice(0, 3).join('、') || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Citation Stats - 按图片样式 */}
              <Card style={{ marginBottom: '24px' }}>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: COLORS.textPrimary,
                  marginBottom: '8px',
                }}>
                  引用
                </h3>
                <p style={{
                  fontSize: '13px',
                  color: COLORS.textSecondary,
                  marginBottom: '20px',
                }}>
                  网站上的引用、引文和统计数据越多，被人工智能搜索选中并做出响应的可能性就越大。
                </p>
                
                <div style={{
                  display: 'flex',
                  gap: '48px',
                }}>
                  <div>
                    <span style={{ fontSize: '14px', color: COLORS.textSecondary }}>引用率：</span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: COLORS.textPrimary, marginLeft: '8px' }}>1%</span>
                    <span style={{ fontSize: '12px', color: COLORS.textMuted, marginLeft: '8px' }}>(中等-不达)</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '14px', color: COLORS.textSecondary }}>报价比率：</span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: COLORS.textPrimary, marginLeft: '8px' }}>2%</span>
                    <span style={{ fontSize: '12px', color: COLORS.textMuted, marginLeft: '8px' }}>(中等-不达)</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '14px', color: COLORS.textSecondary }}>统计比率：</span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: COLORS.textPrimary, marginLeft: '8px' }}>3%</span>
                    <span style={{ fontSize: '12px', color: COLORS.textMuted, marginLeft: '8px' }}>(中等-不达)</span>
                  </div>
                </div>
              </Card>

              {/* Query Details */}
              {queries.length > 0 && (
                <Card>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: COLORS.textPrimary,
                    marginBottom: '20px',
                  }}>
                    查询详情
                  </h3>
                  
                  {/* Query Tabs */}
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    marginBottom: '16px',
                    flexWrap: 'wrap',
                  }}>
                    {queries.map((q: any, i: number) => (
                      <button
                        key={q.id}
                        onClick={() => setActiveQueryTab(q.id)}
                        style={{
                          padding: '8px 16px',
                          borderRadius: RADIUS.md,
                          border: 'none',
                          background: activeQueryTab === q.id ? COLORS.primary : COLORS.bgSecondary,
                          color: activeQueryTab === q.id ? 'white' : COLORS.textSecondary,
                          fontSize: '13px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        Q{i + 1}
                      </button>
                    ))}
                  </div>

                  {/* Active Query Content */}
                  {activeQuery && (
                    <div style={{
                      padding: '20px',
                      background: COLORS.bgSecondary,
                      borderRadius: RADIUS.lg,
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '16px',
                      }}>
                        <h4 style={{
                          fontSize: '15px',
                          fontWeight: 500,
                          color: COLORS.textPrimary,
                        }}>
                          {activeQuery.query}
                        </h4>
                        <StatusBadge status={activeQuery.status} size="sm" />
                      </div>
                      
                      {activeQuery.response_text ? (
                        <div style={{
                          fontSize: '14px',
                          color: COLORS.textSecondary,
                          lineHeight: '1.8',
                          maxHeight: '300px',
                          overflowY: 'auto',
                          whiteSpace: 'pre-wrap',
                        }}>
                          {activeQuery.response_text}
                        </div>
                      ) : (
                        <p style={{ color: COLORS.textMuted, fontSize: '14px' }}>
                          暂无响应内容
                        </p>
                      )}
                    </div>
                  )}
                </Card>
              )}
            </div>

            {/* Right Column - Charts */}
            <div>
              {/* Brand Share Pie Chart */}
              <Card style={{ marginBottom: '24px' }}>
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
                    品牌搜索
                  </h3>
                  <Button variant="ghost" size="sm">
                    查看详情
                  </Button>
                </div>
                
                <PieChart
                  data={brandData.slice(0, 5).map((b: any, i: number) => ({
                    label: b.brand,
                    value: b.share || 20 - i * 3,
                    color: CHART_COLORS[i],
                  }))}
                  size={160}
                />
              </Card>

              {/* Mention Rate */}
              <Card style={{ marginBottom: '24px' }}>
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
                    品牌被提及率
                  </h3>
                  <span style={{
                    fontSize: '12px',
                    color: COLORS.textMuted,
                  }}>
                    总提及
                  </span>
                </div>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '8px',
                  marginBottom: '16px',
                }}>
                  <span style={{
                    fontSize: '36px',
                    fontWeight: 700,
                    color: COLORS.textPrimary,
                  }}>
                    71.5%
                  </span>
                </div>
                
                {/* Simple line chart representation */}
                <div style={{
                  height: '60px',
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: '4px',
                  paddingTop: '8px',
                }}>
                  {[40, 50, 45, 60, 55, 70, 65, 75, 72].map((h, i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: `${h}%`,
                        background: COLORS.primary + '40',
                        borderRadius: '2px 2px 0 0',
                      }}
                    />
                  ))}
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  color: COLORS.textMuted,
                  marginTop: '8px',
                }}>
                  <span>50%</span>
                  <span>70%</span>
                </div>
              </Card>

              {/* Link Distribution */}
              <Card>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: COLORS.textPrimary,
                  marginBottom: '20px',
                }}>
                  引用链接百分比
                </h3>
                
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <PieChart
                    data={[
                      { label: '官方网站', value: 30, color: COLORS.chart.blue },
                      { label: '电商平台', value: 40, color: COLORS.chart.green },
                      { label: '评测媒体', value: 30, color: COLORS.chart.yellow },
                    ]}
                    size={140}
                    showLegend={true}
                  />
                </div>
                
                <p style={{
                  fontSize: '12px',
                  color: COLORS.textMuted,
                  textAlign: 'center',
                  marginTop: '16px',
                }}>
                  全球链接占引用链接的百分比
                </p>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AnalysisDashboard;
