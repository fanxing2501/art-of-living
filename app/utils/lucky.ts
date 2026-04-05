import { getBaziInfo } from './bazi';

export interface ReadingParams {
  name: string;
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthHour: number;
  gender: '男' | '女';
  weatherCode: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDir: string;
  description: string;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  currentHour: number;
}

export interface ColorInfo {
  name: string;
  hex: string;
  reason?: string;
}

export interface FoodInfo {
  name: string;
  reason: string;
  emoji: string;
}

export interface FortuneCategory {
  name: string;
  emoji: string;
  rating: number; // 1-5 (internal use for content selection)
  summary: string;
  advice: string;
  goodFor: string[];
  badFor: string[];
  keyword: string;
  song: { title: string; artist: string; songId: number };
}

export interface DailyReading {
  luckyColor: ColorInfo & { reason: string };
  luckyColors: ColorInfo[];
  foods: FoodInfo[];
  avoidFoods: FoodInfo[];
  luckyNumber: number;
  luckyDirection: string;
  dayRating: number;
  daySummary: string;
  baziSummary: string;
  zodiac: string;
  element: string;
  yinYang: string;
  fortunes: FortuneCategory[];
}

const ELEMENT_COLORS: Record<string, ColorInfo[]> = {
  '木': [
    { name: '嫩绿', hex: '#4CAF50' },
    { name: '翠绿', hex: '#2E7D32' },
    { name: '草绿', hex: '#8BC34A' },
  ],
  '火': [
    { name: '朱红', hex: '#F44336' },
    { name: '胭脂', hex: '#E91E63' },
    { name: '橘红', hex: '#FF5722' },
  ],
  '土': [
    { name: '鹅黄', hex: '#FFC107' },
    { name: '琥珀', hex: '#FF9800' },
    { name: '土黄', hex: '#795548' },
  ],
  '金': [
    { name: '月白', hex: '#F5F5F5' },
    { name: '金色', hex: '#FFD700' },
    { name: '银灰', hex: '#9E9E9E' },
  ],
  '水': [
    { name: '藏蓝', hex: '#0D47A1' },
    { name: '碧蓝', hex: '#2196F3' },
    { name: '墨色', hex: '#212121' },
  ],
};

const ELEMENT_FOODS: Record<string, FoodInfo[]> = {
  '木': [
    { name: '韭菜', reason: '木气旺盛，韭菜养肝生阳', emoji: '🥬' },
    { name: '菠菜', reason: '青绿入肝，滋阴润燥', emoji: '🥗' },
    { name: '青豆', reason: '补益肝气，增强活力', emoji: '🫘' },
    { name: '绿茶', reason: '清肝明目，舒畅气机', emoji: '🍵' },
  ],
  '火': [
    { name: '红枣', reason: '火命补心，红枣益气', emoji: '🍎' },
    { name: '枸杞', reason: '滋补心阳，明目养神', emoji: '🫐' },
    { name: '胡萝卜', reason: '火色入心，补气暖身', emoji: '🥕' },
    { name: '龙眼', reason: '补益心脾，安神助眠', emoji: '🍇' },
  ],
  '土': [
    { name: '山药', reason: '土命补脾，山药健胃', emoji: '🍠' },
    { name: '南瓜', reason: '黄色入脾，补中益气', emoji: '🎃' },
    { name: '小米', reason: '养脾胃，生津液', emoji: '🌾' },
    { name: '土豆', reason: '健脾和胃，补虚强身', emoji: '🥔' },
  ],
  '金': [
    { name: '白萝卜', reason: '金命润肺，萝卜顺气', emoji: '🥙' },
    { name: '百合', reason: '润肺止咳，清心安神', emoji: '🌸' },
    { name: '银耳', reason: '滋阴润肺，养颜美肤', emoji: '🍄' },
    { name: '梨', reason: '清热生津，润肺化痰', emoji: '🍐' },
  ],
  '水': [
    { name: '黑豆', reason: '水命补肾，黑豆益精', emoji: '🫘' },
    { name: '黑芝麻', reason: '补肾乌发，润燥通便', emoji: '🌰' },
    { name: '海带', reason: '软坚散结，补碘强骨', emoji: '🌿' },
    { name: '核桃', reason: '补肾健脑，温润益智', emoji: '🥜' },
  ],
};

