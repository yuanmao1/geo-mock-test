import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import MonitorCenter from './MonitorCenter';
import BrandDuel from './BrandDuel';
import HistoryPage from './HistoryPage';
import GptDemo from './GptDemo';
import AnalysisDashboard from './AnalysisDashboard';
import { COLORS } from '../styles/theme';
import '../styles/index.css';

type TabType = 'monitor' | 'brand-duel' | 'history' | 'gpt-demo' | 'settings';

interface ViewState {
  type: 'list' | 'detail';
  runId?: string;
  runData?: any;
  runType?: 'category' | 'brand-duel';
}

const GeoMonitorApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('monitor');
  const [viewState, setViewState] = useState<ViewState>({ type: 'list' });

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as TabType);
    setViewState({ type: 'list' });
  };

  const handleViewResult = (runId: string, data?: any, runType?: 'category' | 'brand-duel') => {
    setViewState({
      type: 'detail',
      runId,
      runData: data,
      runType: runType || (activeTab === 'brand-duel' ? 'brand-duel' : 'category'),
    });
  };

  const handleBack = () => {
    setViewState({ type: 'list' });
  };

  const renderContent = () => {
    // 如果在详情视图
    if (viewState.type === 'detail' && viewState.runId) {
      return (
        <AnalysisDashboard
          runId={viewState.runId}
          initialData={viewState.runData}
          type={viewState.runType}
          onBack={handleBack}
        />
      );
    }

    // 列表视图
    switch (activeTab) {
      case 'monitor':
        return <MonitorCenter onViewResult={handleViewResult} />;
      case 'brand-duel':
        return <BrandDuel onViewResult={handleViewResult} />;
      case 'history':
        return <HistoryPage onViewResult={handleViewResult} />;
      case 'gpt-demo':
        return <GptDemo />;
      case 'settings':
        return (
          <div style={{ padding: '40px', textAlign: 'center', color: COLORS.textMuted }}>
            <h2 style={{ color: COLORS.textPrimary, marginBottom: '16px' }}>设置</h2>
            <p>设置页面开发中...</p>
          </div>
        );
      default:
        return <MonitorCenter onViewResult={handleViewResult} />;
    }
  };

  return (
    <div 
      className="geo-monitor"
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: COLORS.bgSecondary,
      }}
    >
      <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />
      
      <main style={{
        flex: 1,
        padding: '32px 40px',
        overflowY: 'auto',
        maxHeight: '100vh',
      }}>
        {renderContent()}
      </main>
    </div>
  );
};

export default GeoMonitorApp;
