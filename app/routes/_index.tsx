import { type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import { useState, useEffect } from "react";
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

function getZodiacEmoji(zodiac: string): string {
  const map: Record<string, string> = {
    '鼠': '🐭', '牛': '🐄', '虎': '🐯', '兔': '🐰', '龙': '🐲', '蛇': '🐍',
    '马': '🐴', '羊': '🐑', '猴': '🐵', '鸡': '🐓', '狗': '🐕', '猪': '🐷',
  };
  return map[zodiac] || '🐲';
}

export default function Index() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  useEffect(() => {
    if (actionData?.reading) {
      setStep(4);
    }
  }, [actionData]);

  useEffect(() => {
    if (loaderData.lat && loaderData.lon) {
      setCoords({ lat: parseFloat(loaderData.lat), lon: parseFloat(loaderData.lon) });
    }
  }, [loaderData]);

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

  const ratingStars = (rating: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < rating ? 'text-yellow-500' : 'text-gray-300'}>★</span>
    ));

  return (
    <div className="min-h-screen bg-[#f6f8fa] font-sans">
      {/* GitHub-style navbar */}
      <header className="bg-[#24292f] text-white px-4 py-3 border-b border-[#444c56]">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg height="32" viewBox="0 0 16 16" width="32" fill="white" aria-hidden="true">
              <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
            </svg>
            <span className="font-semibold text-base">Art of Living</span>
          </div>
          <div className="text-[#8b949e] text-xs">{getGregorianDateText()} · {getLunarDateText()}</div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-4">

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs text-[#57606a] mb-2">
          {['Location & Weather', 'Personal Info', 'Your Reading'].map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold border
                ${step > i + 1 ? 'bg-[#1f883d] border-[#1f883d] text-white'
                  : step === i + 1 ? 'bg-[#0969da] border-[#0969da] text-white'
                  : 'bg-white border-[#d0d7de] text-[#57606a]'}`}>
                {step > i + 1 ? '✓' : i + 1}
              </span>
              <span className={step === i + 1 ? 'text-[#0969da] font-medium' : ''}>{label}</span>
              {i < 2 && <span className="text-[#d0d7de]">›</span>}
            </div>
          ))}
        </div>

        {/* Step 1 — Hero */}
        {step === 1 && (
          <div className="bg-white border border-[#d0d7de] rounded-md overflow-hidden">
            <div className="border-b border-[#d0d7de] bg-[#f6f8fa] px-4 py-3 flex items-center gap-2">
              <span className="text-base">✦</span>
              <span className="font-semibold text-[#24292f] text-sm">Art of Living — Daily Reading</span>
            </div>
            <div className="p-6 space-y-5">
              <p className="text-[#57606a] text-sm leading-relaxed">
                Art of Living combines Five Elements (五行), Chinese Zodiac, birth chart (生辰八字),
                local weather, and seasonal energy to generate your personalized daily lucky colors and dietary guidance.
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: '🌤', label: 'Weather & Season', desc: 'Real-time local data' },
                  { icon: '☯', label: 'Five Elements', desc: '天干地支 · 五行' },
                  { icon: '🍃', label: 'Wellness Guide', desc: 'Foods & lucky colors' },
                ].map((item) => (
                  <div key={item.label} className="border border-[#d0d7de] rounded-md p-3 text-center bg-[#f6f8fa]">
                    <div className="text-2xl mb-1">{item.icon}</div>
                    <p className="text-xs font-semibold text-[#24292f]">{item.label}</p>
                    <p className="text-xs text-[#57606a] mt-0.5">{item.desc}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setStep(2)}
                className="w-full bg-[#1f883d] hover:bg-[#1a7f37] text-white text-sm font-semibold py-2 px-4 rounded-md border border-[#1f883d] transition-colors"
              >
                Get started →
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Weather */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-white border border-[#d0d7de] rounded-md overflow-hidden">
              <div className="border-b border-[#d0d7de] bg-[#f6f8fa] px-4 py-3">
                <h2 className="font-semibold text-[#24292f] text-sm">Location &amp; Weather</h2>
              </div>
              <div className="p-5 space-y-4">
                {!weather ? (
                  <div className="space-y-3">
                    <p className="text-sm text-[#57606a]">Allow location access to fetch your local weather conditions.</p>
                    {geoError && (
                      <div className="flex items-start gap-2 bg-[#fff8c5] border border-[#d4a72c] rounded-md p-3">
                        <span className="text-sm">⚠️</span>
                        <p className="text-xs text-[#633c01]">{geoError}</p>
                      </div>
                    )}
                    {loaderData.error && (
                      <div className="flex items-start gap-2 bg-[#ffebe9] border border-[#ff818266] rounded-md p-3">
                        <span className="text-sm">❌</span>
                        <p className="text-xs text-[#82071e]">{loaderData.error}</p>
                      </div>
                    )}
                    <button
                      onClick={handleGeolocate}
                      disabled={geoLoading}
                      className="w-full bg-[#0969da] hover:bg-[#0550ae] text-white text-sm font-semibold py-2 px-4 rounded-md border border-[#0969da] transition-colors disabled:opacity-50"
                    >
                      {geoLoading ? '⏳ Detecting location...' : '📍 Use my location'}
                    </button>
                    <button
                      onClick={() => setStep(3)}
                      className="w-full bg-white hover:bg-[#f3f4f6] text-[#24292f] text-sm font-medium py-2 px-4 rounded-md border border-[#d0d7de] transition-colors"
                    >
                      Skip — use default weather data
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-[#f6f8fa] border border-[#d0d7de] rounded-md">
                      <div>
                        <p className="text-2xl font-bold text-[#24292f]">{weather.temp}°C</p>
                        <p className="text-sm text-[#57606a]">{weather.text}</p>
                        {weather.locationName && (
                          <p className="text-xs text-[#57606a] mt-0.5">📍 {weather.locationName}</p>
                        )}
                      </div>
                      <div className="text-5xl">{getWeatherEmoji(weather.icon)}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Feels like', value: `${weather.feelsLike}°C` },
                        { label: 'Humidity', value: `${weather.humidity}%` },
                        { label: 'Wind', value: `${weather.windSpeed} m/s` },
                      ].map((item) => (
                        <div key={item.label} className="text-center p-2 bg-[#f6f8fa] border border-[#d0d7de] rounded-md">
                          <p className="text-xs text-[#57606a]">{item.label}</p>
                          <p className="text-sm font-semibold text-[#24292f]">{item.value}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => setStep(3)}
                      className="w-full bg-[#1f883d] hover:bg-[#1a7f37] text-white text-sm font-semibold py-2 px-4 rounded-md border border-[#1f883d] transition-colors"
                    >
                      Continue →
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3 — Personal Info */}
        {step === 3 && (
          <div className="bg-white border border-[#d0d7de] rounded-md overflow-hidden">
            <div className="border-b border-[#d0d7de] bg-[#f6f8fa] px-4 py-3">
              <h2 className="font-semibold text-[#24292f] text-sm">Personal Information</h2>
            </div>
            <Form method="post" className="p-5 space-y-4">
              <input type="hidden" name="lat" value={coords?.lat || ''} />
              <input type="hidden" name="lon" value={coords?.lon || ''} />
              <input type="hidden" name="weatherTemp" value={weather?.temp || '20'} />
              <input type="hidden" name="weatherCode" value={weather?.icon || '100'} />
              <input type="hidden" name="weatherHumidity" value={weather?.humidity || '60'} />
              <input type="hidden" name="weatherWindSpeed" value={weather?.windSpeed || '3'} />
              <input type="hidden" name="weatherWindDir" value={weather?.windDir || '东'} />
              <input type="hidden" name="weatherText" value={weather?.text || '晴'} />

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#24292f]">姓名 <span className="text-[#cf222e]">*</span></label>
                <input type="text" name="name" placeholder="Your name" required
                  className="w-full border border-[#d0d7de] rounded-md px-3 py-2 text-sm text-[#24292f] placeholder-[#8c959f] bg-white focus:outline-none focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da33] transition-all" />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#24292f]">生日 Birthday <span className="text-[#cf222e]">*</span></label>
                <input type="date" name="birthday" required
                  className="w-full border border-[#d0d7de] rounded-md px-3 py-2 text-sm text-[#24292f] bg-white focus:outline-none focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da33] transition-all" />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#24292f]">性别 Gender <span className="text-[#cf222e]">*</span></label>
                <div className="flex gap-3">
                  {['男', '女'].map((g) => (
                    <label key={g} className="flex items-center gap-2 cursor-pointer flex-1 border border-[#d0d7de] rounded-md px-3 py-2 hover:bg-[#f6f8fa] transition-colors has-[:checked]:border-[#0969da] has-[:checked]:bg-[#ddf4ff]">
                      <input type="radio" name="gender" value={g} required className="accent-[#0969da]" />
                      <span className="text-sm text-[#24292f] font-medium">{g === '男' ? '♂ 男 Male' : '♀ 女 Female'}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#24292f]">出生时辰 Birth Hour</label>
                <select name="birthHour"
                  className="w-full border border-[#d0d7de] rounded-md px-3 py-2 text-sm text-[#24292f] bg-white focus:outline-none focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da33] transition-all">
                  {HOUR_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.symbol} {opt.label}</option>
                  ))}
                </select>
                <p className="text-xs text-[#57606a]">Used for birth chart (生辰八字) calculation. Optional.</p>
              </div>

              {actionData?.error && (
                <div className="flex items-center gap-2 bg-[#ffebe9] border border-[#ff818266] rounded-md p-3">
                  <span>❌</span>
                  <p className="text-xs text-[#82071e]">{actionData.error}</p>
                </div>
              )}

              <button type="submit" disabled={isSubmitting}
                className="w-full bg-[#1f883d] hover:bg-[#1a7f37] text-white text-sm font-semibold py-2 px-4 rounded-md border border-[#1f883d] transition-colors disabled:opacity-50">
                {isSubmitting ? '⏳ Generating your reading...' : '✦ Generate Daily Reading'}
              </button>
            </Form>
          </div>
        )}

        {/* Step 4 — Results */}
        {step === 4 && actionData?.reading && (
          <div className="space-y-4">
            {/* Profile header */}
            <div className="bg-white border border-[#d0d7de] rounded-md p-5 flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#f6f8fa] border border-[#d0d7de] flex items-center justify-center text-3xl">
                {getZodiacEmoji(actionData.reading.zodiac)}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-[#24292f]">{actionData.formData?.name}</p>
                <p className="text-xs text-[#57606a]">{actionData.reading.baziSummary}</p>
                <div className="flex gap-2 mt-1.5 flex-wrap">
                  {[
                    { label: actionData.reading.zodiac, color: 'bg-[#ddf4ff] text-[#0550ae] border-[#54aeff66]' },
                    { label: `${actionData.reading.element} Element`, color: 'bg-[#dafbe1] text-[#116329] border-[#4ac26b66]' },
                    { label: actionData.reading.yinYang, color: 'bg-[#fff8c5] text-[#633c01] border-[#d4a72c66]' },
                  ].map((tag) => (
                    <span key={tag.label} className={`text-xs px-2 py-0.5 rounded-full border font-medium ${tag.color}`}>{tag.label}</span>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-[#24292f]">{actionData.reading.dayRating}<span className="text-sm text-[#57606a]">/5</span></p>
                <div className="text-sm">{ratingStars(actionData.reading.dayRating)}</div>
              </div>
            </div>

            {/* Day summary */}
            <div className="bg-white border border-[#d0d7de] rounded-md overflow-hidden">
              <div className="border-b border-[#d0d7de] bg-[#f6f8fa] px-4 py-2">
                <h3 className="text-xs font-semibold text-[#57606a] uppercase tracking-wide">Today's Summary</h3>
              </div>
              <p className="px-4 py-3 text-sm text-[#24292f] leading-relaxed">{actionData.reading.daySummary}</p>
            </div>

            {/* Lucky colors */}
            <div className="bg-white border border-[#d0d7de] rounded-md overflow-hidden">
              <div className="border-b border-[#d0d7de] bg-[#f6f8fa] px-4 py-2">
                <h3 className="text-xs font-semibold text-[#57606a] uppercase tracking-wide">Lucky Colors</h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex gap-3">
                  {actionData.reading.luckyColors.map((color, i) => (
                    <div key={i} className="flex items-center gap-2 flex-1 border border-[#d0d7de] rounded-md p-2">
                      <div className="w-8 h-8 rounded-md flex-shrink-0 border border-[#d0d7de]" style={{ backgroundColor: color.hex }} />
                      <div>
                        <p className="text-xs font-semibold text-[#24292f]">{color.name}</p>
                        <p className="text-xs text-[#57606a] font-mono">{color.hex}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-start gap-2 bg-[#ddf4ff] border border-[#54aeff66] rounded-md p-3">
                  <span className="text-sm">💡</span>
                  <p className="text-xs text-[#0550ae]"><span className="font-semibold">{actionData.reading.luckyColor.name}:</span> {actionData.reading.luckyColor.reason}</p>
                </div>
              </div>
            </div>

            {/* Foods */}
            <div className="bg-white border border-[#d0d7de] rounded-md overflow-hidden">
              <div className="border-b border-[#d0d7de] bg-[#f6f8fa] px-4 py-2">
                <h3 className="text-xs font-semibold text-[#57606a] uppercase tracking-wide">Recommended Foods 今日宜吃</h3>
              </div>
              <div className="divide-y divide-[#d0d7de]">
                {actionData.reading.foods.map((food, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-xl w-8 text-center">{food.emoji}</span>
                    <div>
                      <p className="text-sm font-semibold text-[#24292f]">{food.name}</p>
                      <p className="text-xs text-[#57606a]">{food.reason}</p>
                    </div>
                    <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-[#dafbe1] text-[#116329] border border-[#4ac26b66]">✓ Recommended</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Avoid foods */}
            <div className="bg-white border border-[#d0d7de] rounded-md overflow-hidden">
              <div className="border-b border-[#d0d7de] bg-[#f6f8fa] px-4 py-2">
                <h3 className="text-xs font-semibold text-[#57606a] uppercase tracking-wide">Foods to Avoid 今日忌吃</h3>
              </div>
              <div className="divide-y divide-[#d0d7de]">
                {actionData.reading.avoidFoods.map((food, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-xl w-8 text-center">{food.emoji}</span>
                    <div>
                      <p className="text-sm font-semibold text-[#24292f]">{food.name}</p>
                      <p className="text-xs text-[#57606a]">{food.reason}</p>
                    </div>
                    <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-[#ffebe9] text-[#82071e] border border-[#ff818266]">✕ Avoid</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Lucky number & direction */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white border border-[#d0d7de] rounded-md p-4 text-center">
                <p className="text-xs text-[#57606a] uppercase tracking-wide mb-1">Lucky Number</p>
                <p className="text-4xl font-bold text-[#0969da]">{actionData.reading.luckyNumber}</p>
              </div>
              <div className="bg-white border border-[#d0d7de] rounded-md p-4 text-center">
                <p className="text-xs text-[#57606a] uppercase tracking-wide mb-1">Lucky Direction</p>
                <p className="text-4xl font-bold text-[#0969da]">{actionData.reading.luckyDirection}</p>
              </div>
            </div>

            <button
              onClick={() => { setStep(1); window.scrollTo(0, 0); }}
              className="w-full bg-white hover:bg-[#f3f4f6] text-[#24292f] text-sm font-semibold py-2 px-4 rounded-md border border-[#d0d7de] transition-colors"
            >
              ↺ Start over
            </button>
          </div>
        )}
      </main>

      <footer className="text-center py-8 text-[#57606a] text-xs border-t border-[#d0d7de] mt-8">
        <p>Art of Living · For entertainment purposes only</p>
        <p className="mt-1 text-[#8c959f]">Powered by Five Elements Theory &amp; QWeather</p>
      </footer>
    </div>
  );
}