const SEASON_FOODS: Record<string, FoodInfo[]> = {
  spring: [
    { name: '枸杞', reason: '春季养肝，枸杞明目养血', emoji: '🫐' },
    { name: '韭菜', reason: '春韭最鲜，升阳补虚', emoji: '🥬' },
  ],
  summer: [
    { name: '绿豆', reason: '夏季解暑，绿豆清热消渴', emoji: '💚' },
    { name: '莲子', reason: '养心安神，清热除烦', emoji: '🌱' },
  ],
  autumn: [
    { name: '百合', reason: '秋季润肺，百合止咳化痰', emoji: '🌸' },
    { name: '银耳', reason: '滋阴润燥，养颜美肤', emoji: '🍄' },
  ],
  winter: [
    { name: '黑豆', reason: '冬季补肾，黑豆藏精益气', emoji: '🫘' },
    { name: '羊肉', reason: '温补阳气，驱寒暖胃', emoji: '🍖' },
  ],
};

const WEATHER_AVOID_FOODS: Record<string, FoodInfo[]> = {
  hot: [
    { name: '辣椒', reason: '天热助火，易上火伤津', emoji: '🌶️' },
    { name: '羊肉', reason: '性温燥热，暑天不宜', emoji: '🍖' },
    { name: '荔枝', reason: '性热助火，多食易燥', emoji: '🍑' },
  ],
  cold: [
    { name: '冷饮', reason: '寒凉伤胃，损伤阳气', emoji: '🧊' },
    { name: '生冷瓜果', reason: '寒气伤脾，影响消化', emoji: '🍉' },
  ],
  rainy: [
    { name: '油腻食物', reason: '湿气重，油腻加重脾胃负担', emoji: '🍔' },
    { name: '甜食', reason: '湿热体质慎食，易生痰湿', emoji: '🍰' },
  ],
  windy: [
    { name: '发物', reason: '风气入体，发物助邪', emoji: '🐟' },
  ],
};

const DIRECTIONS = ['东', '南', '西', '北', '东南', '东北', '西南', '西北'];

function deterministicRandom(seed: number, max: number): number {
  const x = Math.sin(seed) * 10000;
  return Math.floor((x - Math.floor(x)) * max);
}

function getSeedFromParams(params: ReadingParams): number {
  const today = new Date();
  return params.birthYear * 31 + params.birthMonth * 7 + params.birthDay * 3 +
    today.getFullYear() * 13 + today.getMonth() * 5 + today.getDate() * 2 +
    params.birthHour + (params.gender === '男' ? 17 : 11);
}

