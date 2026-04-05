// 天干
const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
// 地支
const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
// 生肖
const ZODIAC_ANIMALS = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
// 五行 from 天干
const STEM_ELEMENTS: Record<string, string> = {
  '甲': '木', '乙': '木',
  '丙': '火', '丁': '火',
  '戊': '土', '己': '土',
  '庚': '金', '辛': '金',
  '壬': '水', '癸': '水',
};
// 阴阳 from 天干 (甲丙戊庚壬=阳, 乙丁己辛癸=阴)
const STEM_YINYANG: Record<string, string> = {
  '甲': '阳', '乙': '阴',
  '丙': '阳', '丁': '阴',
  '戊': '阳', '己': '阴',
  '庚': '阳', '辛': '阴',
  '壬': '阳', '癸': '阴',
};

export function getChineseZodiac(year: number): string {
  return ZODIAC_ANIMALS[(year - 4) % 12];
}

export function getHeavenlyStem(year: number): string {
  return HEAVENLY_STEMS[(year - 4) % 10];
}

export function getEarthlyBranch(year: number): string {
  return EARTHLY_BRANCHES[(year - 4) % 12];
}

export function getHourBranch(hour: number): string {
  const branchMap: Record<number, string> = {
    23: '子', 0: '子', 1: '丑', 2: '丑', 3: '寅', 4: '寅',
    5: '卯', 6: '卯', 7: '辰', 8: '辰', 9: '巳', 10: '巳',
    11: '午', 12: '午', 13: '未', 14: '未', 15: '申', 16: '申',
    17: '酉', 18: '酉', 19: '戌', 20: '戌', 21: '亥', 22: '亥',
  };
  return branchMap[hour] || '子';
}

export function getFiveElements(stem: string): string {
  return STEM_ELEMENTS[stem] || '土';
}

export function getYinYang(stem: string): string {
  return STEM_YINYANG[stem] || '阳';
}

export function getBaziInfo(year: number, month: number, day: number, hour: number) {
  const yearStem = getHeavenlyStem(year);
  const yearBranch = getEarthlyBranch(year);
  const zodiac = getChineseZodiac(year);
  const hourBranch = getHourBranch(hour);
  const element = getFiveElements(yearStem);
  const yinYang = getYinYang(yearStem);

  const monthBranches = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];
  const monthBranch = monthBranches[(month - 1) % 12];

  const dayBranches = EARTHLY_BRANCHES[day % 12];

  return {
    yearPillar: `${yearStem}${yearBranch}`,
    monthPillar: `月${monthBranch}`,
    dayPillar: `日${dayBranches}`,
    hourPillar: `${hourBranch}时`,
    zodiac,
    element,
    yinYang,
    summary: `${yearStem}${yearBranch}年 · ${zodiac}年 · ${element}命 · ${yinYang}`,
  };
}
