import { type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { useActionData, useLoaderData, useNavigation, useSubmit } from "react-router";
import { useState, useEffect, useCallback } from "react";
import { generateDailyReading, type DailyReading } from "~/utils/lucky";
import { getBaziInfo } from "~/utils/bazi";

interface WeatherData {
  temp: string;
  feelsLike: string;
  text: string;
  windDir: string;
  windSpeed: string;
  humidity: string;
  icon: string;
  locationName?: string;
}

interface LoaderData {
  weather: WeatherData | null;
  error: string | null;
  lat: string | null;
  lon: string | null;
}

interface ActionData {
  reading: DailyReading | null;
  error: string | null;
  formData: {
    name: string;
    birthday: string;
    gender: string;
    birthHour: string;
  } | null;
}

interface UserProfile {
  id: string;
  name: string;
  birthday: string; // "YYYY-MM-DD"
  gender: '男' | '女';
  birthHour: number;
  createdAt: number;
}

const PROFILES_KEY = 'zhiming_profiles';
const ACTIVE_PROFILE_KEY = 'zhiming_active';

function getWeatherEmoji(icon: string): string {
  const code = parseInt(icon);
  if (code === 100) return '☀️';
  if (code >= 101 && code <= 103) return '⛅';
  if (code === 104) return '☁️';
  if (code >= 300 && code <= 304) return '⛈️';
  if (code >= 305 && code <= 315) return '🌧️';
  if (code >= 400 && code <= 407) return '❄️';
  if (code >= 500 && code <= 502) return '🌫️';
  return '🌤️';
}

function getSeason(month: number): 'spring' | 'summer' | 'autumn' | 'winter' {
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

function loadProfiles(): UserProfile[] {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (raw) return JSON.parse(raw) as UserProfile[];
  } catch { /* ignore */ }
  return [];
}

function saveProfiles(profiles: UserProfile[]) {
  try { localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles)); } catch { /* ignore */ }
}