export function generateDailyReading(params: ReadingParams): DailyReading {
  const bazi = getBaziInfo(params.birthYear, params.birthMonth, params.birthDay, params.birthHour);
  const seed = getSeedFromParams(params);

  const element = bazi.element;
  const yinYang = bazi.yinYang;

  const elementColors = ELEMENT_COLORS[element] || ELEMENT_COLORS['土'];
  let weatherColorBonus: ColorInfo | null = null;
  if (params.temperature > 28) {
    weatherColorBonus = { name: '冰蓝', hex: '#B3E5FC' };
  } else if (params.temperature < 10) {
    weatherColorBonus = { name: '暖橙', hex: '#FFAB40' };
  }

  const luckyColors: ColorInfo[] = [...elementColors];
  if (weatherColorBonus && luckyColors.length < 3) {
    luckyColors.push(weatherColorBonus);
  }
  const primaryColor = luckyColors[deterministicRandom(seed, luckyColors.length)];
  const luckyColor: ColorInfo & { reason: string } = {
    ...primaryColor,
    reason: `${element}命之人，今日宜佩戴${primaryColor.name}，与天地之气相应，带来好运`,
  };

  const elementFoods = ELEMENT_FOODS[element] || ELEMENT_FOODS['土'];
  const seasonFoods = SEASON_FOODS[params.season] || [];

  const allFoods = [...elementFoods, ...seasonFoods];
  const selectedFoods: FoodInfo[] = [];
  const usedIndices = new Set<number>();
  for (let i = 0; i < 4 && selectedFoods.length < 4; i++) {
    const idx = deterministicRandom(seed + i * 7, allFoods.length);
    if (!usedIndices.has(idx)) {
      usedIndices.add(idx);
      selectedFoods.push(allFoods[idx]);
    }
  }

  if (params.temperature > 30) {
    selectedFoods.push({ name: '西瓜', reason: '炎热天气，西瓜清暑解渴', emoji: '🍉' });
    selectedFoods.push({ name: '绿豆汤', reason: '清热解毒，消暑利湿', emoji: '🍵' });
  } else if (params.temperature < 5) {
    selectedFoods.push({ name: '姜汤', reason: '严寒天气，姜汤暖胃驱寒', emoji: '🫚' });
  }

  const foods = selectedFoods.slice(0, 4);

  let avoidFoods: FoodInfo[] = [];
  if (params.temperature > 28) avoidFoods = WEATHER_AVOID_FOODS.hot;
  else if (params.temperature < 10) avoidFoods = WEATHER_AVOID_FOODS.cold;
  else if (params.description.includes('雨')) avoidFoods = WEATHER_AVOID_FOODS.rainy;
  else if (params.windSpeed > 5) avoidFoods = WEATHER_AVOID_FOODS.windy;
  else avoidFoods = WEATHER_AVOID_FOODS.cold.slice(0, 2);

  avoidFoods = avoidFoods.slice(0, 3);

  const luckyNumber = deterministicRandom(seed * 3, 9) + 1;

  const dirIdx = deterministicRandom(seed * 5, DIRECTIONS.length);
  const luckyDirection = DIRECTIONS[dirIdx];

  const elementMatch = element === '木' && params.season === 'spring' ? 2 :
    element === '火' && params.season === 'summer' ? 2 :
    element === '金' && params.season === 'autumn' ? 2 :
    element === '水' && params.season === 'winter' ? 2 : 0;
  const baseRating = 3 + deterministicRandom(seed * 11, 3) - 1;
  const dayRating = Math.min(5, Math.max(1, baseRating + (elementMatch > 0 ? 1 : 0)));

  const ratingTexts: Record<number, string> = {
    1: '今日运势平平，宜静不宜动，保持平常心。',
    2: '今日略有不顺，凡事需谨慎，多加小心。',
    3: '今日运势中平，顺势而为，稳中求进。',
    4: '今日运势较佳，把握机遇，积极进取。',
    5: '今日运势大吉，天时地利人和，诸事顺遂。',
  };
  let weatherNote = '';
  if (params.temperature > 30) weatherNote = '天气炎热，注意防暑降温。';
  else if (params.temperature < 5) weatherNote = '天寒地冻，注意保暖御寒。';
  else if (params.description.includes('雨')) weatherNote = '雨水滋润，出行带伞。';
  else weatherNote = '天气宜人，心情舒畅。';

  const genderText = params.gender === '男' ? '阳刚之气旺盛，' : '阴柔之气充盈，';
  const daySummary = `${ratingTexts[dayRating]} ${genderText}${element}命之人今日${yinYang}气${yinYang === '阳' ? '上升' : '内敛'}，${weatherNote}`;

  // Fortune category generation
  const loveSeed = seed * 7 + 3;
  const careerSeed = seed * 13 + 5;
  const wealthSeed = seed * 19 + 7;
  const socialSeed = seed * 23 + 11;

  const isSunny = !params.description.includes('雨') && !params.description.includes('雪') && !params.description.includes('阴');
  const isSpringOrSummer = params.season === 'spring' || params.season === 'summer';

  function fortuneRating(catSeed: number, bonus: number): number {
    const base = 3 + deterministicRandom(catSeed * 11, 3) - 1;
    return Math.min(5, Math.max(1, base + bonus));
  }

  const loveElementBonus = elementMatch > 0 ? 1 : 0;
  const loveGenderBonus = params.gender === '女' ? (deterministicRandom(loveSeed + 1, 2) > 0 ? 1 : 0) : 0;
  const loveRating = fortuneRating(loveSeed, loveElementBonus + loveGenderBonus > 1 ? 1 : 0);

  const careerYinYangBonus = yinYang === '阳' ? 1 : 0;
  const careerWeatherBonus = isSunny ? (deterministicRandom(careerSeed + 2, 2) > 0 ? 1 : 0) : 0;
  const careerRating = fortuneRating(careerSeed, careerYinYangBonus + careerWeatherBonus > 1 ? 1 : 0);

  const wealthElementBonus = (element === '金' || element === '土') ? 1 : 0;
  const wealthTempBonus = params.temperature >= 15 && params.temperature <= 28 ? (deterministicRandom(wealthSeed + 3, 2) > 0 ? 1 : 0) : 0;
  const wealthRating = fortuneRating(wealthSeed, wealthElementBonus + wealthTempBonus > 1 ? 1 : 0);

  const socialSeasonBonus = isSpringOrSummer ? 1 : 0;
  const socialWeatherBonus = isSunny ? (deterministicRandom(socialSeed + 4, 2) > 0 ? 1 : 0) : 0;
  const socialRating = fortuneRating(socialSeed, socialSeasonBonus + socialWeatherBonus > 1 ? 1 : 0);

  // Content pools — 融合心理学视角，给出具体可执行的日常建议
  const loveSummaries: Record<number, string[]> = {
    5: [
      `今日你的共情力与感受力都处于高峰状态，这在心理学中被称为"情绪同频"——你很容易察觉到他人的情感需求，也更容易被对方的温柔打动。单身者今日出门社交，真诚的微笑就是最好的桃花催化剂；有伴侣者适合进行一次"36个问题"式的深度对话，彼此的亲密感会显著提升。${yinYang}气旺盛，内心的安全感充盈，很适合尝试平时不敢表达的柔软话语。`,
      `今日情感能量充沛，心理学中的"吸引力法则"在你身上格外应验——当你内心充满爱意时，周围的人会不自觉地被你吸引。${element}命之人今日气场柔和而有磁性，眼神中带着温暖的光。不妨主动给重要的人发一条关心的消息，或是准备一份小小的仪式感，比如一起看日落、分享一杯热饮。这些微小的举动，往往比宏大的承诺更能触动人心。`,
    ],
    4: [
      `感情运势良好，今日你的沟通表达力增强，心理学家约翰·戈特曼所说的"积极回应"在你身上体现明显——当对方分享日常时，你会自然地给予热情回应，而不是敷衍了事。适合进行一些有质量的交流：聊聊彼此的梦想、童年趣事、最近的感悟。单身者可以在朋友聚会中展现真实的自己，不必刻意包装，真诚就是最大的魅力。`,
      `今日你的情绪觉察力提升，能更敏锐地感知到对方的言外之意。心理学中称之为"情绪智力的高光时刻"。在亲密关系中，试着用"我感受到……"的句式表达自己，比如"我感受到你今天有些疲惫，需要我陪你安静待一会儿吗？"这样的表达方式既温暖又不给对方压力，是增进感情的好方法。`,
    ],
    3: [
      `感情运势平稳，虽无惊喜但也没有波澜，心理学上这种状态叫"安全型依恋"的日常——平静中蕴含着最踏实的幸福。今天不需要刻意制造浪漫，把日常的关心做到位就好：记得问对方中午吃了什么、下班路上小心。这些看似平淡的互动，其实是长期关系中最珍贵的"情感储蓄"。`,
      `今日情感波动不大，顺其自然最好。心理学研究表明，关系中70%的矛盾其实是"永恒问题"——不需要解决，只需要理解和接纳。今天适合练习"无条件接纳"：不试图改变对方，只是看见ta本来的样子。做一顿简单的饭、一起散散步，这种日常的陪伴胜过千言万语。`,
    ],
    2: [
      `感情方面宜静不宜动。今日你可能比平时更容易"想太多"，心理学上叫"反刍思维"——对已经发生的事反复琢磨。建议暂时放下对关系的分析和评判，把注意力放回自己身上。可以做10分钟正念呼吸，或者写写日记，把纷乱的念头倾倒在纸上。如果和伴侣有分歧，今天先不讨论，等情绪平稳后再谈，效果会好很多。`,
      `今日${element}气偏弱，情感敏感度增高，你可能会不自觉地放大对方的某个表情或语气。心理学家称之为"消极归因偏差"——把中性的行为往坏处想。提醒自己：对方可能只是累了，而不是不在乎你。今天与其在脑海里反复猜测，不如直接温和地问一句"你今天还好吗？"简单直接的沟通，比内心戏有用得多。`,
    ],
    1: [
      `今日感情运势低迷，但这恰恰是"向内看"的好时机。心理学家温尼科特说过："独处的能力，是情感成熟的标志。"今天适合做自己的情绪咨询师：泡一杯热茶，安静地想想自己在关系中真正需要什么。不必强撑社交面具，也不必勉强自己去讨好谁。给自己一个温暖的拥抱（自我拥抱真的会激活催产素分泌），善待自己才能更好地爱人。`,
    ],
  };
  const loveAdvice = [
    '试试"5分钟感恩练习"：告诉对方今天你最感谢ta做的一件小事',
    '睡前给重要的人发一条晚安消息，附上一句真心的夸赞',
    '独处时光是充电的好时机，泡个澡、听首喜欢的歌、对镜子笑一笑',
    '约一场慢节奏的下午茶，手机放一边，认真看着对方的眼睛聊天',
    '写一张手写小纸条藏在对方会看到的地方，制造小小的惊喜',
    '做一件"爱的语言"匹配的事：ta喜欢肢体接触就多牵手，喜欢言语肯定就多说好听的话',
    '今天适合整理手机相册里你们的合照，回忆美好的瞬间能增强关系满意度',
  ];
  const loveGoodFor = ['真诚表达感受', '主动关心对方', '安排一次约会', '练习倾听不打断', '给自己独处时间', '分享今天的开心事', '一起做饭聊天'];
  const loveBadFor = ['冷战逃避沟通', '翻旧账算总账', '在情绪顶点做决定', '用讽刺代替表达', '和别人比较伴侣', '过度解读对方行为'];
  const loveKeywords = ['温柔以待', '心灵共振', '安全感', '真诚连接', '慢慢来', '向内生长', '用心陪伴', '彼此看见'];

  const careerSummaries: Record<number, string[]> = {
    5: [
      `事业运势大吉！今日你的"心流状态"很容易被激活——心理学家契克森米哈赖发现，当技能与挑战匹配时，人会进入全神贯注的高效状态。抓住这个窗口期，把最重要、最需要创造力的工作安排在上午。今日贵人运也不错，主动分享你的想法，领导和同事会比平时更愿意倾听和支持。适合提案、汇报、展示成果。`,
      `今日思维清晰，逻辑力和表达力都在线，适合处理需要深度思考的工作。心理学中的"首因效应"提醒你：今天在会议或沟通中率先发言，你的观点会格外受重视。${yinYang === '阳' ? '阳气上升，行动力强，适合推动项目落地' : '阴气内敛，洞察力敏锐，适合做分析和规划'}。记得把今天的成果记录下来，积累的这些"小胜利"会成为你自信的基石。`,
    ],
    4: [
      `事业运势不错，适合稳步推进手头项目。今天你的"执行功能"——也就是大脑的计划、组织和执行能力——运转良好。建议用"番茄工作法"（25分钟专注+5分钟休息）来处理待办清单，你会惊讶于自己的效率。与同事协作时，多用"我们"而非"我"的措辞，团队归属感会增强，合作也会更顺畅。`,
      `今日灵感时有闪现，建议随身带个小本子或手机备忘录，随时记录。心理学研究表明，创意想法的"保质期"只有几分钟——不记下来就会溜走。工作中遇到卡点时，不妨起身走动5分钟，换个环境看问题，往往能柳暗花明。`,
    ],
    3: [
      `事业运势中平，按部就班是今天的最佳策略。心理学上有个概念叫"认知负荷"——今天不太适合同时处理太多复杂任务。挑出最重要的1-2件事，先把它们做好，其余的可以排到明天。不急于表现，"深耕当下"本身就是最有力的职场策略。午休时可以听一段冥想音频，帮自己在下午保持专注。`,
      `今天工作节奏可能偏慢，不必焦虑。心理学家德韦克的"成长型心态"理论提醒我们：进步不需要每天都是高峰。今天适合做一些"低强度高价值"的事：整理文件夹、回复积压的邮件、更新工作日志。这些零碎但必要的事务做完后，反而会让你接下来几天的效率大幅提升。`,
    ],
    2: [
      `事业上今日可能遇到小阻碍——会议延迟、方案被退回、沟通不畅等。心理学上这叫"挫折容忍力"的考验时刻。深呼吸，提醒自己：一次小挫折不等于全面失败。今天不宜做重大决策（如跳槽、签合同），先搜集信息、听取不同意见。把注意力放在"我能控制什么"上面，而不是纠结于无法改变的事情。`,
      `今天工作中容易犯"确认偏误"——只看到支持自己想法的证据。建议在做决定前，主动找一个跟你意见不同的人聊聊。文书工作一定要多检查两遍，特别是数字和日期。下午精力可能下滑，给自己买杯咖啡，做几个拉伸动作，保持基本的工作节奏就好。`,
    ],
    1: [
      `事业运势偏低，今天是"战略性休息日"——心理学研究证实，持续高压工作不休息会导致"职业倦怠"，而适时的降速反而能提高长期绩效。保持低调，避免与人正面冲突。如果有不满，先写在纸上而不是说出口。把能延后的工作延后，把精力留给不能拖的事。晚上早点下班，做一些让自己放松的事情——这不是偷懒，而是为明天的爆发蓄力。`,
    ],
  };
  const careerAdvice = [
    '今天做完一件事后给自己一个小奖励（一块巧克力、5分钟刷手机），正强化能提升持续动力',
    '用"两分钟法则"处理琐事：能两分钟内完成的事立刻做，别放进待办清单',
    '下班前花5分钟写明天的To-Do，大脑会在睡眠中帮你预处理这些任务',
    '午饭后散步10分钟再回来工作，短暂的有氧运动能显著提升下午的认知功能',
    '遇到难题时试试"橡皮鸭调试法"——把问题对着一个物体说出来，思路往往会自动清晰',
    '今天适合做"技能投资"：花20分钟学一个新工具或读一篇行业文章',
  ];
  const careerGoodFor = ['做最重要的事', '主动汇报进展', '学习新技能', '整理工作台面', '规划下周目标', '请教前辈经验'];
  const careerBadFor = ['多任务并行', '情绪化回复消息', '拖延关键任务', '加班到很晚', '跳过休息时间'];
  const careerKeywords = ['专注当下', '稳扎稳打', '厚积薄发', '从容不迫', '化繁为简', '贵人相助', '灵感涌现', '战略性休息'];

  const wealthSummaries: Record<number, string[]> = {
    5: [
      `财运亨通！行为经济学家塞勒的研究表明，人们往往在情绪好的时候做出更理性的消费决策。今天就是这样的日子——头脑清晰，判断力强，适合审视你的财务状况、调整投资组合。如果最近有想买的大件商品，今天比较和决策的质量会比较高。${element === '金' || element === '土' ? '五行属性利财，正财偏财都有进账迹象。' : '虽然五行不直接利财，但今日运势加持，收入来源可能意外拓宽。'}`,
      `今日财运指数高，但记住"心理账户"效应——不要因为觉得"这笔钱是意外之财"就随意花掉。所有收入都值得被认真对待。适合做一次全面的财务体检：检查订阅服务有没有不用的、信用卡有没有未还的、存款目标完成了多少。把"理财焦虑"变成"理财行动"，从一个小动作开始。`,
    ],
    4: [
      `财运不错，正财稳定。今天适合做"被动收入思考"——心理学家发现，人们低估了复利和习惯性储蓄的力量。即使每天只存10块钱，一年就是3650元。打开你的理财App看看有没有适合的低风险定期产品。不必追求高收益，"不亏"就是今日最好的财务策略。`,
      `今天消费决策力不错，可以趁机处理一些需要比价的购物。心理学上的"锚定效应"提醒你：不要被原价迷惑，关注商品对你的实际价值。列一个"需要vs想要"清单，把冲动消费挡在门外。`,
    ],
    3: [
      `财运平平，收支平衡。今天最适合做"财务断舍离"——打开手机看看有哪些自动续费的会员、不再使用的订阅，果断取消。心理学中的"沉没成本谬误"让我们倾向于保留不需要的东西，只因为"已经花了钱"。但及时止损比继续浪费更明智。控制好今天的支出，为未来的自己存一份安心。`,
      `今天不适合冲动消费。行为经济学发现，人在"消费冲动"产生后等待24小时，有70%的概率会放弃购买。所以今天看到心动的东西，先加购物车，明天再决定。午饭可以自己带便当，省下的钱存入"心愿基金"，积少成多的成就感比一顿外卖持久得多。`,
    ],
    2: [
      `财运偏弱，今天要特别警惕"情绪化消费"——心理学研究表明，压力大、心情低落时人更倾向于通过购物获得短暂的快感（多巴胺效应），但这种满足感消退后往往伴随后悔。如果手痒想买东西，先问自己三个问题：我真的需要吗？一周后我还会想要吗？这笔钱是否有更好的用途？不宜借贷或投资，守住现有资产最重要。`,
    ],
    1: [
      `今日不利财运，守财为上。心理学上有个概念叫"损失厌恶"——失去100元的痛苦远大于得到100元的快乐。今天就让这种天性保护你：任何需要花大钱的决定一律推迟。不签合同、不转大额、不借钱给人。把钱包里的现金减少、把支付密码设复杂一点，给自己创造"消费摩擦"。用免费的方式愉悦自己：散步、读书、听音乐，快乐不一定需要花钱。`,
    ],
  };
  const wealthAdvice = [
    '今天记一笔账：打开记账App记录今日所有开支，"可见化"是控制支出的第一步',
    '检查一下这个月的订阅服务，取消掉不再使用的（你可能正在为遗忘的会员付费）',
    '把零钱转入储蓄账户，哪怕只有几十块——"付钱给未来的自己"是最好的理财习惯',
    '午饭时间和懂理财的朋友聊聊，好的理财观念比具体的投资建议更有价值',
    '列一个本月"不买清单"：写下这个月不需要购买的3样东西，贴在显眼的地方',
    '花10分钟计算一下你的"时薪"——知道自己一小时赚多少钱，会让消费决策更理性',
  ];
  const wealthGoodFor = ['记账复盘', '制定预算', '低风险储蓄', '取消无用订阅', '比价后再购买', '和家人讨论财务计划'];
  const wealthBadFor = ['冲动下单', '高风险投机', '借钱给不熟的人', '情绪低落时购物', '忽视小额支出'];
  const wealthKeywords = ['理性消费', '量入为出', '稳中求进', '延迟满足', '细水长流', '开源节流', '财务自由', '从容理财'];

  const socialSummaries: Record<number, string[]> = {
    5: [
      `社交运势极佳！心理学家邓巴发现，人真正能维持的亲密关系只有5个左右，而今天你恰好有精力和状态去"浇灌"这些重要的关系。主动约一个很久没联系的好友出来坐坐，${isSpringOrSummer ? '春夏天气好，适合户外野餐或公园散步' : '秋冬适合找一家暖和的咖啡店促膝长谈'}。你今天的表达力和共情力都很强，很适合做那个"主动联系的人"。心理学研究表明，维持友谊最重要的行为就是"主动发起联系"，不要等别人来找你。`,
      `今日人缘爆棚，贵人可能出现在意想不到之处——比如排队时的闲聊、工作群里的一次互动。社会心理学中的"曝光效应"告诉我们：仅仅是多见面、多互动就能增加好感度。今天不妨多出现在公共区域，主动跟不太熟的同事打个招呼、聊两句天气。轻松的社交不需要准备什么话题，真诚的笑容就是最好的开场白。`,
    ],
    4: [
      `人际关系和谐，今日你的"社交电池"电量充足。心理学家将人际交往中的积极回应称为"情感竞标"——当朋友分享一个好消息时，用"真棒！然后呢？给我讲讲细节"这样的热情回应（而非"哦，不错"的敷衍），能让对方感受到你真的在乎。今天聚会交流时试试这个技巧，你会发现关系明显升温。`,
      `今天适合进行有深度的社交。心理学研究发现，比起泛泛而谈，"有意义的对话"能显著提升幸福感。找一个信任的朋友聊聊最近的困惑或感悟，互相分享脆弱反而能增强友谊。晚上可以给远方的朋友打个电话，听听对方的近况，分享自己的生活，这种双向的情感流动是友谊最好的养分。`,
    ],
    3: [
      `社交运势一般，今天你可能更想独处，这完全没问题。心理学家荣格说："独处是恢复精力的方式之一。"不必勉强自己应酬，可以拒绝不想参加的聚会。但如果有朋友主动找你，至少给一个温暖的回应——一条"最近忙，改天约"的消息也好过已读不回。保持舒适的社交距离，同时不让重要的关系"断联"太久。`,
      `今天适度社交即可，不必做"社交达人"。心理学上的"情绪传染"效应提醒你：今天选择和能给你带来正能量的人在一起。如果有人让你感到消耗或不舒服，可以礼貌地缩短互动时间。把社交精力花在让你"充电"而非"耗电"的人身上。晚上可以在家和家人一起做顿饭、看部电影，最亲近的关系往往最容易被忽略。`,
    ],
    2: [
      `社交方面宜低调，今天你的"社交过滤器"可能不太灵敏——心理学上叫"去抑制效应"，容易说出平时不会说的话。特别是在群聊、朋友圈评论时多想一步再发。与人交往注意分寸，避免卷入八卦或站队。如果有人找你倾诉负面情绪，可以倾听但不必过度卷入——设定"情感边界"是保护自己的重要技能。今天更适合一对一的安静交流，而非嘈杂的群体社交。`,
    ],
    1: [
      `今日不宜社交，你的"社交电池"需要充电。心理学家发现，强迫自己在疲惫状态下社交不仅无效，还会产生"社交后悔"——说了不该说的话、做了不想做的承诺。今天果断拒绝不必要的应酬，把时间留给自己。可以独自去一个喜欢的地方（书店、公园、河边），做一些"独处仪式"：戴上耳机听喜欢的播客、翻一本一直想看的书、或者只是发呆看看天空。独处不是孤独，而是与自己相处的珍贵时光。`,
    ],
  };
  const socialAdvice = [
    '今天给一个很久没联系的朋友发条消息，不需要理由，一句"最近怎么样"就够了',
    '参加聚会时试试"3:1法则"：每说一句自己的事，先问对方三个问题，做一个好的倾听者',
    '今天适合独处充电——泡一杯茶、戴上耳机、享受不被打扰的安静时光',
    '如果有朋友找你帮忙，量力而行地答应，记住：说"不"不代表你不善良',
    '晚上可以给父母或家人打个电话，问问他们今天过得怎么样，家人也需要"社交维护"',
    '今天试着对一个陌生人微笑或说谢谢——这种微小的善意互动能显著提升你的幸福感',
  ];
  const socialGoodFor = ['主动联系老友', '认真倾听他人', '对陌生人微笑', '和家人聊天', '加入兴趣社群', '给朋友送个小礼物'];
  const socialBadFor = ['背后议论他人', '过度承诺帮忙', '在社交媒体上比较', '勉强自己应酬', '忽视身边亲近的人'];
  const socialKeywords = ['真诚连接', '边界感', '主动联系', '用心倾听', '以和为贵', '舒适社交', '独处充电', '知己可贵'];

  function pickFromPool<T>(pool: T[], catSeed: number, offset: number): T {
    return pool[deterministicRandom(catSeed + offset, pool.length)];
  }

  function pickMultiple<T>(pool: T[], catSeed: number, count: number): T[] {
    const result: T[] = [];
    const used = new Set<number>();
    for (let i = 0; result.length < count && i < count + 5; i++) {
      const idx = deterministicRandom(catSeed + i * 3 + 50, pool.length);
      if (!used.has(idx)) {
        used.add(idx);
        result.push(pool[idx]);
      }
    }
    return result;
  }

  // 歌曲推荐池 — 网易云音乐外链播放器（songId用于iframe嵌入）
  type Song = { title: string; artist: string; songId: number };
  const loveSongs: Song[] = [
    { title: '小幸运', artist: '田馥甄', songId: 461544312 },
    { title: '遇见', artist: '孙燕姿', songId: 254574 },
    { title: '喜欢你', artist: '邓紫棋', songId: 29567189 },
    { title: '告白气球', artist: '周杰伦', songId: 421423806 },
    { title: '最浪漫的事', artist: '赵咏华', songId: 276314 },
    { title: '我只在乎你', artist: '邓丽君', songId: 276948 },
    { title: '爱你', artist: '王心凌', songId: 253223 },
    { title: '后来', artist: '刘若英', songId: 254547 },
    { title: '蒲公英的约定', artist: '周杰伦', songId: 186050 },
    { title: '有何不可', artist: '许嵩', songId: 167706 },
  ];
  const careerSongs: Song[] = [
    { title: '追梦赤子心', artist: 'GALA', songId: 31010566 },
    { title: '倔强', artist: '五月天', songId: 167882 },
    { title: '我相信', artist: '杨培安', songId: 254233 },
    { title: '奔跑', artist: '羽泉', songId: 255020 },
    { title: '蜗牛', artist: '周杰伦', songId: 186083 },
    { title: '最初的梦想', artist: '范玮琪', songId: 255025 },
    { title: '淋雨一直走', artist: '张韶涵', songId: 25706284 },
    { title: '平凡之路', artist: '朴树', songId: 28793052 },
    { title: '稻香', artist: '周杰伦', songId: 185809 },
    { title: '隐形的翅膀', artist: '张韶涵', songId: 253187 },
  ];
  const wealthSongs: Song[] = [
    { title: '好运来', artist: '祖海', songId: 156351 },
    { title: '恭喜发财', artist: '刘德华', songId: 5260833 },
    { title: '发财发福中国年', artist: '张学友', songId: 5260850 },
    { title: '知足', artist: '五月天', songId: 167937 },
    { title: '小手拉大手', artist: '梁静茹', songId: 317786 },
    { title: '阳光总在风雨后', artist: '许美静', songId: 317785 },
    { title: '明天会更好', artist: '群星', songId: 142357 },
    { title: '简单爱', artist: '周杰伦', songId: 186001 },
    { title: '心之火', artist: 'ALIN', songId: 29567191 },
    { title: '不将就', artist: '李荣浩', songId: 31654455 },
  ];
  const socialSongs: Song[] = [
    { title: '朋友', artist: '周华健', songId: 5271001 },
    { title: '干杯', artist: '五月天', songId: 25706282 },
    { title: '友谊地久天长', artist: '群星', songId: 142359 },
    { title: '相亲相爱', artist: '群星', songId: 276944 },
    { title: '你的答案', artist: '阿冗', songId: 1400256289 },
    { title: '年少有为', artist: '李荣浩', songId: 1293886117 },
    { title: '光年之外', artist: '邓紫棋', songId: 449818741 },
    { title: '像鱼', artist: '王贰浪', songId: 1297742167 },
    { title: '晴天', artist: '周杰伦', songId: 186016 },
    { title: '少年', artist: '梦然', songId: 1403527681 },
  ];

  function buildFortune(
    name: string, emoji: string, rating: number, catSeed: number,
    summaries: Record<number, string[]>, advicePool: string[],
    goodPool: string[], badPool: string[], keywordPool: string[],
    songPool: Song[],
  ): FortuneCategory {
    const summaryList = summaries[rating] || summaries[3];
    return {
      name,
      emoji,
      rating,
      summary: pickFromPool(summaryList, catSeed, 100),
      advice: pickFromPool(advicePool, catSeed, 200),
      goodFor: pickMultiple(goodPool, catSeed, 3),
      badFor: pickMultiple(badPool, catSeed, 2),
      keyword: pickFromPool(keywordPool, catSeed, 300),
      song: pickFromPool(songPool, catSeed, 400),
    };
  }

  const fortunes: FortuneCategory[] = [
    buildFortune('感情运', '💕', loveRating, loveSeed, loveSummaries, loveAdvice, loveGoodFor, loveBadFor, loveKeywords, loveSongs),
    buildFortune('事业运', '💼', careerRating, careerSeed, careerSummaries, careerAdvice, careerGoodFor, careerBadFor, careerKeywords, careerSongs),
    buildFortune('财运', '💰', wealthRating, wealthSeed, wealthSummaries, wealthAdvice, wealthGoodFor, wealthBadFor, wealthKeywords, wealthSongs),
    buildFortune('社交运', '👥', socialRating, socialSeed, socialSummaries, socialAdvice, socialGoodFor, socialBadFor, socialKeywords, socialSongs),
  ];

  return {
    luckyColor,
    luckyColors: luckyColors.slice(0, 3),
    foods,
    avoidFoods,
    luckyNumber,
    luckyDirection,
    dayRating,
    daySummary,
    baziSummary: bazi.summary,
    zodiac: bazi.zodiac,
    element,
    yinYang,
    fortunes,
  };
}
