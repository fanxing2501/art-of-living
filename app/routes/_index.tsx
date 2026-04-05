import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
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
    return json<LoaderData>({ weather: null, error: null, lat: null, lon: null });
  }

  const apiKey = process.env.QWEATHER_KEY;
  if (!apiKey || apiKey === 'demo_key') {
    return json<LoaderData>({ weather: null, error: '未配置天气API密钥', lat, lon });
  }

  try {
    const [weatherRes, geoRes] = await Promise.all([
      fetch(`https://devapi.qweather.com/v7/weather/now?location=${lon},${lat}&key=${apiKey}&lang=zh`),
      fetch(`https://geoapi.qweather.com/v2/city/lookup?location=${lon},${lat}&key=${apiKey}&lang=zh`),
    ]);

    const weatherJson = await weatherRes.json() as Record<string, unknown>;
    const geoJson = await geoRes.json() as Record<string, unknown>;

    if ((weatherJson as { code?: string }).code !== '200') {
      return json<LoaderData>({ weather: null, error: `天气API错误: ${(weatherJson as { code?: string }).code}`, lat, lon });
    }

    const now = (weatherJson as { now: WeatherData }).now;
    const locations = (geoJson as { location?: Array<{ name: string }> }).location;
    const locationName = locations?.[0]?.name || null;

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

    return json<LoaderData>({ weather, error: null, lat, lon });
  } catch {
    return json<LoaderData>({ weather: null, error: '获取天气失败，请检查网络', lat, lon });
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
    return json<ActionData>({ reading: null, error: '请填写完整信息', formData: null });
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

  return json<ActionData>({
    reading,
    error: null,
    formData: { name, birthday, gender, birthHour: String(birthHour) },
  });
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
    <div className="min-h-screen bg-amber-50">
      <header className="bg-gradient-to-b from-red-800 to-red-700 text-white py-8 px-4 text-center shadow-lg">
        <div className="max-w-2xl mx-auto">
          <div className="text-6xl mb-2">📜</div>
          <h1 className="text-5xl font-bold tracking-widest mb-1" style={{ fontFamily: 'serif', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
            新黄历
          </h1>
          <p className="text-amber-200 text-sm tracking-wider">天时地利人和 · 顺天应时</p>
          <div className="mt-4 flex flex-col items-center gap-1">
            <p className="text-amber-100 text-base font-medium">{getGregorianDateText()}</p>
            <p className="text-amber-300 text-sm">{getLunarDateText()}</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-md border border-amber-200 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-red-600 p-4">
              <h2 className="text-white text-xl font-bold text-center">✨ 今日运势占卜 ✨</h2>
            </div>
            <div className="p-6 text-center space-y-4">
              <p className="text-gray-600 leading-relaxed">
                新黄历融合天干地支、五行生肖、气象节令，<br />
                为您量身定制今日运势、幸运色彩与饮食宜忌。
              </p>
              <div className="grid grid-cols-3 gap-3 my-6">
                {['🌤️ 天气节令', '🔮 生辰八字', '🍀 五行运势'].map((item) => (
                  <div key={item} className="bg-amber-50 rounded-xl p-3 text-sm text-amber-800 font-medium border border-amber-200">
                    {item}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setStep(2)}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-4 rounded-xl text-lg font-bold tracking-widest hover:from-red-700 hover:to-red-800 transition-all shadow-md active:scale-95"
              >
                开始占卜 →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-md border border-amber-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4">
                <h2 className="text-white text-xl font-bold text-center">🌍 当前位置与天气</h2>
              </div>
              <div className="p-6 space-y-4">
                {!weather ? (
                  <div className="text-center space-y-4">
                    <p className="text-gray-500">获取您的位置以查询当地天气</p>
                    {geoError && (
                      <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{geoError}</p>
                    )}
                    {loaderData.error && (
                      <p className="text-orange-500 text-sm bg-orange-50 p-3 rounded-lg">{loaderData.error}</p>
                    )}
                    <button
                      onClick={handleGeolocate}
                      disabled={geoLoading}
                      className="w-full bg-blue-500 text-white py-3 rounded-xl font-bold hover:bg-blue-600 transition-all disabled:opacity-50"
                    >
                      {geoLoading ? '定位中...' : '📍 自动获取位置'}
                    </button>
                    <p className="text-xs text-gray-400">或直接跳过，使用默认天气数据</p>
                    <button
                      onClick={() => setStep(3)}
                      className="w-full border border-gray-300 text-gray-600 py-2 rounded-xl text-sm hover:bg-gray-50 transition-all"
                    >
                      跳过 →
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between bg-gradient-to-r from-sky-50 to-blue-50 p-4 rounded-xl border border-sky-200">
                      <div>
                        <p className="text-3xl font-bold text-blue-700">{weather.temp}°C</p>
                        <p className="text-gray-600">{weather.text}</p>
                        {weather.locationName && (
                          <p className="text-sm text-gray-500">📍 {weather.locationName}</p>
                        )}
                      </div>
                      <div className="text-6xl">{getWeatherEmoji(weather.icon)}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-200">
                        <p className="text-xs text-gray-500">体感温度</p>
                        <p className="font-bold text-gray-700">{weather.feelsLike}°C</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-200">
                        <p className="text-xs text-gray-500">湿度</p>
                        <p className="font-bold text-gray-700">{weather.humidity}%</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-200">
                        <p className="text-xs text-gray-500">风速</p>
                        <p className="font-bold text-gray-700">{weather.windSpeed}m/s</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 text-center">{weather.windDir}</p>
                  </div>
                )}
              </div>
            </div>
            {weather && (
              <button
                onClick={() => setStep(3)}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-4 rounded-xl text-lg font-bold tracking-widest hover:from-red-700 hover:to-red-800 transition-all shadow-md"
              >
                下一步：填写个人信息 →
              </button>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="bg-white rounded-2xl shadow-md border border-amber-200 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-red-600 p-4">
              <h2 className="text-white text-xl font-bold text-center">📝 个人信息</h2>
            </div>
            <Form method="post" className="p-6 space-y-5">
              <input type="hidden" name="lat" value={coords?.lat || ''} />
              <input type="hidden" name="lon" value={coords?.lon || ''} />
              <input type="hidden" name="weatherTemp" value={weather?.temp || '20'} />
              <input type="hidden" name="weatherCode" value={weather?.icon || '100'} />
              <input type="hidden" name="weatherHumidity" value={weather?.humidity || '60'} />
              <input type="hidden" name="weatherWindSpeed" value={weather?.windSpeed || '3'} />
              <input type="hidden" name="weatherWindDir" value={weather?.windDir || '东'} />
              <input type="hidden" name="weatherText" value={weather?.text || '晴'} />

              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">
                  <span className="text-red-500">*</span> 姓名
                </label>
                <input
                  type="text"
                  name="name"
                  placeholder="请输入您的姓名"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">
                  <span className="text-red-500">*</span> 生日
                </label>
                <input
                  type="date"
                  name="birthday"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">
                  <span className="text-red-500">*</span> 性别
                </label>
                <div className="flex gap-4">
                  {['男', '女'].map((g) => (
                    <label key={g} className="flex items-center gap-2 cursor-pointer flex-1">
                      <input
                        type="radio"
                        name="gender"
                        value={g}
                        className="accent-red-500 w-4 h-4"
                        required
                      />
                      <span className="text-gray-700 font-medium">
                        {g === '男' ? '♂ 男' : '♀ 女'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">
                  出生时辰
                </label>
                <select
                  name="birthHour"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all bg-white"
                >
                  {HOUR_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.symbol} {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400">用于生辰八字测算，如不确定可不填</p>
              </div>

              {actionData?.error && (
                <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{actionData.error}</p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-4 rounded-xl text-lg font-bold tracking-widest hover:from-red-700 hover:to-red-800 transition-all shadow-md disabled:opacity-50 active:scale-95"
              >
                {isSubmitting ? '占卜中...' : '🔮 开始占卜'}
              </button>
            </Form>
          </div>
        )}

        {step === 4 && actionData?.reading && (
          <div className="space-y-5">
            <div className="bg-gradient-to-br from-red-700 to-red-800 text-white rounded-2xl p-6 shadow-lg text-center">
              <p className="text-amber-200 text-sm mb-1">✨ {actionData.formData?.name} 的今日运势 ✨</p>
              <div className="text-4xl my-3">{getZodiacEmoji(actionData.reading.zodiac)}</div>
              <p className="text-lg font-bold">{actionData.reading.baziSummary}</p>
              <div className="flex justify-center gap-4 mt-3 text-sm flex-wrap">
                <span className="bg-red-600 px-3 py-1 rounded-full">生肖{actionData.reading.zodiac}</span>
                <span className="bg-red-600 px-3 py-1 rounded-full">{actionData.reading.element}命</span>
                <span className="bg-red-600 px-3 py-1 rounded-full">{actionData.reading.yinYang}性</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md border border-amber-200 p-5">
              <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                <span>📊</span> 今日综合评分
              </h3>
              <div className="flex items-center gap-3 mb-3">
                <div className="text-3xl">{ratingStars(actionData.reading.dayRating)}</div>
                <span className="text-xl font-bold text-amber-600">{actionData.reading.dayRating}/5</span>
              </div>
              <p className="text-gray-600 leading-relaxed text-sm">{actionData.reading.daySummary}</p>
            </div>

            <div className="bg-white rounded-2xl shadow-md border border-amber-200 p-5">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span>🎨</span> 今日幸运色
              </h3>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {actionData.reading.luckyColors.map((color, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <div
                      className="w-16 h-16 rounded-full shadow-md border-2 border-white ring-2 ring-gray-100"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="text-sm font-medium text-gray-700">{color.name}</span>
                    <span className="text-xs text-gray-400">{color.hex}</span>
                  </div>
                ))}
              </div>
              <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
                <p className="text-sm text-amber-800">
                  <span className="font-bold">主色：{actionData.reading.luckyColor.name}</span><br />
                  {actionData.reading.luckyColor.reason}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md border border-amber-200 p-5">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span>🍽️</span> 今日宜吃
              </h3>
              <div className="space-y-3">
                {actionData.reading.foods.map((food, i) => (
                  <div key={i} className="flex items-start gap-3 bg-green-50 rounded-xl p-3 border border-green-200">
                    <span className="text-2xl">{food.emoji}</span>
                    <div>
                      <p className="font-bold text-gray-800">{food.name}</p>
                      <p className="text-sm text-gray-600">{food.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md border border-amber-200 p-5">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span>⚠️</span> 今日不宜吃
              </h3>
              <div className="space-y-3">
                {actionData.reading.avoidFoods.map((food, i) => (
                  <div key={i} className="flex items-start gap-3 bg-red-50 rounded-xl p-3 border border-red-200">
                    <span className="text-2xl">{food.emoji}</span>
                    <div>
                      <p className="font-bold text-gray-800">{food.name}</p>
                      <p className="text-sm text-gray-600">{food.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl shadow-md border border-amber-200 p-5 text-center">
                <p className="text-gray-500 text-sm mb-2">🔢 幸运数字</p>
                <p className="text-4xl font-bold text-red-600">{actionData.reading.luckyNumber}</p>
              </div>
              <div className="bg-white rounded-2xl shadow-md border border-amber-200 p-5 text-center">
                <p className="text-gray-500 text-sm mb-2">🧭 幸运方位</p>
                <p className="text-4xl font-bold text-red-600">{actionData.reading.luckyDirection}</p>
              </div>
            </div>

            <button
              onClick={() => { setStep(1); window.scrollTo(0, 0); }}
              className="w-full border-2 border-red-600 text-red-600 py-4 rounded-xl text-lg font-bold hover:bg-red-50 transition-all"
            >
              🔄 重新占卜
            </button>
          </div>
        )}
      </main>

      <footer className="text-center py-8 text-gray-400 text-sm">
        <p>新黄历 · 传承古典智慧 · 融合现代科技</p>
        <p className="mt-1">仅供娱乐参考，请勿迷信</p>
      </footer>
    </div>
  );
}
