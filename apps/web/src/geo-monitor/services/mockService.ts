/**
 * GEO Monitor Mock Service
 * 提供Mock模式下的模拟数据和演示流程
 */

// Mock模式的延迟配置
const MOCK_DELAYS = {
  createRun: 500,
  queryStep: 800,
  analysis: 1500,
};

// 模拟的查询列表生成
const generateMockQueries = (category: string) => {
  const queryTemplates = [
    `${category}哪个品牌口碑最好`,
    `最值得购买的${category}推荐`,
    `${category}性价比排行`,
    `2024年${category}十大品牌`,
    `${category}避坑指南`,
    `${category}选购注意事项`,
    `高端${category}和入门级有什么区别`,
    `${category}售后服务哪家好`,
    `${category}最新技术趋势`,
    `国产${category}和进口品牌对比`,
  ];

  return queryTemplates.map((query, index) => ({
    id: `mock-query-${index + 1}`,
    query,
    position: index,
    status: 'pending' as const,
    response_text: null as string | null,
  }));
};

// 模拟的品牌数据
const mockBrandDatasets: Record<string, any[]> = {
  default: [
    {
      brand: '领军品牌A',
      rank: 1,
      share: 32,
      sentiment: 'positive',
      keywords: ['品质', '口碑', '技术领先'],
      strengths: ['技术实力雄厚', '用户口碑极佳', '售后服务完善'],
      weaknesses: ['价格偏高', '部分渠道缺货'],
      summary: '行业领先品牌，用户认可度最高',
    },
    {
      brand: '挑战者品牌B',
      rank: 2,
      share: 28,
      sentiment: 'positive',
      keywords: ['性价比', '创新', '年轻化'],
      strengths: ['价格亲民', '产品迭代快', '营销出色'],
      weaknesses: ['品牌沉淀不足', '高端线薄弱'],
      summary: '快速崛起的挑战者，性价比突出',
    },
    {
      brand: '老牌劲旅C',
      rank: 3,
      share: 20,
      sentiment: 'neutral',
      keywords: ['稳定', '经典', '信赖'],
      strengths: ['品牌历史悠久', '产品线全面', '线下网点多'],
      weaknesses: ['创新速度慢', '年轻用户流失'],
      summary: '传统强者，稳扎稳打',
    },
    {
      brand: '新锐品牌D',
      rank: 4,
      share: 12,
      sentiment: 'neutral',
      keywords: ['智能', '设计', '互联网'],
      strengths: ['互联网基因', '用户体验好', '智能化程度高'],
      weaknesses: ['产品质量待验证', '售后体系不完善'],
      summary: '互联网新贵，潜力巨大',
    },
    {
      brand: '其他品牌',
      rank: 5,
      share: 8,
      sentiment: 'neutral',
      keywords: ['细分市场', '特色'],
      strengths: ['差异化定位'],
      weaknesses: ['市场份额小'],
      summary: '长尾市场参与者',
    },
  ],
  空调: [
    {
      brand: '格力 (Gree)',
      rank: 1,
      share: 35,
      sentiment: 'positive',
      keywords: ['核心技术', '省电', '静音'],
      strengths: ['掌握核心科技', '能效比高', '质量稳定'],
      weaknesses: ['价格偏高', '设计相对保守'],
      summary: '空调行业的绝对领导者，技术实力最强',
    },
    {
      brand: '美的 (Midea)',
      rank: 2,
      share: 30,
      sentiment: 'positive',
      keywords: ['性价比', '智能', '全品类'],
      strengths: ['产品线丰富', '价格适中', '智能化程度高'],
      weaknesses: ['技术积累不如格力', '品牌溢价能力弱'],
      summary: '综合实力强劲的挑战者',
    },
    {
      brand: '海尔 (Haier)',
      rank: 3,
      share: 18,
      sentiment: 'positive',
      keywords: ['服务', '国际化', '创新'],
      strengths: ['售后服务最佳', '国际化程度高', '产品创新多'],
      weaknesses: ['空调不是核心品类', '市场投入分散'],
      summary: '服务标杆，综合家电巨头',
    },
    {
      brand: '奥克斯 (AUX)',
      rank: 4,
      share: 10,
      sentiment: 'neutral',
      keywords: ['价格', '电商', '年轻'],
      strengths: ['价格极具竞争力', '电商渠道强'],
      weaknesses: ['质量口碑一般', '高端产品缺失'],
      summary: '性价比之选，适合预算有限用户',
    },
    {
      brand: '小米 (Xiaomi)',
      rank: 5,
      share: 7,
      sentiment: 'neutral',
      keywords: ['互联网', '智能家居', '生态'],
      strengths: ['IoT生态完善', '年轻人喜爱', '性价比高'],
      weaknesses: ['专业度不足', '售后网点少'],
      summary: '智能家居入口，生态优势明显',
    },
  ],
  扫地机器人: [
    {
      brand: '科沃斯 (Ecovacs)',
      rank: 1,
      share: 28,
      sentiment: 'positive',
      keywords: ['国产领先', '全品类', '技术'],
      strengths: ['产品线最全', '技术迭代快', '售后完善'],
      weaknesses: ['高端价格与国际品牌持平'],
      summary: '国产扫地机器人龙头',
    },
    {
      brand: '石头 (Roborock)',
      rank: 2,
      share: 25,
      sentiment: 'positive',
      keywords: ['算法', '避障', '清洁力'],
      strengths: ['算法领先', '避障能力强', '吸力大'],
      weaknesses: ['基站功能起步晚'],
      summary: '技术驱动型品牌，口碑极佳',
    },
    {
      brand: '追觅 (Dreame)',
      rank: 3,
      share: 20,
      sentiment: 'positive',
      keywords: ['高速', '创新', '性价比'],
      strengths: ['高速数字马达技术', '创新功能多', '价格适中'],
      weaknesses: ['品牌认知度待提升'],
      summary: '后起之秀，技术创新突出',
    },
    {
      brand: '云鲸 (Narwal)',
      rank: 4,
      share: 15,
      sentiment: 'positive',
      keywords: ['拖地', '自清洁', '懒人'],
      strengths: ['拖地效果最佳', '自清洁能力强'],
      weaknesses: ['扫地功能相对弱', '价格高'],
      summary: '拖地专家，差异化定位成功',
    },
    {
      brand: 'iRobot',
      rank: 5,
      share: 12,
      sentiment: 'neutral',
      keywords: ['进口', '稳定', '品牌'],
      strengths: ['品牌历史悠久', '质量稳定'],
      weaknesses: ['性价比低', '功能更新慢'],
      summary: '行业先驱，但已落后国产品牌',
    },
  ],
  耳机: [
    {
      brand: 'Sony',
      rank: 1,
      share: 30,
      sentiment: 'positive',
      keywords: ['降噪', '音质', '旗舰'],
      strengths: ['降噪技术领先', '音质出色', '佩戴舒适'],
      weaknesses: ['价格高', '通话效果一般'],
      summary: '降噪耳机标杆，音质与降噪俱佳',
    },
    {
      brand: 'Apple AirPods',
      rank: 2,
      share: 28,
      sentiment: 'positive',
      keywords: ['生态', '便捷', '时尚'],
      strengths: ['苹果生态无缝衔接', '使用体验极佳', '品牌效应强'],
      weaknesses: ['安卓用户体验差', '性价比不高'],
      summary: '苹果用户首选，体验最佳',
    },
    {
      brand: 'Bose',
      rank: 3,
      share: 18,
      sentiment: 'positive',
      keywords: ['舒适', '降噪', '商务'],
      strengths: ['佩戴最舒适', '降噪效果好', '商务气质'],
      weaknesses: ['音质不如Sony', '外观设计保守'],
      summary: '舒适度之王，商务人士青睐',
    },
    {
      brand: '华为 (Huawei)',
      rank: 4,
      share: 12,
      sentiment: 'neutral',
      keywords: ['鸿蒙', '国产', '性价比'],
      strengths: ['鸿蒙生态', '性价比高', '通话降噪好'],
      weaknesses: ['音质与国际品牌有差距'],
      summary: '华为生态用户优选',
    },
    {
      brand: '森海塞尔',
      rank: 5,
      share: 12,
      sentiment: 'positive',
      keywords: ['HiFi', '专业', '音质'],
      strengths: ['音质顶级', '专业级调音'],
      weaknesses: ['降噪功能弱', '价格昂贵'],
      summary: '发烧友首选，纯粹追求音质',
    },
  ],
};

