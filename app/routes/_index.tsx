import { type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData, useNavigation, useSubmit } from "react-router";
import { useState, useEffect, useRef } from "react";
import { generateDailyReading, type DailyReading } from "~/utils/lucky";

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
    const weatherRes = await fetch(`https://pc38kyxume.re.qweatherapi.com/v7/weather/now?location=${lon},${lat}&key=${apiKey}&lang=zh`);
    const weatherJson = await weatherRes.json() as Record<string, unknown>;

    if ((weatherJson as { code?: string }).code !== '200') {
      return { weather: null, error: `天气API错误: ${(weatherJson as { code?: string }).code}`, lat, lon };
    }

    const now = (weatherJson as { now: WeatherData }).now;
    // 用坐标反推城市名（忽略失败）
    let locationName: string | null = null;
    try {
      const geoRes = await fetch(`https://geoapi.qweather.com/v2/city/lookup?location=${lon},${lat}&key=${apiKey}&lang=zh`);
      if (geoRes.ok) {
        const geoJson = await geoRes.json() as Record<string, unknown>;
        locationName = (geoJson as { location?: Array<{ name: string }> }).location?.[0]?.name ?? null;
      }
    } catch { /* 城市名获取失败不影响主流程 */ }

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
    return { weather: null, error: '获取天气失败，请检查网络', lat, lon };
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

const STORAGE_KEY = 'huaxin_user';