function getProfileBazi(profile: UserProfile) {
  const [y, m, d] = profile.birthday.split('-').map(Number);
  return getBaziInfo(y, m, d, profile.birthHour);
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const lat = url.searchParams.get('lat');
  const lon = url.searchParams.get('lon');

  if (!lat || !lon) {
    return { weather: null, error: null, lat: null, lon: null };
  }

  const apiKey = process.env.QWEATHER_KEY;
  if (!apiKey || apiKey === 'demo_key') {
    return { weather: null, error: '未配置天气API密钥', lat, lon };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    // 并行请求天气和城市名
    const [weatherRes, geoRes] = await Promise.all([
      fetch(`https://pc38kyxume.re.qweatherapi.com/v7/weather/now?location=${lon},${lat}&key=${apiKey}&lang=zh`, { signal: controller.signal }),
      fetch(`https://geoapi.qweather.com/v2/city/lookup?location=${lon},${lat}&key=${apiKey}&lang=zh`, { signal: controller.signal }).catch(() => null),
    ]);
    clearTimeout(timeout);

    const weatherJson = await weatherRes.json() as Record<string, unknown>;
    if ((weatherJson as { code?: string }).code !== '200') {
      return { weather: null, error: `天气API错误: ${(weatherJson as { code?: string }).code}`, lat, lon };
    }

    const now = (weatherJson as { now: WeatherData }).now;
    let locationName: string | null = null;
    if (geoRes?.ok) {
      try {
        const geoJson = await geoRes.json() as Record<string, unknown>;
        locationName = (geoJson as { location?: Array<{ name: string }> }).location?.[0]?.name ?? null;
      } catch { /* ignore */ }
    }

    const weather: WeatherData = {
      temp: now.temp,
      feelsLike: now.feelsLike,
      text: now.text,
      windDir: now.windDir,
      windSpeed: now.windSpeed,
      humidity: now.humidity,
      icon: now.icon,
      locationName: locationName ?? undefined,
    };

    return { weather, error: null, lat, lon };
  } catch {
    // 超时或网络错误时返回默认天气，不阻塞用户
    return { weather: { temp: '20', feelsLike: '20', text: '晴', windDir: '东', windSpeed: '3', humidity: '60', icon: '100' } as WeatherData, error: null, lat, lon };
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const name = formData.get('name') as string;
  const birthday = formData.get('birthday') as string;
  const gender = formData.get('gender') as '男' | '女';
  const birthHour = parseInt(formData.get('birthHour') as string);
  const weatherTemp = parseFloat(formData.get('weatherTemp') as string || '20');
  const weatherCode = formData.get('weatherCode') as string || '100';
  const weatherHumidity = parseFloat(formData.get('weatherHumidity') as string || '60');
  const weatherWindSpeed = parseFloat(formData.get('weatherWindSpeed') as string || '3');
  const weatherWindDir = formData.get('weatherWindDir') as string || '东';
  const weatherText = formData.get('weatherText') as string || '晴';

  if (!name || !birthday || !gender) {
    return { reading: null, error: '请填写完整信息', formData: null };
  }

  const [birthYear, birthMonth, birthDay] = birthday.split('-').map(Number);
  const today = new Date();
  const season = getSeason(today.getMonth() + 1);

  const reading = generateDailyReading({
    name,
    birthYear,
    birthMonth,
    birthDay,
    birthHour: isNaN(birthHour) ? 0 : birthHour,
    gender,
    weatherCode,
    temperature: isNaN(weatherTemp) ? 20 : weatherTemp,
    humidity: isNaN(weatherHumidity) ? 60 : weatherHumidity,
    windSpeed: isNaN(weatherWindSpeed) ? 3 : weatherWindSpeed,
    windDir: weatherWindDir,
    description: weatherText,
    season,
    currentHour: today.getHours(),
  });

  return {
    reading,
    error: null,
    formData: { name, birthday, gender, birthHour: String(birthHour) },
  };
}

function getLunarDateText(): string {
  const today = new Date();
  const months = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
  const days = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
    '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];
  const knownNewMoon = new Date('2024-01-11');
  const diff = Math.floor((today.getTime() - knownNewMoon.getTime()) / (1000 * 60 * 60 * 24));
  const lunarDay = ((diff % 30) + 30) % 30;
  const lunarMonth = Math.floor(((diff / 30) + 100) % 12);
  return `农历${months[lunarMonth]}月${days[lunarDay]}`;
}

function getGregorianDateText(): string {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth() + 1;
  const d = today.getDate();
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const w = weekDays[today.getDay()];
  return `${y}年${m}月${d}日 星期${w}`;
}

const HOUR_OPTIONS = [
  { value: 23, label: '子时 (23:00-01:00)', symbol: '🐭' },
  { value: 1, label: '丑时 (01:00-03:00)', symbol: '🐄' },
  { value: 3, label: '寅时 (03:00-05:00)', symbol: '🐯' },
  { value: 5, label: '卯时 (05:00-07:00)', symbol: '🐰' },
  { value: 7, label: '辰时 (07:00-09:00)', symbol: '🐲' },
  { value: 9, label: '巳时 (09:00-11:00)', symbol: '🐍' },
  { value: 11, label: '午时 (11:00-13:00)', symbol: '🐴' },
  { value: 13, label: '未时 (13:00-15:00)', symbol: '🐏' },
  { value: 15, label: '申时 (15:00-17:00)', symbol: '🐵' },
  { value: 17, label: '酉时 (17:00-19:00)', symbol: '🐓' },
  { value: 19, label: '戌时 (19:00-21:00)', symbol: '🐕' },
  { value: 21, label: '亥时 (21:00-23:00)', symbol: '🐷' },
];

const ELEMENT_BADGE_COLORS: Record<string, string> = {
  '木': 'bg-emerald-100/80 text-emerald-600 border-emerald-200/60',
  '火': 'bg-red-100/80 text-red-600 border-red-200/60',
  '土': 'bg-amber-100/80 text-amber-600 border-amber-200/60',
  '金': 'bg-yellow-100/80 text-yellow-600 border-yellow-200/60',
  '水': 'bg-blue-100/80 text-blue-600 border-blue-200/60',
};

function getZodiacEmoji(zodiac: string): string {
  const map: Record<string, string> = {
    '鼠': '🐭', '牛': '🐄', '虎': '🐯', '兔': '🐰', '龙': '🐲', '蛇': '🐍',
    '马': '🐴', '羊': '🐑', '猴': '🐵', '鸡': '🐓', '狗': '🐕', '猪': '🐷',
  };
  return map[zodiac] || '🐲';
}

function getSeasonalBackground(weatherText?: string): { className: string; imageUrl?: string } {
  const month = new Date().getMonth() + 1;
  const season = getSeason(month);

  const weatherCategory = (() => {
    if (!weatherText) return 'sunny';
    if (weatherText.includes('雪')) return 'snowy';
    if (weatherText.includes('雨') || weatherText.includes('雷')) return 'rainy';
    if (weatherText.includes('云') || weatherText.includes('阴')) return 'cloudy';
    return 'sunny';
  })();

  const images: Record<string, Record<string, string>> = {
    spring: {
      sunny: 'photo-1462275646964-a0e3c11f18a6',
      rainy: 'photo-1515694346937-94d85e39d29f',
      cloudy: 'photo-1462275646964-a0e3c11f18a6',
      snowy: 'photo-1515694346937-94d85e39d29f',
    },
    summer: {
      sunny: 'photo-1507525428034-b723cf961d3e',
      rainy: 'photo-1534274988757-a28bf1a57c17',
      cloudy: 'photo-1534274988757-a28bf1a57c17',
      snowy: 'photo-1507525428034-b723cf961d3e',
    },
    autumn: {
      sunny: 'photo-1507003211169-0a1dd7228f2d',
      rainy: 'photo-1541789094913-f3809a8f3ba5',
      cloudy: 'photo-1541789094913-f3809a8f3ba5',
      snowy: 'photo-1541789094913-f3809a8f3ba5',
    },
    winter: {
      sunny: 'photo-1491002052546-bf38f186af56',
      rainy: 'photo-1457269449834-928af64c684d',
      cloudy: 'photo-1457269449834-928af64c684d',
      snowy: 'photo-1457269449834-928af64c684d',
    },
  };

  const gradientClass = `bg-${season}`;
  const photoId = images[season][weatherCategory];
  const imageUrl = `https://images.unsplash.com/${photoId}?w=1920&q=80`;

  return { className: gradientClass, imageUrl };
}

function getSeasonEmoji(): string {
  const season = getSeason(new Date().getMonth() + 1);
  const map = { spring: '🌸', summer: '☀️', autumn: '🍂', winter: '❄️' };
  return map[season];
}

export default function Index() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<UserProfile | null>(null);
  const [view, setView] = useState<'home' | 'add' | 'edit' | 'loading' | 'result'>('home');
  const [geoError, setGeoError] = useState<string | null>(null);
  const [pendingSubmit, setPendingSubmit] = useState(false);

  // Load profiles on mount
  useEffect(() => {
    setProfiles(loadProfiles());
    // Migrate old single-user data
    try {
      const old = localStorage.getItem('zhiming_user');
      if (old) {
        const parsed = JSON.parse(old) as { name: string; birthday: string; gender: string; birthHour: string };
        if (parsed.name && parsed.birthday) {
          const existing = loadProfiles();
          if (!existing.some(p => p.name === parsed.name && p.birthday === parsed.birthday)) {
            const migrated: UserProfile = {
              id: Date.now().toString(),
              name: parsed.name,
              birthday: parsed.birthday,
              gender: (parsed.gender as '男' | '女') || '男',
              birthHour: parseInt(parsed.birthHour) || 0,
              createdAt: Date.now(),
            };
            const updated = [...existing, migrated];
            saveProfiles(updated);
            setProfiles(updated);
          }
          localStorage.removeItem('zhiming_user');
        }
      }
    } catch { /* ignore */ }
  }, []);

  const weather = loaderData.weather;
  const bg = getSeasonalBackground(weather?.text);

  const submitForProfile = useCallback((profile: UserProfile) => {
    const formData = new FormData();
    formData.set('name', profile.name);
    formData.set('birthday', profile.birthday);
    formData.set('gender', profile.gender);
    formData.set('birthHour', String(profile.birthHour));
    formData.set('weatherTemp', weather?.temp || '20');
    formData.set('weatherCode', weather?.icon || '100');
    formData.set('weatherHumidity', weather?.humidity || '60');
    formData.set('weatherWindSpeed', weather?.windSpeed || '3');
    formData.set('weatherWindDir', weather?.windDir || '东');
    formData.set('weatherText', weather?.text || '晴');
    submit(formData, { method: 'post' });
  }, [weather, submit]);

  const triggerGeoAndSubmit = useCallback((profile: UserProfile) => {
    setActiveProfile(profile);
    setView('loading');
    // If we already have coords+weather from URL, submit directly
    if (loaderData.lat && loaderData.lon) {
      setPendingSubmit(true);
      return;
    }
    // Need geolocation
    if (!navigator.geolocation) {
      setGeoError('您的浏览器不支持地理定位');
      setView('home');
      return;
    }
    try {
      localStorage.setItem(ACTIVE_PROFILE_KEY, profile.id);
    } catch { /* ignore */ }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        window.location.href = `/?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`;
      },
      () => {
        // Fallback: submit without weather
        setPendingSubmit(true);
      }
    );
  }, [loaderData.lat, loaderData.lon, weather]);

  // On mount with active profile ID in localStorage (returning from geo redirect)
  useEffect(() => {
    try {
      const activeId = localStorage.getItem(ACTIVE_PROFILE_KEY);
      if (activeId && loaderData.lat && loaderData.lon) {
        const all = loadProfiles();
        const found = all.find(p => p.id === activeId);
        if (found) {
          setActiveProfile(found);
          setView('loading');
          setPendingSubmit(true);
          localStorage.removeItem(ACTIVE_PROFILE_KEY);
        }
      }
      // 清理地址栏中的 lat/lon 参数
      if (loaderData.lat && loaderData.lon) {
        window.history.replaceState({}, '', '/');
      }
    } catch { /* ignore */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Submit when pending + weather available
  useEffect(() => {
    if (pendingSubmit && activeProfile && navigation.state === 'idle' && !actionData?.reading) {
      setPendingSubmit(false);
      submitForProfile(activeProfile);
    }
  }, [pendingSubmit, activeProfile, weather, navigation.state, actionData?.reading, submitForProfile]);

  // Show results when action completes
  useEffect(() => {
    if (actionData?.reading) {
      setView('result');
    }
  }, [actionData]);

  const handleSelectProfile = (profile: UserProfile) => {
    triggerGeoAndSubmit(profile);
  };

  const handleAddProfile = (profile: Omit<UserProfile, 'id' | 'createdAt'>) => {
    const newProfile: UserProfile = {
      ...profile,
      id: Date.now().toString(),
      createdAt: Date.now(),
    };
    const updated = [...profiles, newProfile];
    saveProfiles(updated);
    setProfiles(updated);
    triggerGeoAndSubmit(newProfile);
  };

  const handleEditProfile = (profile: Omit<UserProfile, 'id' | 'createdAt'>) => {
    if (!activeProfile) return;
    const updated: UserProfile = { ...activeProfile, ...profile };
    const newProfiles = profiles.map(p => p.id === activeProfile.id ? updated : p);
    saveProfiles(newProfiles);
    setProfiles(newProfiles);
    triggerGeoAndSubmit(updated);
  };

  const handleDeleteProfile = (id: string) => {
    const updated = profiles.filter(p => p.id !== id);
    saveProfiles(updated);
    setProfiles(updated);
    if (activeProfile?.id === id) {
      setActiveProfile(null);
      setView('home');
    }
  };

  const goHome = () => {
    setActiveProfile(null);
    setView('home');
    window.scrollTo(0, 0);
  };

  return (
    <div className={`min-h-screen ${bg.className} font-sans relative`}>
      {/* Background image layer */}
      <div
        className="bg-scene"
        style={{ backgroundImage: `url(${bg.imageUrl})` }}
      />

      {/* Frosted glass header */}
      <header className="glass-header sticky top-0 z-50 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            {(view === 'result' || view === 'add' || view === 'edit') && (
              <button onClick={goHome} className="text-amber-500 hover:text-amber-700 transition-colors mr-1 text-sm">
                ← 返回
              </button>
            )}
            <span className="text-2xl">{getSeasonEmoji()}</span>
            <h1 className="font-serif-cn text-xl font-bold text-amber-700 tracking-wide">知命</h1>
            {view === 'result' && activeProfile && (
              <span className="text-sm text-gray-500 font-serif-cn ml-1">· {activeProfile.name}</span>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-600 font-medium">{getGregorianDateText()}</p>
            <p className="text-xs text-amber-600 font-serif-cn">{getLunarDateText()}</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6 relative z-10">

        {/* Home — Profile list */}
        {view === 'home' && (
          <div className="animate-fade-in space-y-6">
            {profiles.length === 0 ? (
              /* Welcome screen when no profiles */
              <div className="text-center py-8 space-y-8">
                <div className="space-y-4">
                  <h2 className="font-serif-cn text-4xl sm:text-5xl font-bold text-gray-800 leading-tight">知命</h2>
                  <p className="font-serif-cn text-lg text-amber-600 tracking-widest">不知命，无以为君子</p>
                  <div className="flex items-center justify-center gap-2 text-amber-400 text-sm">
                    <span>✦</span><span>✦</span><span>✦</span>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed max-w-md mx-auto">
                    融合五行生肖、天干地支、气象节令，为您定制今日专属运势、幸运色与饮食养生指南
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto animate-fade-in-delay">
                  {[
                    { icon: '🌤', label: '天气节令', desc: '实时气象数据' },
                    { icon: '☯️', label: '五行八字', desc: '天干地支推算' },
                    { icon: '🍃', label: '养生指南', desc: '幸运色与食疗' },
                  ].map((item) => (
                    <div key={item.label} className="glass rounded-2xl p-4 text-center hover:scale-105 transition-transform duration-300">
                      <div className="text-3xl mb-2">{item.icon}</div>
                      <p className="text-xs font-semibold text-gray-700">{item.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="animate-fade-in-delay-2">
                  <button
                    onClick={() => setView('add')}
                    className="btn-pill bg-gradient-to-r from-amber-500 to-amber-400 text-white text-sm"
                  >
                    ＋ 添加成员，开始探索 ✦
                  </button>
                </div>
              </div>
            ) : (
              /* Profile grid */
              <>
                <div className="text-center space-y-1">
                  <h2 className="font-serif-cn text-2xl font-bold text-gray-800">选择成员</h2>
                  <p className="text-sm text-gray-500">点击查看今日运势</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {profiles.map((profile) => {
                    const bazi = getProfileBazi(profile);
                    const zodiacEmoji = getZodiacEmoji(bazi.zodiac);
                    const elementColor = ELEMENT_BADGE_COLORS[bazi.element] || ELEMENT_BADGE_COLORS['土'];
                    return (
                      <button
                        key={profile.id}
                        onClick={() => handleSelectProfile(profile)}
                        className="glass rounded-2xl p-4 text-center hover:scale-105 hover:shadow-lg hover:shadow-amber-100/40 transition-all duration-300 relative group"
                      >
                        {/* Delete button */}
                        <span
                          onClick={(e) => { e.stopPropagation(); handleDeleteProfile(profile.id); }}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/60 text-gray-400 hover:text-red-500 hover:bg-red-50/80 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ✕
                        </span>
                        <div className="text-4xl mb-2">{zodiacEmoji}</div>
                        <p className="font-serif-cn font-semibold text-gray-800 text-sm">{profile.name}</p>
                        <div className="flex gap-1.5 mt-2 justify-center flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${elementColor}`}>{bazi.element}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full border bg-amber-100/80 text-amber-600 border-amber-200/60 font-medium">{bazi.yinYang}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">{profile.birthday}</p>
                      </button>
                    );
                  })}

                  {/* Add new profile card */}
                  <button
                    onClick={() => setView('add')}
                    className="rounded-2xl p-4 text-center border-2 border-dashed border-amber-200/60 hover:border-amber-500 hover:bg-amber-50/30 transition-all duration-300 flex flex-col items-center justify-center min-h-[160px]"
                  >
                    <div className="text-3xl text-amber-400 mb-2">＋</div>
                    <p className="text-sm text-amber-500 font-medium">添加新成员</p>
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Loading state */}
        {view === 'loading' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="text-center space-y-4 animate-fade-in">
              <div className="text-5xl animate-pulse">{getSeasonEmoji()}</div>
              <p className="font-serif-cn text-lg text-amber-600 tracking-wide">
                知命正在为 {activeProfile?.name} 解读今日运势...
              </p>
              <div className="flex items-center justify-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              {geoError && <p className="text-xs text-amber-600">{geoError}</p>}
            </div>
          </div>
        )}

        {/* Add / Edit profile form */}
        {(view === 'add' || view === 'edit') && (
          <div className="glass-strong rounded-2xl overflow-hidden shadow-lg shadow-amber-100/30 animate-fade-in">
            <div className="px-5 py-4 border-b border-white/30">
              <h2 className="font-serif-cn font-semibold text-gray-700 flex items-center gap-2">
                <span className="text-amber-500">☰</span>
                {view === 'edit' ? '修改信息' : '添加成员'}
              </h2>
            </div>
            <ProfileForm
              initialData={view === 'edit' ? activeProfile : null}
              onSubmit={view === 'edit' ? handleEditProfile : handleAddProfile}
              onCancel={goHome}
              submitLabel={view === 'edit' ? '✦ 保存并查看运势' : '✦ 开始今日运势'}
            />
          </div>
        )}

        {/* Results */}
        {view === 'result' && actionData?.reading && (
          <div className="space-y-5 animate-fade-in">

            {/* Profile header */}
            <div className="glass-strong rounded-2xl overflow-hidden shadow-lg shadow-amber-100/30">
              <div className="bg-gradient-to-r from-amber-500/20 to-yellow-300/20 px-5 py-5">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-white/70 border-2 border-white shadow-md flex items-center justify-center text-3xl">
                    {getZodiacEmoji(actionData.reading.zodiac)}
                  </div>
                  <div className="flex-1">
                    <p className="font-serif-cn font-bold text-lg text-gray-800">{actionData.formData?.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{actionData.reading.baziSummary}</p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {[
                        { label: actionData.reading.zodiac, color: 'bg-amber-100/80 text-amber-600 border-amber-200/60' },
                        { label: `${actionData.reading.element}`, color: 'bg-emerald-100/80 text-emerald-600 border-emerald-200/60' },
                        { label: actionData.reading.yinYang, color: 'bg-amber-100/80 text-amber-600 border-amber-200/60' },
                      ].map((tag) => (
                        <span key={tag.label} className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${tag.color}`}>{tag.label}</span>
                      ))}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-full bg-amber-500/15 border-2 border-amber-400/60 flex items-center justify-center">
                      <p className="font-serif-cn text-2xl font-bold text-amber-600">{actionData.reading.dayRating}<span className="text-xs text-amber-400">/5</span></p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Day summary */}
            <div className="glass-strong rounded-2xl overflow-hidden shadow-lg shadow-amber-100/30 animate-fade-in-delay">
              <div className="px-5 py-3 border-b border-white/30">
                <h3 className="text-xs font-semibold text-amber-500 tracking-widest">✦ 今日概览</h3>
              </div>
              <p className="px-5 py-4 text-sm text-gray-700 leading-relaxed">{actionData.reading.daySummary}</p>
            </div>

            <div className="divider-flower" />

            {/* Fortune categories */}
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="font-serif-cn text-lg font-bold text-gray-700">✦ 分类运势详解 ✦</h3>
                <p className="text-xs text-gray-400 mt-1">基于五行八字与天象推算</p>
              </div>
              {actionData.reading.fortunes.map((fortune, i) => (
                <div
                  key={fortune.name}
                  className="glass-strong rounded-2xl overflow-hidden shadow-lg shadow-amber-100/30 animate-fade-in"
                  style={{ animationDelay: `${i * 120}ms` }}
                >
                  <div className="px-5 py-4">
                    {/* Header row: emoji + name */}
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-serif-cn font-bold text-gray-800 flex items-center gap-2">
                        <span className="text-xl">{fortune.emoji}</span>
                        {fortune.name}
                      </h4>
                    </div>

                    {/* Keyword badge */}
                    <div className="mb-3">
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100/80 text-amber-600 border border-amber-200/60 font-medium">
                        关键词：{fortune.keyword}
                      </span>
                    </div>

                    {/* Summary */}
                    <p className="text-sm text-gray-700 leading-relaxed mb-3">{fortune.summary}</p>

                    {/* Advice box */}
                    <div className="bg-amber-50/60 border border-amber-200/40 rounded-xl p-3 flex items-start gap-2 mb-3">
                      <span className="text-sm">💡</span>
                      <p className="text-xs text-amber-700">{fortune.advice}</p>
                    </div>

                    {/* 宜/忌 badges */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-emerald-600 font-semibold shrink-0">✓ 宜</span>
                        {fortune.goodFor.map((item) => (
                          <span key={item} className="text-xs px-2 py-0.5 rounded-full bg-emerald-50/80 text-emerald-600 border border-emerald-200/60">{item}</span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-red-500 font-semibold shrink-0">✗ 忌</span>
                        {fortune.badFor.map((item) => (
                          <span key={item} className="text-xs px-2 py-0.5 rounded-full bg-red-50/80 text-red-500 border border-red-200/60">{item}</span>
                        ))}
                      </div>
                    </div>

                    {/* Song recommendation — APlayer + MetingJS */}
                    <div className="mt-3">
                      <p className="text-xs text-amber-600 mb-2 flex items-center gap-1.5">
                        <span>🎵</span> 今日适宜听 · {fortune.song.title} — {fortune.song.artist}
                      </p>
                      <div className="rounded-xl overflow-hidden" dangerouslySetInnerHTML={{
                        __html: `<meting-js server="netease" type="song" id="${fortune.song.songId}" mini="true" autoplay="false" preload="none"></meting-js>`
                      }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="divider-flower" />

            {/* Lucky colors */}
            <div className="glass-strong rounded-2xl overflow-hidden shadow-lg shadow-amber-100/30 animate-fade-in-delay">
              <div className="px-5 py-3 border-b border-white/30">
                <h3 className="text-xs font-semibold text-amber-500 tracking-widest">✦ 幸运色彩</h3>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex justify-center gap-6">
                  {actionData.reading.luckyColors.map((color, i) => (
                    <div key={i} className="text-center space-y-2">
                      <div
                        className="w-14 h-14 rounded-full mx-auto border-2 border-white shadow-lg"
                        style={{ backgroundColor: color.hex, boxShadow: `0 0 16px 2px ${color.hex}40` }}
                      />
                      <p className="text-xs font-semibold text-gray-700">{color.name}</p>
                      <p className="text-xs text-gray-400">{color.hex}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-amber-50/60 border border-amber-200/40 rounded-xl p-3 flex items-start gap-2">
                  <span className="text-sm">💡</span>
                  <p className="text-xs text-amber-700"><span className="font-semibold">{actionData.reading.luckyColor.name}：</span>{actionData.reading.luckyColor.reason}</p>
                </div>
              </div>
            </div>

            <div className="divider-flower" />

            {/* Foods */}
            <div className="glass-strong rounded-2xl overflow-hidden shadow-lg shadow-amber-100/30 animate-fade-in-delay-2">
              <div className="px-5 py-3 border-b border-white/30">
                <h3 className="text-xs font-semibold text-amber-500 tracking-widest">✦ 今日宜吃</h3>
              </div>
              <div className="p-4 space-y-2">
                {actionData.reading.foods.map((food, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-amber-50/40 transition-colors">
                    <span className="text-2xl w-10 text-center">{food.emoji}</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-700">{food.name}</p>
                      <p className="text-xs text-gray-500">{food.reason}</p>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100/80 text-emerald-600 font-medium">宜</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Avoid foods */}
            <div className="glass-strong rounded-2xl overflow-hidden shadow-lg shadow-amber-100/30">
              <div className="px-5 py-3 border-b border-white/30">
                <h3 className="text-xs font-semibold text-amber-500 tracking-widest">✦ 今日忌吃</h3>
              </div>
              <div className="p-4 space-y-2">
                {actionData.reading.avoidFoods.map((food, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-red-50/30 transition-colors">
                    <span className="text-2xl w-10 text-center">{food.emoji}</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-700">{food.name}</p>
                      <p className="text-xs text-gray-500">{food.reason}</p>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-red-100/80 text-red-500 font-medium">忌</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="divider-flower" />

            {/* Lucky number & direction */}
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-strong rounded-2xl p-5 text-center shadow-lg shadow-amber-100/30">
                <p className="text-xs text-gray-500 mb-2">幸运数字</p>
                <p className="font-serif-cn text-4xl font-bold text-amber-600">{actionData.reading.luckyNumber}</p>
              </div>
              <div className="glass-strong rounded-2xl p-5 text-center shadow-lg shadow-amber-100/30">
                <p className="text-xs text-gray-500 mb-2">幸运方位</p>
                <p className="font-serif-cn text-4xl font-bold text-amber-600">{actionData.reading.luckyDirection}</p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              <button
                onClick={goHome}
                className="w-full glass rounded-full py-3 text-gray-600 text-sm font-medium hover:bg-white/80 transition-all"
              >
                ← 返回成员列表
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => setView('edit')}
                  className="flex-1 glass rounded-full py-3 text-amber-600 text-sm font-medium hover:bg-white/80 transition-all"
                >
                  修改信息
                </button>
                {activeProfile && (
                  <button
                    onClick={() => handleDeleteProfile(activeProfile.id)}
                    className="glass rounded-full py-3 px-6 text-red-400 text-sm font-medium hover:bg-red-50/60 transition-all"
                  >
                    删除
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="relative z-10 text-center py-8 text-xs mt-8">
        <div className="flex items-center justify-center gap-2 text-amber-400 text-xs mb-3">
          <span>☰</span><span className="tracking-widest">· · ·</span><span>☰</span>
        </div>
        <p className="text-gray-500">知命 · 仅供娱乐参考</p>
        <p className="mt-1 text-gray-400">五行理论 & 和风天气 驱动</p>
      </footer>
    </div>
  );
}

/* ─── Profile Form sub-component ─── */

function ProfileForm({
  initialData,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  initialData: UserProfile | null;
  onSubmit: (data: Omit<UserProfile, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [name, setName] = useState(initialData?.name || '');
  const [birthday, setBirthday] = useState(initialData?.birthday || '');
  const [gender, setGender] = useState<'男' | '女'>(initialData?.gender || '男');
  const [birthHour, setBirthHour] = useState(initialData?.birthHour ?? 23);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !birthday) return;
    onSubmit({ name: name.trim(), birthday, gender, birthHour });
  };

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-5">
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-600">姓名 <span className="text-amber-500">*</span></label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="请输入姓名"
          required
          className="input-elegant w-full border border-amber-200/60 rounded-xl px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 bg-white/60 transition-all"
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-600">出生日期 <span className="text-amber-500">*</span></label>
        <input
          type="date"
          value={birthday}
          onChange={e => setBirthday(e.target.value)}
          required
          className="input-elegant w-full border border-amber-200/60 rounded-xl px-4 py-2.5 text-sm text-gray-700 bg-white/60 transition-all"
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-600">性别 <span className="text-amber-500">*</span></label>
        <div className="flex gap-3">
          {(['男', '女'] as const).map((g) => (
            <label key={g} className={`flex items-center gap-2 cursor-pointer flex-1 border rounded-xl px-4 py-2.5 transition-colors
              ${gender === g ? 'border-amber-500 bg-amber-50/80' : 'border-amber-200/60 bg-white/60 hover:bg-amber-50/60'}`}>
              <input
                type="radio"
                name="gender"
                value={g}
                checked={gender === g}
                onChange={() => setGender(g)}
                className="accent-amber-600"
              />
              <span className="text-sm text-gray-700 font-medium">{g === '男' ? '♂ 男' : '♀ 女'}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-600">出生时辰</label>
        <select
          value={birthHour}
          onChange={e => setBirthHour(parseInt(e.target.value))}
          className="input-elegant w-full border border-amber-200/60 rounded-xl px-4 py-2.5 text-sm text-gray-700 bg-white/60 transition-all"
        >
          {HOUR_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.symbol} {opt.label}</option>
          ))}
        </select>
        <p className="text-xs text-gray-400">用于八字推算（可选）</p>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 glass rounded-full py-3 text-gray-600 text-sm font-medium hover:bg-white/80 transition-all"
        >
          返回
        </button>
        <button
          type="submit"
          className="flex-1 btn-pill bg-gradient-to-r from-amber-500 to-amber-400 text-white text-sm"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