// 模拟的品牌对决数据
const mockBrandDuelResults: Record<string, any> = {
  default: {
    winner: '品牌A',
    score: { A: 3, B: 2, Tie: 0 },
    verdict: '品牌A在核心性能指标上略胜一筹，但品牌B在性价比方面表现更好。',
    rounds: [
      { query: '核心性能对比', winner: '品牌A', reason: '技术更成熟', detail: '品牌A在核心技术上有更深厚的积累。' },
      { query: '性价比对比', winner: '品牌B', reason: '价格更亲民', detail: '同等配置下品牌B价格优势明显。' },
      { query: '用户口碑对比', winner: '品牌A', reason: '评价更高', detail: '品牌A的用户满意度评分更高。' },
      { query: '售后服务对比', winner: '品牌B', reason: '响应更快', detail: '品牌B的售后响应速度更快。' },
      { query: '创新能力对比', winner: '品牌A', reason: '功能更新快', detail: '品牌A的产品迭代更频繁。' },
    ],
  },
};

// 模拟查询响应文本
const generateMockResponseText = (query: string, category: string): string => {
  const responses: Record<string, string> = {
    口碑: `根据多个平台的用户评价分析，${category}领域中，用户最认可的品牌主要集中在头部几家。消费者普遍关注产品质量、使用体验和售后服务三个维度。`,
    推荐: `综合各大测评机构和用户反馈，${category}的选购建议如下：预算充足优先考虑头部品牌旗舰款；追求性价比可选择中端产品；新手入门建议从知名品牌基础款开始。`,
    排行: `${category}市场份额排行显示，行业集中度较高，前三品牌占据了约70%的市场份额。头部品牌在技术研发和渠道建设上的优势明显。`,
    避坑: `购买${category}需注意：1. 避免过度追求低价产品；2. 注意辨别虚假宣传；3. 关注售后保障政策；4. 根据实际需求选择合适配置。`,
    技术: `${category}最新技术趋势包括：智能化程度提升、能效优化、用户体验改善、环保材料应用等方面的创新。`,
  };

  for (const [keyword, response] of Object.entries(responses)) {
    if (query.includes(keyword)) {
      return response;
    }
  }
  
  return `关于"${query}"的分析：${category}市场竞争激烈，消费者在选购时应综合考虑品牌口碑、产品性能和售后服务等因素。`;
};