interface SavedUser {
  name: string;
  birthday: string;
  gender: string;
  birthHour: string;
}

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
  const isSubmitting = navigation.state === 'submitting';

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [savedUser, setSavedUser] = useState<SavedUser | null>(null);
  const [autoSubmitting, setAutoSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // On mount: check localStorage for saved user
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as SavedUser;
        if (parsed.name && parsed.birthday && parsed.gender) {
          setSavedUser(parsed);
          setAutoSubmitting(true);
          // If no coords in URL, auto-detect geolocation
          if (!loaderData.lat || !loaderData.lon) {
            if (navigator.geolocation) {
              setGeoLoading(true);
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  const { latitude, longitude } = pos.coords;
                  setGeoLoading(false);
                  window.location.href = `/?lat=${latitude}&lon=${longitude}`;
                },
                () => {
                  // Geo failed — fall back to normal flow
                  setAutoSubmitting(false);
                  setGeoLoading(false);
                }
              );
            } else {
              setAutoSubmitting(false);
            }
          }
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-submit when weather is ready + savedUser exists + autoSubmitting
  useEffect(() => {
    if (autoSubmitting && savedUser && loaderData.weather && !actionData?.reading && navigation.state === 'idle') {
      const formData = new FormData();
      formData.set('name', savedUser.name);
      formData.set('birthday', savedUser.birthday);
      formData.set('gender', savedUser.gender);
      formData.set('birthHour', savedUser.birthHour);
      formData.set('weatherTemp', loaderData.weather.temp || '20');
      formData.set('weatherCode', loaderData.weather.icon || '100');
      formData.set('weatherHumidity', loaderData.weather.humidity || '60');
      formData.set('weatherWindSpeed', loaderData.weather.windSpeed || '3');
      formData.set('weatherWindDir', loaderData.weather.windDir || '东');
      formData.set('weatherText', loaderData.weather.text || '晴');
      submit(formData, { method: 'post' });
    }
  }, [autoSubmitting, savedUser, loaderData.weather, actionData?.reading, navigation.state, submit]);

  useEffect(() => {
    if (actionData?.reading) {
      setAutoSubmitting(false);
      setStep(4);
    }
  }, [actionData]);

  // Save user data to localStorage on successful form submission
  useEffect(() => {
    if (actionData?.reading && actionData?.formData) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(actionData.formData));
      } catch {
        // Ignore storage errors
      }
    }
  }, [actionData]);

  useEffect(() => {
    if (loaderData.lat && loaderData.lon) {
      setCoords({ lat: parseFloat(loaderData.lat), lon: parseFloat(loaderData.lon) });
    }
  }, [loaderData]);

  const handleClearUser = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    setSavedUser(null);
    setAutoSubmitting(false);
    setStep(1);
    window.scrollTo(0, 0);
  };

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      setGeoError('您的浏览器不支持地理定位');
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lon: longitude });
        setGeoLoading(false);
        window.location.href = `/?lat=${latitude}&lon=${longitude}`;
      },
      (err) => {
        setGeoError(`定位失败: ${err.message}`);
        setGeoLoading(false);
      }
    );
  };

  const weather = loaderData.weather;
  const bg = getSeasonalBackground(weather?.text);

  const ratingStars = (rating: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < rating ? 'star-filled' : 'star-empty'}>★</span>
    ));

  return (
    <div className={`min-h-screen ${bg.className} font-sans relative`}>
      {/* Background image layer */}
      <div
        className="bg-scene"
        style={{ backgroundImage: `url(${bg.imageUrl})` }}
      />

      {/* Auto-submit loading screen */}
      {autoSubmitting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="text-center space-y-4 animate-fade-in">
            <div className="text-5xl animate-pulse">{getSeasonEmoji()}</div>
            <p className="font-serif-cn text-lg text-rose-500 tracking-wide">花信正在为您准备今日运势...</p>
            <div className="flex items-center justify-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-300 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}

      {/* Frosted glass header */}
      <header className="glass-header sticky top-0 z-50 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getSeasonEmoji()}</span>
            <h1 className="font-serif-cn text-xl font-bold text-rose-600 tracking-wide">花信</h1>
          </div>
          <div className="flex items-center gap-3">
            {savedUser && (
              <button
                onClick={handleClearUser}
                className="text-xs text-rose-400 hover:text-rose-600 transition-colors px-2 py-1 rounded-full border border-rose-200/60 bg-white/40 hover:bg-white/70"
              >
                修改信息
              </button>
            )}
            <div className="text-right">
              <p className="text-xs text-gray-600 font-medium">{getGregorianDateText()}</p>
              <p className="text-xs text-rose-400 font-serif-cn">{getLunarDateText()}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6 relative z-10">

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3 text-xs mb-2 animate-fade-in">
          {['天气气象', '个人信息', '今日运势'].map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300
                ${step > i + 1 ? 'bg-rose-400 text-white shadow-sm'
                  : step === i + 1 ? 'bg-rose-500 text-white shadow-md shadow-rose-200'
                  : 'bg-white/60 text-gray-400 border border-white/80'}`}>
                {step > i + 1 ? '✓' : i + 1}
              </span>
              <span className={`hidden sm:inline ${step === i + 1 ? 'text-rose-600 font-semibold' : 'text-gray-500'}`}>{label}</span>
              {i < 2 && <span className="text-rose-300">·</span>}
            </div>
          ))}
        </div>

        {/* Step 1 — Hero */}
        {step === 1 && (
          <div className="animate-fade-in text-center py-8 space-y-8">
            <div className="space-y-4">
              <h2 className="font-serif-cn text-4xl sm:text-5xl font-bold text-gray-800 leading-tight">
                花信
              </h2>
              <p className="font-serif-cn text-lg text-rose-500 tracking-widest">Bloom Signal</p>
              <div className="flex items-center justify-center gap-2 text-rose-300 text-sm">
                <span>✿</span><span>✿</span><span>✿</span>
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
                onClick={() => setStep(2)}
                className="btn-pill bg-gradient-to-r from-rose-400 to-pink-400 text-white text-sm"
              >
                开始探索 ✦
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Weather */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div className="glass-strong rounded-2xl overflow-hidden shadow-lg shadow-rose-100/30">
              <div className="px-5 py-4 border-b border-white/30">
                <h2 className="font-serif-cn font-semibold text-gray-700 flex items-center gap-2">
                  <span className="text-rose-400">❀</span> 天气与位置
                </h2>
              </div>
              <div className="p-5 space-y-4">
                {!weather ? (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 text-center">获取您的位置以读取当地天气信息</p>
                    {geoError && (
                      <div className="flex items-start gap-2 bg-amber-50/80 border border-amber-200/60 rounded-xl p-3">
                        <span className="text-sm">⚠️</span>
                        <p className="text-xs text-amber-700">{geoError}</p>
                      </div>
                    )}
                    {loaderData.error && (
                      <div className="flex items-start gap-2 bg-red-50/80 border border-red-200/60 rounded-xl p-3">
                        <span className="text-sm">❌</span>
                        <p className="text-xs text-red-600">{loaderData.error}</p>
                      </div>
                    )}
                    <button
                      onClick={handleGeolocate}
                      disabled={geoLoading}
                      className="btn-pill w-full bg-gradient-to-r from-rose-400 to-pink-400 text-white text-sm disabled:opacity-50"
                    >
                      {geoLoading ? '⏳ 正在定位...' : '📍 获取我的位置'}
                    </button>
                    <button
                      onClick={() => setStep(3)}
                      className="w-full text-gray-500 text-sm py-2 hover:text-rose-500 transition-colors"
                    >
                      跳过，使用默认天气数据 →
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-5 glass rounded-2xl">
                      <div>
                        <p className="font-serif-cn text-4xl font-bold text-gray-800">{weather.temp}°</p>
                        <p className="text-sm text-gray-600 mt-1">{weather.text}</p>
                        {weather.locationName && (
                          <p className="text-xs text-rose-400 mt-1">📍 {weather.locationName}</p>
                        )}
                      </div>
                      <div className="text-6xl drop-shadow-sm">{getWeatherEmoji(weather.icon)}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: '体感温度', value: `${weather.feelsLike}°C` },
                        { label: '湿度', value: `${weather.humidity}%` },
                        { label: '风速', value: `${weather.windSpeed} m/s` },
                      ].map((item) => (
                        <div key={item.label} className="text-center p-3 glass rounded-xl">
                          <p className="text-xs text-gray-500">{item.label}</p>
                          <p className="text-sm font-semibold text-gray-700 mt-0.5">{item.value}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => setStep(3)}
                      className="btn-pill w-full bg-gradient-to-r from-rose-400 to-pink-400 text-white text-sm"
                    >
                      继续 →
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3 — Personal Info */}
        {step === 3 && (
          <div className="glass-strong rounded-2xl overflow-hidden shadow-lg shadow-rose-100/30 animate-fade-in">
            <div className="px-5 py-4 border-b border-white/30">
              <h2 className="font-serif-cn font-semibold text-gray-700 flex items-center gap-2">
                <span className="text-rose-400">❀</span> 个人信息
              </h2>
            </div>
            <Form method="post" ref={formRef} className="p-5 space-y-5">
              <input type="hidden" name="lat" value={coords?.lat || ''} />
              <input type="hidden" name="lon" value={coords?.lon || ''} />
              <input type="hidden" name="weatherTemp" value={weather?.temp || '20'} />
              <input type="hidden" name="weatherCode" value={weather?.icon || '100'} />
              <input type="hidden" name="weatherHumidity" value={weather?.humidity || '60'} />
              <input type="hidden" name="weatherWindSpeed" value={weather?.windSpeed || '3'} />
              <input type="hidden" name="weatherWindDir" value={weather?.windDir || '东'} />
              <input type="hidden" name="weatherText" value={weather?.text || '晴'} />

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-600">姓名 <span className="text-rose-400">*</span></label>
                <input type="text" name="name" placeholder="请输入您的姓名" required
                  className="input-elegant w-full border border-rose-200/60 rounded-xl px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 bg-white/60 transition-all" />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-600">出生日期 <span className="text-rose-400">*</span></label>
                <input type="date" name="birthday" required
                  className="input-elegant w-full border border-rose-200/60 rounded-xl px-4 py-2.5 text-sm text-gray-700 bg-white/60 transition-all" />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-600">性别 <span className="text-rose-400">*</span></label>
                <div className="flex gap-3">
                  {['男', '女'].map((g) => (
                    <label key={g} className="flex items-center gap-2 cursor-pointer flex-1 border border-rose-200/60 rounded-xl px-4 py-2.5 bg-white/60 hover:bg-rose-50/60 transition-colors has-[:checked]:border-rose-400 has-[:checked]:bg-rose-50/80">
                      <input type="radio" name="gender" value={g} required className="accent-rose-500" />
                      <span className="text-sm text-gray-700 font-medium">{g === '男' ? '♂ 男' : '♀ 女'}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-600">出生时辰</label>
                <select name="birthHour"
                  className="input-elegant w-full border border-rose-200/60 rounded-xl px-4 py-2.5 text-sm text-gray-700 bg-white/60 transition-all">
                  {HOUR_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.symbol} {opt.label}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400">用于八字推算（可选）</p>
              </div>

              {actionData?.error && (
                <div className="flex items-center gap-2 bg-red-50/80 border border-red-200/60 rounded-xl p-3">
                  <span>❌</span>
                  <p className="text-xs text-red-600">{actionData.error}</p>
                </div>
              )}

              <button type="submit" disabled={isSubmitting}
                className="btn-pill w-full bg-gradient-to-r from-rose-400 to-pink-400 text-white text-sm disabled:opacity-50">
                {isSubmitting ? '✦ 正在推算运势...' : '✦ 开始今日运势'}
              </button>
            </Form>
          </div>
        )}

        {/* Step 4 — Results */}
        {step === 4 && actionData?.reading && (
          <div className="space-y-5 animate-fade-in">

            {/* Profile header */}
            <div className="glass-strong rounded-2xl overflow-hidden shadow-lg shadow-rose-100/30">
              <div className="bg-gradient-to-r from-rose-400/20 to-pink-300/20 px-5 py-5">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-white/70 border-2 border-white shadow-md flex items-center justify-center text-3xl">
                    {getZodiacEmoji(actionData.reading.zodiac)}
                  </div>
                  <div className="flex-1">
                    <p className="font-serif-cn font-bold text-lg text-gray-800">{actionData.formData?.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{actionData.reading.baziSummary}</p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {[
                        { label: actionData.reading.zodiac, color: 'bg-rose-100/80 text-rose-600 border-rose-200/60' },
                        { label: `${actionData.reading.element}`, color: 'bg-emerald-100/80 text-emerald-600 border-emerald-200/60' },
                        { label: actionData.reading.yinYang, color: 'bg-amber-100/80 text-amber-600 border-amber-200/60' },
                      ].map((tag) => (
                        <span key={tag.label} className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${tag.color}`}>{tag.label}</span>
                      ))}
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="font-serif-cn text-3xl font-bold text-rose-500">{actionData.reading.dayRating}<span className="text-sm text-gray-400">/5</span></p>
                    <div className="text-base mt-0.5">{ratingStars(actionData.reading.dayRating)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Day summary */}
            <div className="glass-strong rounded-2xl overflow-hidden shadow-lg shadow-rose-100/30 animate-fade-in-delay">
              <div className="px-5 py-3 border-b border-white/30">
                <h3 className="text-xs font-semibold text-rose-400 tracking-widest">✦ 今日概览</h3>
              </div>
              <p className="px-5 py-4 text-sm text-gray-700 leading-relaxed">{actionData.reading.daySummary}</p>
            </div>

            <div className="divider-flower" />

            {/* Lucky colors */}
            <div className="glass-strong rounded-2xl overflow-hidden shadow-lg shadow-rose-100/30 animate-fade-in-delay">
              <div className="px-5 py-3 border-b border-white/30">
                <h3 className="text-xs font-semibold text-rose-400 tracking-widest">✦ 幸运色彩</h3>
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
                <div className="bg-rose-50/60 border border-rose-200/40 rounded-xl p-3 flex items-start gap-2">
                  <span className="text-sm">💡</span>
                  <p className="text-xs text-rose-600"><span className="font-semibold">{actionData.reading.luckyColor.name}：</span>{actionData.reading.luckyColor.reason}</p>
                </div>
              </div>
            </div>

            <div className="divider-flower" />

            {/* Foods */}
            <div className="glass-strong rounded-2xl overflow-hidden shadow-lg shadow-rose-100/30 animate-fade-in-delay-2">
              <div className="px-5 py-3 border-b border-white/30">
                <h3 className="text-xs font-semibold text-rose-400 tracking-widest">✦ 今日宜吃</h3>
              </div>
              <div className="p-4 space-y-2">
                {actionData.reading.foods.map((food, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-rose-50/40 transition-colors">
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
            <div className="glass-strong rounded-2xl overflow-hidden shadow-lg shadow-rose-100/30">
              <div className="px-5 py-3 border-b border-white/30">
                <h3 className="text-xs font-semibold text-rose-400 tracking-widest">✦ 今日忌吃</h3>
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
              <div className="glass-strong rounded-2xl p-5 text-center shadow-lg shadow-rose-100/30">
                <p className="text-xs text-gray-500 mb-2">幸运数字</p>
                <p className="font-serif-cn text-4xl font-bold text-rose-500">{actionData.reading.luckyNumber}</p>
              </div>
              <div className="glass-strong rounded-2xl p-5 text-center shadow-lg shadow-rose-100/30">
                <p className="text-xs text-gray-500 mb-2">幸运方位</p>
                <p className="font-serif-cn text-4xl font-bold text-rose-500">{actionData.reading.luckyDirection}</p>
              </div>
            </div>

            <button
              onClick={() => { setStep(1); window.scrollTo(0, 0); }}
              className="w-full glass rounded-full py-3 text-gray-600 text-sm font-medium hover:bg-white/80 transition-all"
            >
              ↺ 重新开始
            </button>
            {savedUser && (
              <button
                onClick={handleClearUser}
                className="w-full glass rounded-full py-3 text-rose-500 text-sm font-medium hover:bg-white/80 transition-all"
              >
                切换用户 / 修改信息
              </button>
            )}
          </div>
        )}
      </main>

      <footer className="relative z-10 text-center py-8 text-xs mt-8">
        <div className="flex items-center justify-center gap-2 text-rose-300 text-xs mb-3">
          <span>❀</span><span className="tracking-widest">· · ·</span><span>❀</span>
        </div>
        <p className="text-gray-500">花信 · 仅供娱乐参考</p>
        <p className="mt-1 text-gray-400">五行理论 & 和风天气 驱动</p>
      </footer>
    </div>
  );
}
