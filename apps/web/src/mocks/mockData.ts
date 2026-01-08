
export const MOCK_SCAN_RESULT = {
  summary: {
    category: "家用空调 (Home Air Conditioner)",
    total_analyzed: 50,
    market_sentiment: "Positive",
    leaderboard: [
      { brand: "格力 (Gree)", share: 0.35, sentiment: 0.8, rank: 1 },
      { brand: "美的 (Midea)", share: 0.30, sentiment: 0.75, rank: 2 },
      { brand: "海尔 (Haier)", share: 0.15, sentiment: 0.7, rank: 3 },
      { brand: "奥克斯 (AUX)", share: 0.10, sentiment: 0.5, rank: 4 },
      { brand: "小米 (Xiaomi)", share: 0.05, sentiment: 0.6, rank: 5 }
    ]
  },
  key_findings: [
    { type: "positive", text: "用户普遍关注'省电'和'静音'功能，格力在此方面表现突出。" },
    { type: "negative", text: "部分用户抱怨安装服务响应慢，尤其在夏季高峰期。" },
    { type: "trend", text: "智能化控制（App远程操控）成为年轻人选购的重要指标。" }
  ],
  details: [
    { query: "口碑最好的空调", top_brand: "格力", summary: "被推荐为首选，核心制冷技术受认可。", fullText: "..." },
    { query: "性价比高的空调", top_brand: "奥克斯", summary: "奥克斯和小米频繁出现，被认为是由于价格优势。", fullText: "..." },
    { query: "空调售后哪家好", top_brand: "海尔", summary: "海尔售后服务提及率最高，口碑最好。", fullText: "..." }
  ]
};

// Historical Data Mock
export const MOCK_HISTORY_LIST = [
  { id: 'run-123', category: '洗地机', status: 'completed', created_at: '2023-10-24T10:00:00Z', summary: '添可 vs 追觅' },
  { id: 'run-124', category: '降噪耳机', status: 'completed', created_at: '2023-10-25T14:30:00Z', summary: 'Sony vs Bose' },
  { id: 'run-125', category: '家用投影仪', status: 'failed', created_at: '2023-10-26T09:15:00Z', summary: '极米 dominate' },
];

export const MOCK_BATTLE_RESULT = {
  winner: "格力",
  score: { A: 3, B: 1, Tie: 1 }, // 3胜1负1平
  verdict: "格力在核心性能上胜出，美在智能化上占优。",
  rounds: [
    { query: "谁更省电？", winner: "格力", reason: "技术更成熟", detail: "格力掌握核心变频技术，能效比更高。" },
    { query: "谁外观更好看？", winner: "美的", reason: "设计更年轻", detail: "美的线条柔和，配色更符合现代家居审美。" },
    { query: "售后服务谁更好？", winner: "Gree", reason: "网点覆盖更广", detail: "格力承诺十年包修，售后响应速度快。" },
    { query: "性价比谁高？", winner: "Tie", reason: "各有千秋", detail: "同等配置下美的价格更低，但格力耐用性口碑更好。" },
    { query: "制冷速度？", winner: "Gree", reason: "压缩机强劲", detail: "格力冷酷外机技术，高温制冷不衰减。" }
  ]
};
