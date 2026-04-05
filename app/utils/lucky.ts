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
  };
}