// Mock服务接口
export const mockService = {
  /**
   * 获取Mock模式状态
   */
  getMockMode(): boolean {
    const stored = localStorage.getItem('geo_monitor_mock_mode');
    return stored === 'true';
  },

  /**
   * 设置Mock模式状态
   */
  setMockMode(enabled: boolean): void {
    localStorage.setItem('geo_monitor_mock_mode', String(enabled));
  },

  /**
   * 模拟创建品类监测任务
   */
  async createCategoryRun(category: string): Promise<{ run_id: string }> {
    await this.delay(MOCK_DELAYS.createRun);
    return { run_id: `mock-run-${Date.now()}` };
  },

  /**
   * 模拟获取品类监测进度（带状态更新回调）
   */
  async simulateCategoryPipeline(
    category: string,
    callbacks: {
      onQueryUpdate: (queries: any[]) => void;
      onLog: (message: string) => void;
      onProgress: (progress: number) => void;
      onComplete: (result: any) => void;
    }
  ): Promise<void> {
    const queries = generateMockQueries(category);
    
    callbacks.onLog('任务创建成功，开始生成查询...');
    await this.delay(MOCK_DELAYS.createRun);
    
    // 逐步更新查询状态
    for (let i = 0; i < queries.length; i++) {
      queries[i].status = 'running' as any;
      callbacks.onQueryUpdate([...queries]);
      callbacks.onLog(`正在处理: ${queries[i].query}`);
      
      await this.delay(MOCK_DELAYS.queryStep);
      
      queries[i].status = 'completed' as any;
      queries[i].response_text = generateMockResponseText(queries[i].query, category);
      callbacks.onQueryUpdate([...queries]);
      callbacks.onProgress(Math.round(((i + 1) / queries.length) * 90));
    }
    
    callbacks.onLog('查询完成，正在进行AI分析...');
    callbacks.onProgress(95);
    await this.delay(MOCK_DELAYS.analysis);
    
    // 生成最终结果
    const brandData = mockBrandDatasets[category] || mockBrandDatasets.default;
    const result = {
      id: `mock-run-${Date.now()}`,
      category,
      status: 'completed',
      queries,
      analysis_result: brandData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    callbacks.onProgress(100);
    callbacks.onLog('分析完成！');
    callbacks.onComplete(result);
  },

  /**
   * 模拟品牌对决流程
   */
  async simulateBrandDuel(
    brandA: string,
    brandB: string,
    category: string,
    callbacks: {
      onQueryUpdate: (queries: any[]) => void;
      onLog: (message: string) => void;
      onProgress: (progress: number) => void;
      onComplete: (result: any) => void;
    }
  ): Promise<void> {
    const duelQueries = [
      `${brandA}和${brandB}${category}哪个好`,
      `${brandA}${category}优缺点`,
      `${brandB}${category}优缺点`,
      `${brandA}和${brandB}${category}性价比对比`,
      `${brandA}和${brandB}${category}用户评价`,
    ];
    
    const queries = duelQueries.map((query, index) => ({
      id: `mock-duel-query-${index + 1}`,
      query,
      position: index,
      status: 'pending' as const,
      response_text: null as string | null,
    }));
    
    callbacks.onLog('品牌对决任务创建成功...');
    await this.delay(MOCK_DELAYS.createRun);
    
    // 逐步更新查询状态
    for (let i = 0; i < queries.length; i++) {
      queries[i].status = 'running' as any;
      callbacks.onQueryUpdate([...queries]);
      callbacks.onLog(`正在对比: ${queries[i].query}`);
      
      await this.delay(MOCK_DELAYS.queryStep);
      
      queries[i].status = 'completed' as any;
      queries[i].response_text = `${queries[i].query}的分析结果：综合来看两个品牌各有优势...`;
      callbacks.onQueryUpdate([...queries]);
      callbacks.onProgress(Math.round(((i + 1) / queries.length) * 90));
    }
    
    callbacks.onLog('对比完成，正在生成对决结果...');
    callbacks.onProgress(95);
    await this.delay(MOCK_DELAYS.analysis);
    
    // 生成对决结果
    const duelResult = {
      ...mockBrandDuelResults.default,
      winner: Math.random() > 0.5 ? brandA : brandB,
      rounds: [
        { query: '核心性能', winner: brandA, reason: '技术更成熟', detail: `${brandA}在核心技术上有更深厚的积累。` },
        { query: '性价比', winner: brandB, reason: '价格更亲民', detail: `同等配置下${brandB}价格优势明显。` },
        { query: '用户口碑', winner: brandA, reason: '评价更高', detail: `${brandA}的用户满意度评分更高。` },
        { query: '售后服务', winner: brandB, reason: '响应更快', detail: `${brandB}的售后响应速度更快。` },
        { query: '创新能力', winner: brandA, reason: '功能更新快', detail: `${brandA}的产品迭代更频繁。` },
      ],
    };
    
    const result = {
      id: `mock-duel-${Date.now()}`,
      brand_a: brandA,
      brand_b: brandB,
      category,
      status: 'completed',
      queries,
      analysis_result: duelResult,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    callbacks.onProgress(100);
    callbacks.onLog('对决分析完成！');
    callbacks.onComplete(result);
  },

  /**
   * 获取Mock历史记录
   */
  getMockHistory(): any[] {
    return [
      {
        id: 'mock-history-1',
        category: '扫地机器人',
        status: 'completed',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        query_count: 10,
      },
      {
        id: 'mock-history-2',
        category: '空调',
        status: 'completed',
        created_at: new Date(Date.now() - 172800000).toISOString(),
        query_count: 10,
      },
      {
        id: 'mock-history-3',
        category: '耳机',
        status: 'completed',
        created_at: new Date(Date.now() - 259200000).toISOString(),
        query_count: 10,
      },
    ];
  },

  /**
   * 获取Mock运行详情
   */
  getMockRunDetail(runId: string, category?: string, brandA?: string, brandB?: string): any {
    const isDuel = Boolean(brandA && brandB);
    const cat = category || '空调';
    
    if (isDuel) {
      const bA = brandA as string;
      const bB = brandB as string;
      const duelResult = {
        ...mockBrandDuelResults.default,
        winner: Math.random() > 0.5 ? bA : bB,
        rounds: [
          { query: '核心性能', winner: bA, reason: '技术更成熟', detail: `${bA}在核心技术上有更深厚的积累。` },
          { query: '性价比', winner: bB, reason: '价格更亲民', detail: `同等配置下${bB}价格优势明显。` },
          { query: '用户口碑', winner: bA, reason: '评价更高', detail: `${bA}的用户满意度评分更高。` },
          { query: '售后服务', winner: bB, reason: '响应更快', detail: `${bB}的售后响应速度更快。` },
          { query: '创新能力', winner: bA, reason: '功能更新快', detail: `${bA}的产品迭代更频繁。` },
        ],
      };

      return {
        id: runId,
        brand_a: bA,
        brand_b: bB,
        category: cat,
        status: 'completed',
        queries: [], // 对决模式通常展示rounds
        analysis_result: duelResult,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    const brandData = mockBrandDatasets[cat] || mockBrandDatasets.default;
    return {
      id: runId,
      category: cat,
      status: 'completed',
      queries: generateMockQueries(cat).map((q, i) => ({
        ...q,
        status: 'completed',
        response_text: generateMockResponseText(q.query, cat),
      })),
      analysis_result: brandData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  },

  /**
   * 辅助延迟函数
   */
  delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
};

export default mockService;
