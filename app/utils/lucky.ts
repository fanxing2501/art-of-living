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
  rating: number; // 1-5
  summary: string; // 2-3 sentence description
  advice: string; // actionable advice
  goodFor: string[]; // 宜 (things to do)
  badFor: string[]; // 忌 (things to avoid)
  keyword: string; // 今日关键词
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

  // Content pools
  const loveSummaries: Record<number, string[]> = {
    5: [
      '今日桃花星动，感情运势大旺。单身者有遇见心动对象的机缘，已有伴侣者甜蜜升温，适合表达心意。',
      `今日情感能量充沛，${yinYang}气与天地相合。内心柔软通透，极易感染身边的人，桃花自来。`,
    ],
    4: [
      '感情运势良好，沟通顺畅。适合与伴侣深入交谈，单身者可在社交场合展现真实自我。',
      '今日木火通明，情感表达力增强，言语之间自带温暖，容易拉近彼此距离。',
    ],
    3: [
      '感情运势平稳，无大起大落。保持日常的关心与陪伴，细水长流更可贵。',
      '今日情感波动不大，顺其自然最好。不必刻意追求，享受当下的温馨即可。',
    ],
    2: [
      '感情方面宜静不宜动，避免在情绪不稳时做重要决定。沟通时多些耐心，少些执拗。',
      `今日${element}气偏弱，情感敏感度增高，容易因小事产生误会。保持冷静很重要。`,
    ],
    1: [
      '今日感情运势低迷，建议把重心放在自我修养上。独处也是一种疗愈，不必强求。',
    ],
  };
  const loveAdvice = ['今日宜温柔表达，用心聆听', '给对方一些惊喜，一束花、一条信息都好', '独处时光是充电的好时机', '约一场温馨的下午茶', '整理心情，写一封给自己的信'];
  const loveGoodFor = ['表达心意', '约会散步', '赠送小礼物', '深入交谈', '陪伴家人', '写情书', '烛光晚餐'];
  const loveBadFor = ['冷战不理', '翻旧账', '情绪化决定', '忽略伴侣感受', '口角争执', '过度猜疑'];
  const loveKeywords = ['桃花朵朵', '心意相通', '柔情似水', '缘分天定', '真心相待', '静待花开', '用心陪伴', '浪漫时刻'];

  const careerSummaries: Record<number, string[]> = {
    5: ['事业运势大吉，今日贵人相助，工作推进顺利。适合提出新想法、争取表现机会，领导赏识。'],
    4: ['事业运势不错，适合稳步推进手头项目。与同事协作顺畅，灵感时有闪现。'],
    3: ['事业运势中平，按部就班即可。不宜急于求成，做好本职工作最重要。'],
    2: ['事业上可能遇到小阻碍，注意文书细节。不宜做重大决策，先观望为上。'],
    1: ['事业运势偏低，容易遭遇挫折。保持低调，避免与人冲突，蓄力待发。'],
  };
  const careerAdvice = ['今日适合梳理工作计划', '主动与同事沟通协作', '低调行事，稳步推进', '抓住灵感，记录想法', '适当休息，劳逸结合'];
  const careerGoodFor = ['主动汇报', '整理计划', '学习充电', '团队协作', '开展新项目', '拓展人脉'];
  const careerBadFor = ['粗心大意', '拖延进度', '越级汇报', '盲目投资', '与同事争执'];
  const careerKeywords = ['步步高升', '稳扎稳打', '厚积薄发', '蓄势待发', '勤能补拙', '贵人相助', '灵感涌现', '脚踏实地'];

  const wealthSummaries: Record<number, string[]> = {
    5: [
      '财运亨通，正财偏财皆有进账的迹象。把握商机，积极理财。',
      '今日五行生财，收入来源拓宽，投资眼光精准。',
    ],
    4: ['财运不错，正财稳定。适合做理财规划，但不宜大额投机。'],
    3: ['财运平平，收支平衡。不适合大额消费，量入为出。'],
    2: ['财运偏弱，注意防范破财。不宜借贷、投资，谨慎消费。'],
    1: ['今日不利财运，守财为上。切勿贪心冒进，否则得不偿失。'],
  };
  const wealthAdvice = ['今日适合整理财务', '做一份理财规划', '节约为主，控制支出', '关注投资机会但不冲动', '稳健储蓄最安心'];
  const wealthGoodFor = ['储蓄理财', '记账规划', '小额投资', '开源节流', '收回欠款'];
  const wealthBadFor = ['冲动消费', '高风险投机', '借钱给人', '赌博', '大额转账'];
  const wealthKeywords = ['财源广进', '量入为出', '稳中求进', '守财有道', '细水长流', '开源节流', '丰衣足食', '锦上添花'];

  const socialSummaries: Record<number, string[]> = {
    5: ['社交运势极佳，人缘爆棚。贵人出现在意想不到之处，适合拓展社交圈。'],
    4: ['人际关系和谐，与朋友相处愉快。适合聚会交流，可能收获有价值的建议。'],
    3: ['社交运势一般，适度社交即可。不必勉强自己应酬，保持舒适距离。'],
    2: ['社交方面宜低调，言多必失。与人交往注意分寸，避免卷入是非。'],
    1: ['今日不宜社交，容易遭遇小人。独处比应酬更好，把时间留给自己。'],
  };
  const socialAdvice = ['今日适合联系老朋友', '参加社交活动拓展人脉', '安静独处也是好选择', '倾听他人，少说多听', '保持真诚，不必迎合'];
  const socialGoodFor = ['联系老友', '参加聚会', '主动帮助他人', '倾听朋友', '认识新朋友'];
  const socialBadFor = ['背后议论', '过度承诺', '卷入是非', '强行社交', '忽略朋友求助'];
  const socialKeywords = ['贵人运旺', '和气生财', '广结善缘', '知己难寻', '以和为贵', '真诚待人', '独善其身', '退一步海阔天空'];

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

  function buildFortune(
    name: string, emoji: string, rating: number, catSeed: number,
    summaries: Record<number, string[]>, advicePool: string[],
    goodPool: string[], badPool: string[], keywordPool: string[],
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
    };
  }

  const fortunes: FortuneCategory[] = [
    buildFortune('感情运', '💕', loveRating, loveSeed, loveSummaries, loveAdvice, loveGoodFor, loveBadFor, loveKeywords),
    buildFortune('事业运', '💼', careerRating, careerSeed, careerSummaries, careerAdvice, careerGoodFor, careerBadFor, careerKeywords),
    buildFortune('财运', '💰', wealthRating, wealthSeed, wealthSummaries, wealthAdvice, wealthGoodFor, wealthBadFor, wealthKeywords),
    buildFortune('社交运', '👥', socialRating, socialSeed, socialSummaries, socialAdvice, socialGoodFor, socialBadFor, socialKeywords),
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
