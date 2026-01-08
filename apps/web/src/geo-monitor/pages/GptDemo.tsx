import React, { useState, useEffect, useRef } from 'react';
import { COLORS, RADIUS } from '../styles/theme';
import { Card, Button, Spinner } from '../components/ui';
import { Icons } from '../components/Icons';

const API_PREFIX = (import.meta as any).env?.VITE_API_PREFIX || "/api";
const GPT_API_BASE = (import.meta as any).env?.VITE_GPT_API_BASE || "http://localhost:8000";

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: { title: string; url: string }[];
  timestamp: Date;
}

interface TaskInfo {
  id: string;
  status: string;
  response?: string;
  sources?: { title: string; url: string }[];
  screenshot?: string | null;
}

const GptDemo: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentTask, setCurrentTask] = useState<TaskInfo | null>(null);
  const [enableSearch, setEnableSearch] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [currentScreenshot, setCurrentScreenshot] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 检查连接状态
  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const checkConnection = async () => {
    try {
      const res = await fetch(`${GPT_API_BASE}/health`);
      const data = await res.json();
      setConnectionStatus(data.status === 'ok' ? 'connected' : 'disconnected');
    } catch {
      setConnectionStatus('disconnected');
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }]);
    setIsLoading(true);

    try {
      // 创建任务 - 通过服务端转发
      const createRes = await fetch(`${API_PREFIX}/monitor/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          enable_search: enableSearch
        })
      });
      const createData = await createRes.json();

      if (!createData.task?.id) {
        throw new Error(createData.message || '创建任务失败');
      }

      setCurrentTask({ id: createData.task.id, status: 'pending' });
      setCurrentScreenshot(null);

      // 轮询任务状态
      await pollTaskStatus(createData.task.id);
    } catch (e: any) {
      setMessages(prev => [...prev, {
        role: 'system',
        content: `错误: ${e.message}`,
        timestamp: new Date()
      }]);
      setIsLoading(false);
    }
  };

  const pollTaskStatus = async (taskId: string) => {
    const poll = async () => {
      try {
        // 通过服务端转发，并请求包含截图
        const res = await fetch(`${API_PREFIX}/monitor/tasks/${taskId}?include_screenshot=true`);
        const data = await res.json();

        setCurrentTask({
          id: taskId,
          status: data.status,
          response: data.response,
          sources: data.sources,
          screenshot: data.screenshot
        });

        // 更新截图
        if (data.screenshot) {
          setCurrentScreenshot(data.screenshot);
        }

        if (data.status === 'completed') {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: data.response || '(无响应内容)',
            sources: data.sources,
            timestamp: new Date()
          }]);
          setIsLoading(false);
          setCurrentTask(null);
          setCurrentScreenshot(null);
          return;
        } else if (data.status === 'failed') {
          setMessages(prev => [...prev, {
            role: 'system',
            content: `任务失败: ${data.error || '未知错误'}`,
            timestamp: new Date()
          }]);
          setIsLoading(false);
          setCurrentTask(null);
          setCurrentScreenshot(null);
          return;
        } else if (data.status === 'waiting_login') {
          setMessages(prev => [...prev, {
            role: 'system',
            content: '需要登录 ChatGPT，请在浏览器窗口中完成登录',
            timestamp: new Date()
          }]);
        } else if (data.status === 'waiting_captcha') {
          setMessages(prev => [...prev, {
            role: 'system',
            content: '需要完成验证码，请在浏览器窗口中操作',
            timestamp: new Date()
          }]);
        }

        // 每5秒轮询一次
        setTimeout(poll, 5000);
      } catch (e) {
        setTimeout(poll, 5000);
      }
    };

    poll();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const clearMessages = () => {
    setMessages([]);
    setCurrentScreenshot(null);
    setCurrentTask(null);
  };

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
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
              GPT 脚本演示
            </h1>
            <p style={{
              fontSize: '14px',
              color: COLORS.textSecondary,
            }}>
              通过浏览器自动化与 ChatGPT 进行交互，支持联网搜索
            </p>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: connectionStatus === 'connected' ? '#ECFDF5' : '#FEF2F2',
            borderRadius: RADIUS.full,
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: connectionStatus === 'connected' ? COLORS.accent 
                : connectionStatus === 'checking' ? COLORS.warning 
                : COLORS.error,
              animation: connectionStatus === 'checking' ? 'pulse 2s infinite' : undefined,
            }} />
            <span style={{
              fontSize: '13px',
              fontWeight: 500,
              color: connectionStatus === 'connected' ? '#059669' : '#DC2626',
            }}>
              {connectionStatus === 'connected' ? 'GPT服务已连接' 
                : connectionStatus === 'checking' ? '检查连接中...'
                : '服务未连接'}
            </span>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <Card style={{
        height: 'calc(100vh - 280px)',
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
        overflow: 'hidden',
      }}>
        {/* Messages Area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
        }}>
          {messages.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: COLORS.textMuted,
            }}>
              <div style={{
                fontSize: '48px',
                marginBottom: '16px',
              }}>
                🤖
              </div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 600,
                color: COLORS.textPrimary,
                marginBottom: '8px',
              }}>
                开始对话
              </h3>
              <p style={{
                fontSize: '14px',
                maxWidth: '400px',
                textAlign: 'center',
              }}>
                输入问题，系统将通过浏览器自动化获取 ChatGPT 的回答
              </p>
              
              {/* Quick Prompts */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                marginTop: '24px',
                justifyContent: 'center',
              }}>
                {[
                  '扫地机器人哪个牌子好？',
                  '2024年最值得买的空调',
                  '格力和美的空调对比',
                ].map(prompt => (
                  <button
                    key={prompt}
                    onClick={() => setInput(prompt)}
                    style={{
                      padding: '8px 16px',
                      background: COLORS.bgSecondary,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: RADIUS.full,
                      color: COLORS.textPrimary,
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = COLORS.primary;
                      e.currentTarget.style.color = COLORS.primary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = COLORS.border;
                      e.currentTarget.style.color = COLORS.textPrimary;
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {messages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div style={{
                    maxWidth: '80%',
                    padding: '16px',
                    borderRadius: RADIUS.lg,
                    background: msg.role === 'user' ? COLORS.primary 
                      : msg.role === 'system' ? COLORS.bgTertiary 
                      : COLORS.bgSecondary,
                    color: msg.role === 'user' ? 'white' : COLORS.textPrimary,
                  }}>
                    <p style={{
                      fontSize: '14px',
                      lineHeight: '1.6',
                      whiteSpace: 'pre-wrap',
                      margin: 0,
                    }}>
                      {msg.content}
                    </p>
                    
                    {/* Sources */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div style={{
                        marginTop: '12px',
                        paddingTop: '12px',
                        borderTop: `1px solid ${COLORS.border}`,
                      }}>
                        <p style={{
                          fontSize: '12px',
                          fontWeight: 500,
                          color: COLORS.textSecondary,
                          marginBottom: '8px',
                        }}>
                          引用来源:
                        </p>
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                        }}>
                          {msg.sources.map((source, j) => (
                            <a
                              key={j}
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                fontSize: '12px',
                                color: COLORS.primary,
                                textDecoration: 'none',
                              }}
                            >
                              {source.title || source.url}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <span style={{
                    fontSize: '11px',
                    color: COLORS.textMuted,
                    marginTop: '4px',
                  }}>
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
              ))}

              {/* Loading indicator with screenshot */}
              {isLoading && currentTask && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  maxWidth: '80%',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '16px',
                    background: COLORS.bgSecondary,
                    borderRadius: RADIUS.lg,
                  }}>
                    <Spinner size={16} />
                    <span style={{
                      fontSize: '14px',
                      color: COLORS.textSecondary,
                    }}>
                      {currentTask.status === 'running' ? '正在获取回答...' 
                        : currentTask.status === 'pending' ? '任务排队中...'
                        : currentTask.status === 'waiting_login' ? '等待登录...'
                        : currentTask.status === 'waiting_captcha' ? '等待验证码...'
                        : '处理中...'}
                    </span>
                  </div>
                  
                  {/* Screenshot preview */}
                  {currentScreenshot && (
                    <div style={{
                      borderRadius: RADIUS.lg,
                      overflow: 'hidden',
                      border: `1px solid ${COLORS.border}`,
                      background: COLORS.bgSecondary,
                    }}>
                      <div style={{
                        padding: '8px 12px',
                        borderBottom: `1px solid ${COLORS.border}`,
                        fontSize: '12px',
                        fontWeight: 500,
                        color: COLORS.textSecondary,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}>
                        <span style={{ fontSize: '14px' }}>📸</span>
                        浏览器实时预览
                      </div>
                      <img
                        src={currentScreenshot.startsWith('data:') 
                          ? currentScreenshot 
                          : `data:image/png;base64,${currentScreenshot}`}
                        alt="Browser screenshot"
                        style={{
                          width: '100%',
                          maxHeight: '400px',
                          objectFit: 'contain',
                          display: 'block',
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div style={{
          padding: '16px 24px',
          borderTop: `1px solid ${COLORS.border}`,
          background: COLORS.bgPrimary,
        }}>
          {/* Options */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '12px',
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              color: COLORS.textSecondary,
              cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={enableSearch}
                onChange={(e) => setEnableSearch(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              启用联网搜索
            </label>
            
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearMessages}
                icon={<Icons.X />}
              >
                清空对话
              </Button>
            )}
          </div>

          {/* Input */}
          <div style={{
            display: 'flex',
            gap: '12px',
          }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入您的问题..."
              disabled={isLoading || connectionStatus !== 'connected'}
              style={{
                flex: 1,
                padding: '12px 16px',
                border: `1px solid ${COLORS.border}`,
                borderRadius: RADIUS.md,
                fontSize: '14px',
                resize: 'none',
                height: '48px',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
            <Button
              variant="primary"
              size="lg"
              onClick={sendMessage}
              disabled={!input.trim() || isLoading || connectionStatus !== 'connected'}
              icon={<Icons.ArrowRight />}
              style={{ height: '48px', paddingLeft: '24px', paddingRight: '24px' }}
            >
              发送
            </Button>
          </div>
        </div>
      </Card>

      {/* Tips Card */}
      <Card style={{ marginTop: '16px' }} padding="md">
        <div style={{
          display: 'flex',
          gap: '32px',
          fontSize: '13px',
          color: COLORS.textSecondary,
        }}>
          <div>
            <strong style={{ color: COLORS.textPrimary }}>💡 使用说明</strong>
            <p style={{ marginTop: '4px' }}>确保 GPT 服务已启动并登录 ChatGPT</p>
          </div>
          <div>
            <strong style={{ color: COLORS.textPrimary }}>🔍 联网搜索</strong>
            <p style={{ marginTop: '4px' }}>开启后可获取最新互联网信息</p>
          </div>
          <div>
            <strong style={{ color: COLORS.textPrimary }}>⚡ 快捷键</strong>
            <p style={{ marginTop: '4px' }}>Enter 发送消息</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default GptDemo;
