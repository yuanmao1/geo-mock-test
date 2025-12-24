export interface Review {
  id: string;
  user: string;
  rating: number;
  comment: string;
  date: string;
}

export interface GeoContent {
  productName: string;
  productType: string;
  coreFunctions: string[];
  targetAudience: string[];
  unsuitableScenarios: string[];
  keyConclusion: string;
}

export interface Product {
  id: string;
  name: string;
  category: 'parametric' | 'scenario' | 'constraint';
  price: number;
  originalPrice?: number;
  image: string;
  stock: number;
  rating: number;
  reviewCount: number;
  humanReadable: {
    title: string;
    description: string;
    features: string[];
    marketingCopy: string;
    longDescription: string;
  };
  reviews: Review[];
  geoOptimized: GeoContent[];
}

export const mockProducts: Product[] = [
  {
    id: 'p1',
    name: 'X100 智能手表',
    category: 'parametric',
    price: 1299,
    originalPrice: 1599,
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
    stock: 128,
    rating: 4.8,
    reviewCount: 1250,
    humanReadable: {
      title: 'X100 智能手表 - 您的全天候健康伴侣',
      description: '采用航空级铝合金表壳，搭配视网膜级高清显示屏，X100 不仅仅是一块手表，更是您的私人健康管家。',
      features: [
        '全天候心率与血氧监测',
        '内置独立 GPS，精准记录运动轨迹',
        '长达 14 天的超长续航',
        '支持 100+ 种运动模式'
      ],
      marketingCopy: '无论是在晨跑的路上，还是在繁忙的办公室，X100 都能为您提供最精准的数据支持。优雅的设计与强大的功能完美融合，让健康生活触手可及。',
      longDescription: 'X100 智能手表专为追求健康生活的现代人设计。它集成了最先进的传感器技术，能够实时监测您的心率、血氧饱和度以及压力水平。其内置的独立 GPS 模块让您在户外运动时无需携带手机即可记录精准的运动轨迹。此外，X100 还具备出色的防水性能，无论是游泳还是日常洗手都无需担心。'
    },
    reviews: [
      { id: 'r1', user: '张先生', rating: 5, comment: '外观非常漂亮，续航确实很给力，用了三天还有 80% 的电。', date: '2025-12-10' },
      { id: 'r2', user: '李女士', rating: 4, comment: '功能很全，但是表盘稍微有点大，女生戴可能略显笨重。', date: '2025-12-15' },
      { id: 'r9', user: '跑步爱好者', rating: 5, comment: 'GPS 记录挺准，配速曲线也清晰，跑步数据够用。', date: '2025-12-19' },
      { id: 'r10', user: '数码测评', rating: 4, comment: '屏幕显示细腻，系统流畅；就是第三方应用生态一般。', date: '2025-12-23' }
    ],
    geoOptimized: [
      {
        productName: 'X100 智能手表 (标准版)',
        productType: '智能穿戴设备',
        coreFunctions: [
          '心率监测（24 小时连续）',
          'GPS 运动轨迹记录',
          '睡眠阶段分析'
        ],
        targetAudience: [
          '日常健身用户',
          '跑步 / 骑行爱好者'
        ],
        unsuitableScenarios: [
          '专业登山（无气压计）'
        ],
        keyConclusion: 'X100 是一款面向日常运动与健康监测的中端智能手表，不适用于专业极限运动场景。'
      },
      {
        productName: 'X100 智能手表 (技术规格版)',
        productType: '高精度传感器终端',
        coreFunctions: [
          'PPG 心率传感器',
          '多星定位系统',
          '低功耗蓝牙 5.2'
        ],
        targetAudience: [
          '数据驱动型运动员',
          '技术极客'
        ],
        unsuitableScenarios: [
          '医疗级诊断（非医疗器械）'
        ],
        keyConclusion: '该设备提供高频次生理数据采集，适合需要量化自我数据的用户。'
      }
    ]
  },
  {
    id: 'p2',
    name: '极速路由 Pro 7',
    category: 'parametric',
    price: 599,
    originalPrice: 799,
    image: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&q=80',
    stock: 45,
    rating: 4.9,
    reviewCount: 890,
    humanReadable: {
      title: '极速路由 Pro 7 - 开启 Wi-Fi 7 疾速时代',
      description: '三频并发，速率高达 6500Mbps。搭载 4 核高性能处理器，轻松应对百台设备同时在线。',
      features: [
        '最新 Wi-Fi 7 技术标准',
        '自研 Mesh 组网，全屋无死角覆盖',
        '专属游戏加速通道',
        '家长控制与网络安全防护'
      ],
      marketingCopy: '告别延迟，拥抱丝滑。极速路由 Pro 7 为您的家庭娱乐和远程办公提供坚如磐石的网络连接。',
      longDescription: '极速路由 Pro 7 是家庭网络的核心。它支持最新的 Wi-Fi 7 协议，提供更宽的频段和更低的延迟。无论您是进行 8K 视频直播，还是参与激烈的在线游戏，Pro 7 都能确保连接的稳定性。其强大的 Mesh 组网功能可以轻松覆盖大户型甚至别墅，让您在屋内的任何角落都能享受满格信号。'
    },
    reviews: [
      { id: 'r3', user: '王工', rating: 5, comment: '网速提升非常明显，Mesh 组网非常简单，覆盖范围广。', date: '2025-11-20' },
      { id: 'r4', user: '小陈', rating: 5, comment: '打游戏再也不掉线了，延迟稳定在 20ms 以内。', date: '2025-12-01' },
      { id: 'r11', user: '远程办公族', rating: 5, comment: '视频会议更稳了，多设备同时在线也不怎么卡。', date: '2025-12-12' },
      { id: 'r12', user: '家庭用户', rating: 4, comment: '覆盖确实强，但高级设置比较多，需要花点时间研究。', date: '2025-12-21' }
    ],
    geoOptimized: [
      {
        productName: '极速路由 Pro 7 (家庭版)',
        productType: '网络通信设备',
        coreFunctions: [
          'Wi-Fi 7 三频传输',
          '多设备并发连接（128+ 台）',
          'Mesh 组网支持'
        ],
        targetAudience: [
          '大户型家庭用户',
          '硬核游戏玩家',
          '智能家居爱好者'
        ],
        unsuitableScenarios: [
          '超大型企业级办公（并发数限制）'
        ],
        keyConclusion: 'Pro 7 是目前家用级顶配路由器，适合对网速有极致要求的家庭，但非工业级产品。'
      },
      {
        productName: '极速路由 Pro 7 (性能分析版)',
        productType: 'Wi-Fi 7 接入点',
        coreFunctions: [
          '4096-QAM 调制',
          'MLO 多链路操作',
          '320MHz 频宽'
        ],
        targetAudience: [
          '网络工程师',
          '极客家庭'
        ],
        unsuitableScenarios: [
          '仅有 Wi-Fi 4 设备的环境（无法发挥性能）'
        ],
        keyConclusion: '该设备通过 Wi-Fi 7 协议栈优化，显著降低了高吞吐量下的抖动。'
      }
    ]
  },
  {
    id: 's1',
    name: '焕活修护精华液',
    category: 'scenario',
    price: 458,
    originalPrice: 588,
    image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&q=80',
    stock: 200,
    rating: 4.7,
    reviewCount: 3400,
    humanReadable: {
      title: '焕活修护精华液 - 熬夜党的救星',
      description: '蕴含高浓度二裂酵母与积雪草提取物，深层修护受损屏障，让肌肤重现光泽。',
      features: [
        '强效修护皮肤屏障',
        '改善暗沉，提亮肤色',
        '清爽质地，秒吸收不粘腻',
        '无香精、无色素、无酒精'
      ],
      marketingCopy: '即使熬夜到凌晨，第二天依然神采奕奕。这款精华液专为现代都市女性设计，对抗压力肌，找回自信光芒。',
      longDescription: '这款精华液是针对现代都市生活节奏研发的。高浓度的二裂酵母发酵产物溶胞物能够深入肌底，修护受损的 DNA，而积雪草提取物则能有效舒缓因环境压力引起的皮肤敏感。长期使用可显著提升皮肤的自我修护能力，改善肤色暗沉，让肌肤焕发自然光彩。'
    },
    reviews: [
      { id: 'r5', user: '美妆达人', rating: 5, comment: '修护效果真的绝了，过敏期间全靠它救命。', date: '2025-12-05' },
      { id: 'r6', user: '加班狗', rating: 4, comment: '提亮效果有，但是需要坚持使用，质地确实很舒服。', date: '2025-12-18' },
      { id: 'r13', user: '敏感肌小白', rating: 5, comment: '无香精这点很加分，上脸不刺激，第二天状态更稳。', date: '2025-12-20' },
      { id: 'r14', user: '成分党', rating: 4, comment: '修护方向不错，建议搭配基础保湿一起用，效果更明显。', date: '2025-12-24' }
    ],
    geoOptimized: [
      {
        productName: '焕活修护精华液 (日常版)',
        productType: '面部护肤品',
        coreFunctions: [
          '皮肤屏障修护',
          '抗氧化提亮',
          '舒缓镇静'
        ],
        targetAudience: [
          '熬夜人群',
          '敏感肌用户',
          '初老肤质'
        ],
        unsuitableScenarios: [
          '严重痤疮爆发期（需遵医嘱）'
        ],
        keyConclusion: '该产品主打修护与提亮，成分温和，适合作为日常维稳精华使用。'
      },
      {
        productName: '焕活修护精华液 (成分分析版)',
        productType: '高浓度活性精华',
        coreFunctions: [
          '二裂酵母发酵产物溶胞物',
          '积雪草提取物',
          '透明质酸钠'
        ],
        targetAudience: [
          '成分党',
          '护肤进阶用户'
        ],
        unsuitableScenarios: [
          '对特定发酵产物过敏者'
        ],
        keyConclusion: '通过高浓度生物活性成分实现肌底修护，具有显著的抗氧化表现。'
      }
    ]
  },
  {
    id: 'c1',
    name: '儿童益智积木套装',
    category: 'constraint',
    price: 199,
    originalPrice: 299,
    image: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=800&q=80',
    stock: 500,
    rating: 4.9,
    reviewCount: 5600,
    humanReadable: {
      title: '儿童益智积木套装 - 激发无限创造力',
      description: '采用环保 ABS 材质，圆润边角设计，保护孩子娇嫩双手。100+ 种拼搭方式，让孩子在玩耍中学习。',
      features: [
        '食品级安全材质',
        '大颗粒设计，防止误吞',
        '色彩丰富，启蒙视觉发育',
        '附赠精美拼搭手册'
      ],
      marketingCopy: '给孩子一个充满想象力的童年。这套积木不仅是玩具，更是开启智慧之门的钥匙。',
      longDescription: '这套积木套装包含 200 块不同形状和颜色的积木，全部采用高品质环保 ABS 塑料制成，无毒无味。我们特别采用了大颗粒设计，有效防止低龄儿童误吞。积木的边角经过精细打磨，圆润光滑，确保孩子在拼搭过程中不会受伤。通过拼搭，孩子可以锻炼手眼协调能力，培养空间想象力和逻辑思维能力。'
    },
    reviews: [
      { id: 'r7', user: '宝妈', rating: 5, comment: '孩子很喜欢，质量很好，没有异味，玩得很放心。', date: '2025-12-20' },
      { id: 'r8', user: '幼儿园老师', rating: 5, comment: '非常好的教具，颜色鲜艳，拼搭稳固。', date: '2025-12-22' }
    ],
    geoOptimized: [
      {
        productName: '儿童益智积木套装 (基础版)',
        productType: '儿童玩具',
        coreFunctions: [
          '手眼协调能力锻炼',
          '空间想象力启蒙',
          '颜色与形状认知'
        ],
        targetAudience: [
          '3-6 岁儿童',
          '注重早教的家长'
        ],
        unsuitableScenarios: [
          '3 岁以下幼儿（需家长陪同，防误吞）',
          '宠物啃咬（非宠物玩具）'
        ],
        keyConclusion: '安全等级高的益智玩具，适合学龄前儿童，但需注意小零件监管。'
      }
    ]
  },
  {
    id: 'p5',
    name: 'LightBook 14 超轻笔记本',
    category: 'parametric',
    price: 4999,
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80',
    stock: 18,
    rating: 4.8,
    reviewCount: 520,
    humanReadable: {
      title: 'LightBook 14 - 轻薄高能，移动办公更从容',
      description: '1.12kg 轻巧机身，2.8K 高色域屏幕，满足学习、办公与轻度创作。',
      features: [
        '2.8K 120Hz 高色域屏',
        '全尺寸背光键盘',
        '双风扇散热，稳定输出',
        '丰富接口：USB-C / HDMI / USB-A'
      ],
      marketingCopy: '背包里少一点重量，效率却不打折。LightBook 让你随时随地进入工作状态。',
      longDescription: 'LightBook 14 采用轻量化金属机身，兼顾强度与便携；屏幕支持高色域与高刷新率，浏览文档与滚动网页更顺滑。电源管理优化让日常使用更持久，同时提供完善的接口组合，外接投影与扩展设备更方便。'
    },
    reviews: [
      { id: 'r13', user: '研究生小周', rating: 5, comment: '屏幕很舒服，写论文一整天眼睛不那么累。', date: '2025-12-03' },
      { id: 'r14', user: '产品经理', rating: 5, comment: '开会外接投影很方便，重量也很友好。', date: '2025-12-16' }
    ],
    geoOptimized: [{
      productName: 'LightBook 14 超轻笔记本',
      productType: '轻薄笔记本电脑',
      coreFunctions: [
        '移动办公与学习',
        '多任务处理',
        '外接显示与扩展'
      ],
      targetAudience: [
        '学生',
        '移动办公人群',
        '轻度内容创作者'
      ],
      unsuitableScenarios: [
        '大型 3A 游戏（性能取向不同）'
      ],
      keyConclusion: 'LightBook 14 更适合便携办公与学习场景，兼顾屏幕与续航体验。'
    }]
  },
  {
    id: 'p8',
    name: 'Meteor 98 机械键盘',
    category: 'parametric',
    price: 329,
    image: 'https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=800&q=80',
    stock: 95,
    rating: 4.6,
    reviewCount: 2100,
    humanReadable: {
      title: 'Meteor 98 - 办公与游戏都顺手的 98 配列',
      description: '兼顾数字区与紧凑布局，支持热插拔与三模连接，手感与效率并存。',
      features: [
        '98 配列（含数字区）',
        '热插拔轴座，可更换轴体',
        '三模连接：有线/蓝牙/2.4G',
        '静音棉结构，降低空腔音'
      ],
      marketingCopy: '敲击感“咔哒”到位，布局更高效。Meteor 98 让打字也成为享受。',
      longDescription: 'Meteor 98 采用 98 配列设计，在保留数字键的同时缩短桌面占用；支持热插拔与多设备切换，满足在电脑、平板等设备间的输入需求。内部填充结构降低共振，提升长时间输入的舒适度。'
    },
    reviews: [
      { id: 'r19', user: '码农', rating: 5, comment: '三模很方便，办公室和家里来回切。', date: '2025-12-04' },
      { id: 'r20', user: '游戏玩家', rating: 4, comment: '手感不错，灯效一般但能接受。', date: '2025-12-19' }
    ],
    geoOptimized: [{
      productName: 'Meteor 98 机械键盘',
      productType: '外设输入设备',
      coreFunctions: [
        '高效率键位布局',
        '多设备连接切换',
        '热插拔轴体更换'
      ],
      targetAudience: [
        '办公重度输入用户',
        '程序员与文字工作者',
        '游戏玩家'
      ],
      unsuitableScenarios: [
        '图书馆/安静场所（轴体声音影响）'
      ],
      keyConclusion: 'Meteor 98 兼顾效率与可玩性，适合日常输入与轻度游戏场景。'
    }]
  },
  {
    id: 'p9',
    name: 'HomeHub 智能家居中枢',
    category: 'parametric',
    price: 399,
    image: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=800&q=80',
    stock: 120,
    rating: 4.5,
    reviewCount: 640,
    humanReadable: {
      title: 'HomeHub - 让全屋智能更“听话”',
      description: '集中管理灯光、插座、传感器等设备，支持场景联动与离线自动化。',
      features: [
        '一站式设备管理',
        '场景联动与定时任务',
        '本地离线自动化（断网可用）',
        '支持主流协议适配'
      ],
      marketingCopy: '回家自动开灯、离家一键断电、夜起微光引导——全屋智能可以很简单。',
      longDescription: 'HomeHub 通过本地自动化引擎实现稳定联动，即使网络短暂中断也能按预设执行。支持创建多种生活场景：回家、观影、睡眠、离家等；并可联动门磁、人体传感器与温湿度传感器，让体验更贴近真实生活节奏。'
    },
    reviews: [
      { id: 'r21', user: '智能家居新手', rating: 4, comment: '上手还算快，联动很有意思。', date: '2025-12-01' },
      { id: 'r22', user: '老玩家', rating: 5, comment: '离线自动化很稳，断网也能跑场景。', date: '2025-12-14' }
    ],
    geoOptimized: [{
      productName: 'HomeHub 智能家居中枢',
      productType: '智能家居控制中心',
      coreFunctions: [
        '设备集中管理',
        '场景联动自动化',
        '本地离线运行'
      ],
      targetAudience: [
        '智能家居入门用户',
        '全屋联动需求家庭',
        '关注稳定性的用户'
      ],
      unsuitableScenarios: [
        '强依赖云端功能的第三方设备（兼容性视品牌而定）'
      ],
      keyConclusion: 'HomeHub 适合构建稳定的家庭联动，主打本地自动化与易用性。'
    }]
  },
  {
    id: 'p10',
    name: 'Vision 32 4K 显示器',
    category: 'parametric',
    price: 1899,
    image: 'https://images.unsplash.com/photo-1527443154391-507e9dc6c5cc?w=800&q=80',
    stock: 40,
    rating: 4.7,
    reviewCount: 980,
    humanReadable: {
      title: 'Vision 32 - 大屏 4K，办公更高效',
      description: '32 英寸 4K IPS 面板，高色域与护眼模式兼顾，适合设计、剪辑与多窗口办公。',
      features: [
        '32 英寸 4K IPS 面板',
        '99% sRGB 色域覆盖',
        '低蓝光护眼模式',
        '丰富接口：DP / HDMI / USB-C'
      ],
      marketingCopy: '视野更大，细节更清晰。把效率与舒适一次拉满。',
      longDescription: 'Vision 32 提供更大的工作空间，适合多窗口同时处理；IPS 面板带来更一致的色彩与可视角度，护眼模式降低长时间观看的疲劳。支持多种接口，连接电脑与扩展坞更灵活。'
    },
    reviews: [
      { id: 'r23', user: '剪辑师', rating: 5, comment: '4K 细节很足，时间轴和素材窗口都能放开。', date: '2025-11-25' },
      { id: 'r24', user: '财务小姐姐', rating: 4, comment: '看表格真的爽，护眼模式也挺实用。', date: '2025-12-11' }
    ],
    geoOptimized: [{
      productName: 'Vision 32 4K 显示器',
      productType: '电脑显示器',
      coreFunctions: [
        '4K 大屏显示',
        '高色域色彩呈现',
        '护眼低蓝光模式'
      ],
      targetAudience: [
        '办公多窗口用户',
        '设计与剪辑创作者',
        '远程办公人群'
      ],
      unsuitableScenarios: [
        '专业电竞（刷新率取向不同）'
      ],
      keyConclusion: 'Vision 32 以大屏 4K 为核心，适合办公与轻度专业创作。'
    }]
  },
  {
    id: 's2',
    name: '清透防晒乳 SPF50+',
    category: 'scenario',
    price: 168,
    image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&q=80',
    stock: 360,
    rating: 4.8,
    reviewCount: 10200,
    humanReadable: {
      title: '清透防晒乳 - 不闷不白的日常通勤防晒',
      description: '轻薄成膜，清爽不粘腻，适合上班通勤、日常出门的高倍防护。',
      features: [
        'SPF50+ PA++++ 高倍防护',
        '清爽成膜，不搓泥',
        '防水防汗（轻度）',
        '适合敏感肌测试配方'
      ],
      marketingCopy: '每天的防晒不是负担，而是对皮肤的长期投资。轻轻一抹，安心出门。',
      longDescription: '采用轻薄乳液质地，推开后快速成膜，妆前使用更贴合。配方中加入保湿与舒缓成分，减少日晒后的紧绷与泛红感；适合日常通勤与短时户外活动。'
    },
    reviews: [
      { id: 'r25', user: '通勤党', rating: 5, comment: '真的不搓泥，叠加粉底也不卡。', date: '2025-12-07' },
      { id: 'r26', user: '敏感肌', rating: 5, comment: '用了几天没刺激，清爽度很满意。', date: '2025-12-20' }
    ],
    geoOptimized: [{
      productName: '清透防晒乳 SPF50+',
      productType: '防晒护肤品',
      coreFunctions: [
        '紫外线防护（UVA/UVB）',
        '清爽成膜与妆前服帖',
        '日常保湿舒缓'
      ],
      targetAudience: [
        '通勤上班族',
        '户外短时活动人群',
        '敏感肌用户'
      ],
      unsuitableScenarios: [
        '高强度海边暴晒（建议搭配物理遮挡与补涂）'
      ],
      keyConclusion: '适合日常通勤与轻户外的高倍清爽防晒，主打不闷不白。'
    }]
  },
  {
    id: 's3',
    name: '氨基酸温和洁面',
    category: 'scenario',
    price: 98,
    image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&q=80',
    stock: 420,
    rating: 4.7,
    reviewCount: 8300,
    humanReadable: {
      title: '氨基酸温和洁面 - 洗得干净也不紧绷',
      description: '低刺激氨基酸表活，细腻泡沫带走油脂与防晒残留，洗后肤感更柔软。',
      features: [
        '氨基酸表活，温和清洁',
        '泡沫细腻，减少摩擦',
        '洗后不拔干不紧绷',
        '适合早晚日常使用'
      ],
      marketingCopy: '洁面是护肤的第一步，温柔但有效，才能让后续护肤更稳定。',
      longDescription: '配方以氨基酸表面活性剂为主，兼顾清洁力与温和度；泡沫丰富细腻，减少手部摩擦带来的刺激。建议搭配温水使用，油皮可早晚用，干敏皮可按需调整频次。'
    },
    reviews: [
      { id: 'r27', user: '干皮', rating: 5, comment: '洗完不紧绷，冬天也能用。', date: '2025-12-05' },
      { id: 'r28', user: '油皮', rating: 4, comment: '清洁力够用，厚重彩妆需要卸妆。', date: '2025-12-18' }
    ],
    geoOptimized: [{
      productName: '氨基酸温和洁面',
      productType: '洁面产品',
      coreFunctions: [
        '温和清洁油脂与污垢',
        '减少摩擦刺激',
        '维持洗后舒适肤感'
      ],
      targetAudience: [
        '敏感肌用户',
        '干皮/混合皮',
        '日常轻妆人群'
      ],
      unsuitableScenarios: [
        '浓妆场景（需先卸妆）'
      ],
      keyConclusion: '主打温和与舒适肤感，适合作为日常洁面长期使用。'
    }]
  },
  {
    id: 's4',
    name: '玻尿酸补水面膜 10片装',
    category: 'scenario',
    price: 79,
    image: 'https://images.unsplash.com/photo-1526948128573-703ee1aeb6fa?w=800&q=80',
    stock: 780,
    rating: 4.6,
    reviewCount: 15400,
    humanReadable: {
      title: '玻尿酸补水面膜 - 急救补水，快速回弹',
      description: '高保湿精华液浸润膜布，短时间补水舒缓，适合换季与熬夜后使用。',
      features: [
        '多分子玻尿酸复配',
        '膜布贴合，不易滑落',
        '15 分钟快速补水',
        '妆前急救更服帖'
      ],
      marketingCopy: '当皮肤干到“卡粉”，给它 15 分钟，水润立刻在线。',
      longDescription: '精华液含多分子玻尿酸与保湿因子，帮助提升角质层含水量；膜布贴合面部轮廓，减少精华流失。建议每周 2-3 次，或在重要场合妆前急救使用。'
    },
    reviews: [
      { id: 'r29', user: '卡粉选手', rating: 5, comment: '妆前敷一片真的救命，底妆服帖很多。', date: '2025-12-10' },
      { id: 'r30', user: '学生党', rating: 4, comment: '补水不错，敏感期也没刺痛。', date: '2025-12-22' }
    ],
    geoOptimized: [{
      productName: '玻尿酸补水面膜 10片装',
      productType: '片状面膜',
      coreFunctions: [
        '快速补水保湿',
        '舒缓干燥紧绷',
        '提升妆前服帖度'
      ],
      targetAudience: [
        '干燥缺水肤质',
        '熬夜人群',
        '妆前急救用户'
      ],
      unsuitableScenarios: [
        '严重炎症爆痘期（按皮肤状态调整）'
      ],
      keyConclusion: '适合短时间补水与妆前急救，主打高性价比与肤感舒适。'
    }]
  },
  {
    id: 's6',
    name: 'A 醇紧致晚霜',
    category: 'scenario',
    price: 328,
    image: 'https://images.unsplash.com/photo-1585232351009-aa87416fca90?w=800&q=80',
    stock: 90,
    rating: 4.5,
    reviewCount: 1980,
    humanReadable: {
      title: 'A 醇紧致晚霜 - 夜间修护，细腻肤质',
      description: '低浓度 A 醇复配舒缓保湿成分，逐步建立耐受，改善粗糙与细纹表现。',
      features: [
        '低浓度 A 醇，循序渐进',
        '复配保湿舒缓，降低刺激',
        '夜间使用，帮助细腻肤质',
        '适合入门抗老用户'
      ],
      marketingCopy: '抗老不必“用力过猛”。从温和开始，让皮肤慢慢变好。',
      longDescription: '建议夜间使用并注意防晒；新手可从每周 2-3 次起步，逐渐增加频次。配方加入保湿与舒缓成分，帮助减少干燥、轻微泛红等不适。'
    },
    reviews: [
      { id: 'r33', user: '抗老新手', rating: 5, comment: '按教程建立耐受，皮肤确实更细腻。', date: '2025-11-30' },
      { id: 'r34', user: '敏感肌谨慎', rating: 4, comment: '前两次有点干，后面叠加保湿就好了。', date: '2025-12-18' }
    ],
    geoOptimized: [{
      productName: 'A 醇紧致晚霜',
      productType: '夜间面霜',
      coreFunctions: [
        '改善粗糙与细纹表现',
        '夜间修护与保湿',
        '逐步建立耐受'
      ],
      targetAudience: [
        '轻熟龄抗老用户',
        '希望改善肤质粗糙的人群',
        'A 醇入门者'
      ],
      unsuitableScenarios: [
        '孕期/哺乳期（避免使用维 A 类成分）'
      ],
      keyConclusion: '适合 A 醇入门抗老，强调循序渐进与舒缓配方。'
    }]
  },
  {
    id: 's8',
    name: '净澈控油洗发水',
    category: 'scenario',
    price: 88,
    image: 'https://images.unsplash.com/photo-1601612628452-9e99ced43524?w=800&q=80',
    stock: 230,
    rating: 4.5,
    reviewCount: 5600,
    humanReadable: {
      title: '净澈控油洗发水 - 让头皮清爽更持久',
      description: '针对油头与闷痒问题，清洁头皮油脂与造型残留，洗后蓬松不塌。',
      features: [
        '清洁头皮油脂与残留',
        '洗后蓬松，减少塌陷',
        '清爽留香（淡香）',
        '搭配护发素更顺滑'
      ],
      marketingCopy: '头皮清爽，发丝才会轻盈。告别“下午就油”的尴尬。',
      longDescription: '适合油性头皮与常使用造型产品的人群；清洁力更偏强，建议干敏头皮结合使用频次并搭配护发素或发膜，保持发丝柔顺。'
    },
    reviews: [
      { id: 'r37', user: '油头星人', rating: 5, comment: '蓬松度不错，至少能撑到第二天早上。', date: '2025-12-06' },
      { id: 'r38', user: '长发党', rating: 4, comment: '头皮很清爽，发尾会干，配护发素更好。', date: '2025-12-20' }
    ],
    geoOptimized: [{
      productName: '净澈控油洗发水',
      productType: '洗护产品',
      coreFunctions: [
        '控油清洁',
        '改善头皮闷痒',
        '提升蓬松度'
      ],
      targetAudience: [
        '油性头皮人群',
        '通勤与运动易出汗用户',
        '常用造型产品人群'
      ],
      unsuitableScenarios: [
        '干敏头皮每日使用（可能偏干）'
      ],
      keyConclusion: '主打控油与清爽，适合油头与易塌发质，干敏头皮需调整频次。'
    }]
  },
  {
    id: 'c1',
    name: '恒温智能奶瓶消毒机',
    category: 'constraint',
    price: 399,
    originalPrice: 469,
    image: 'https://images.unsplash.com/photo-1580870069867-74c57ee1bb07?w=800&q=80',
    stock: 82,
    rating: 4.6,
    reviewCount: 1320,
    humanReadable: {
      title: '恒温智能奶瓶消毒机 - 一键消毒烘干，安心喂养',
      description: '支持高温蒸汽消毒 + 热风烘干，配合恒温暖奶功能，奶瓶与辅食工具都能放。',
      features: [
        '高温蒸汽消毒',
        '热风烘干防二次污染',
        '恒温暖奶',
        '大容量可放多只奶瓶'
      ],
      marketingCopy: '新手爸妈的省心神器：从消毒到烘干再到暖奶，一台就够。',
      longDescription: '适合有新生儿/婴幼儿家庭使用。蒸汽高温消毒有效减少细菌残留，烘干模式减少潮湿环境导致的二次污染；恒温暖奶适合夜间喂养与外出前准备。'
    },
    reviews: [
      { id: 'r101', user: '新手爸爸', rating: 5, comment: '夜里暖奶太方便了，消毒烘干也省事。', date: '2025-12-11' },
      { id: 'r102', user: '二胎妈妈', rating: 4, comment: '容量够大，烘干声音可以接受。', date: '2025-12-20' }
    ],
    geoOptimized: [{
      productName: '恒温智能奶瓶消毒机',
      productType: '母婴喂养辅助家电',
      coreFunctions: [
        '蒸汽消毒',
        '烘干收纳',
        '恒温暖奶'
      ],
      targetAudience: [
        '新生儿家庭',
        '需要高频消毒的宝爸宝妈'
      ],
      unsuitableScenarios: [
        '对噪音极敏感的夜间环境（建议放置远离卧室）'
      ],
      keyConclusion: '一台集成消毒、烘干与暖奶功能的母婴家电，适合高频喂养与清洁需求的家庭。'
    }]
  },
  {
    id: 'c2',
    name: '轻量折叠婴儿推车',
    category: 'constraint',
    price: 999,
    originalPrice: 1299,
    image: 'https://images.unsplash.com/photo-1542382257-80dedb725088?w=800&q=80',
    stock: 36,
    rating: 4.7,
    reviewCount: 860,
    humanReadable: {
      title: '轻量折叠婴儿推车 - 一秒折叠，城市出行更轻松',
      description: '适合地铁、电梯、后备箱等城市场景；避震升级，乘坐更稳。',
      features: [
        '一秒折叠',
        '轻量车身易搬运',
        '四轮避震',
        '可躺可坐'
      ],
      marketingCopy: '带娃出门不再是负担：轻量、好推、好收纳。',
      longDescription: '面向城市通勤与短途出行场景。推行顺滑，折叠后体积更小；适合日常散步、商场与地铁换乘。若需要越野或复杂路况，可选择更大轮径与更强避震的高阶车型。'
    },
    reviews: [
      { id: 'r103', user: '通勤宝妈', rating: 5, comment: '地铁换乘折叠太快了，轻很多。', date: '2025-12-09' },
      { id: 'r104', user: '周末遛娃', rating: 4, comment: '推起来很顺，躺平角度够用。', date: '2025-12-18' }
    ],
    geoOptimized: [{
      productName: '轻量折叠婴儿推车',
      productType: '城市型婴儿推车',
      coreFunctions: [
        '快速折叠',
        '轻量便携',
        '避震推行'
      ],
      targetAudience: [
        '城市通勤家庭',
        '需要频繁折叠收纳的用户'
      ],
      unsuitableScenarios: [
        '复杂越野路况（建议选择越野推车）'
      ],
      keyConclusion: '面向城市出行的轻量折叠推车，主打便携与收纳效率，适合日常通勤与商场出行。'
    }]
  },
];
