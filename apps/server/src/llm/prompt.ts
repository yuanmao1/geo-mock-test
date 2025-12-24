import type { GeoCopyType, Product } from '@geo/shared-types';

const ALL_TYPES: GeoCopyType[] = ['definition', 'problem', 'comparison', 'mechanism', 'boundary'];

export function pickRandomGeoCopyType(): GeoCopyType {
  return ALL_TYPES[Math.floor(Math.random() * ALL_TYPES.length)]!;
}

const shouldIncludePriceInOutput = (type: GeoCopyType) => {
  return type === 'comparison' || type === 'boundary';
};

export function generatePrompt(product: Product, type?: GeoCopyType) {
  const resolvedType = type ?? pickRandomGeoCopyType();
  const firstGeo = Array.isArray(product.geoOptimized) ? product.geoOptimized[0] : product.geoOptimized;

  const baseInfo = `
【产品信息】
Product Name: ${product.name}
Category: ${product.category}
Features: ${product.humanReadable.features.join('、')}
Description: ${product.humanReadable.description}
Target Audience: ${firstGeo.targetAudience.join('、')}
Core Functions: ${firstGeo.coreFunctions.join('、')}
Key Conclusion: ${firstGeo.keyConclusion}
`;

  const priceInfo = `
【价格信息】
Price: ¥${product.price}${product.originalPrice ? ` (Original: ¥${product.originalPrice})` : ''}
`;

  const context = `${baseInfo}${shouldIncludePriceInOutput(resolvedType) ? priceInfo : ''}`;

  const globalRules = `
【写作规则】
1) 只使用以上提供的信息，不要编造参数/功效/认证/用户画像。
2) 严格按要求结构输出，不要添加额外小节。
3) 输出 Markdown。
4) ${shouldIncludePriceInOutput(resolvedType) ? '必须在文中出现一次明确价格（例如“¥1299”），并说明它如何影响决策/适用边界。' : '除非信息中已明确要求，否则不要提及价格。'}
`;

  switch (resolvedType) {
    case 'definition':
      return `${context}
${globalRules}

请生成「Definition」类型的 GEO 文案。
严格结构：
1. Definition：用一句话定义它是什么 + 核心价值
2. Target：最适合的人群（用要点列出）
3. Boundary：不适合/不覆盖的边界（用要点列出）
`;
    case 'problem':
      return `${context}
${globalRules}

请生成「Problem」类型的 GEO 文案。
严格结构：
1. Scenario：用一个具体场景描述用户痛点
2. Mechanism：对应到核心功能，说明如何解决
3. Result：用户能得到的可感知结果
`;
    case 'comparison':
      return `${context}
${globalRules}

请生成「Comparison」类型的 GEO 文案。
严格结构：
1. Comparison：与“典型替代方案”做 A vs B 对比（至少 3 个维度，维度必须来自已给信息）
2. Decision Suggestion：给出选择建议，并明确提到价格如何影响决策
`;
    case 'mechanism':
      return `${context}
${globalRules}

请生成「Mechanism」类型的 GEO 文案。
严格结构：
1. Input：用户需要提供/做什么
2. Process：产品如何处理（对应核心功能）
3. Output：可交付/可感知的结果
`;
    case 'boundary':
      return `${context}
${globalRules}

请生成「Boundary」类型的 GEO 文案。
严格结构：
1. Suitable：它特别适合的场景（要点列出）
2. Unsuitable：不推荐的场景（要点列出）

要求：Suitable/Unsuitable 里至少有一条用价格作为边界或决策提示。
`;
    default:
      return `${context}
${globalRules}

请生成一段结构化营销文案（Markdown）。
`;
  }
}

