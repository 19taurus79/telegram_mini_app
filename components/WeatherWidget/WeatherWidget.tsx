'use client';

import { useEffect, useState, useCallback } from 'react';
import { ClipLoader } from 'react-spinners';
import { RefreshCw } from 'lucide-react';
import css from './WeatherWidget.module.css';

// Helper function to interpret weather codes from Open-Meteo
const getWeatherInterpretation = (code: number) => {
  const interpretations: { [key: number]: { description: string; emoji: string } } = {
    0: { description: 'Ясно', emoji: '☀️' },
    1: { description: 'Переважно ясно', emoji: '🌤️' },
    2: { description: 'Мінлива хмарність', emoji: '⛅' },
    3: { description: 'Похмуро', emoji: '☁️' },
    45: { description: 'Туман', emoji: '🌫️' },
    48: { description: 'Паморозь', emoji: '🥶' },
    51: { description: 'Легка мряка', emoji: '🌦️' },
    53: { description: 'Помірна мряка', emoji: '🌦️' },
    55: { description: 'Сильна мряка', emoji: '🌧️' },
    61: { description: 'Невеликий дощ', emoji: '🌧️' },
    63: { description: 'Помірний дощ', emoji: '🌧️' },
    65: { description: 'Сильний дощ', emoji: '⛈️' },
    80: { description: 'Невеликі зливи', emoji: '🌦️' },
    81: { description: 'Помірні зливи', emoji: '🌧️' },
    82: { description: 'Сильні зливи', emoji: '⛈️' },
    95: { description: 'Гроза', emoji: '⚡' },
  };
  return interpretations[code] || { description: 'Немає даних', emoji: '🤷' };
};

interface CurrentWeather {
  temperature_2m: number;
  weather_code: number;
}

interface HourlyData {
  time: string[];
  temperature_2m: number[];
  weather_code: number[];
}

interface DailyData {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
}

interface WeatherData {
  current: CurrentWeather;
  hourly: HourlyData;
  daily: DailyData;
}

const WeatherWidget = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [locationName, setLocationName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWeatherAndLocation = useCallback(
    (latitude: number, longitude: number) => {
      setLoading(true);
      setError(null);

      const weatherPromise = fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`
      );
      const geocodePromise = fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=uk`
      );

      Promise.all([weatherPromise, geocodePromise])
        .then(async ([weatherRes, geocodeRes]) => {
          if (!weatherRes.ok) {
            throw new Error('Weather API request failed');
          }
          if (!geocodeRes.ok) {
            throw new Error('Geocode API request failed');
          }

          const weatherData = await weatherRes.json();
          const geocodeData = await geocodeRes.json();

          if (weatherData.current && weatherData.hourly && weatherData.daily) {
            setWeather(weatherData);
          } else {
            setError('Не вдалося отримати дані про погоду.');
          }

          setLocationName(
            geocodeData.city ||
              geocodeData.principalSubdivision ||
              'Невідоме місце'
          );
        })
        .catch(() => {
          setError('Помилка під час запиту даних.');
        })
        .finally(() => {
          setLoading(false);
        });
    },
    []
  );

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Геолокація не підтримується вашим браузером.');
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        localStorage.setItem(
          'user_location',
          JSON.stringify({ latitude, longitude })
        );
        fetchWeatherAndLocation(latitude, longitude);
      },
      (err) => {
        setError(`Помилка отримання геолокації: ${err.message}`);
        setLoading(false);
      }
    );
  }, [fetchWeatherAndLocation]);

  useEffect(() => {
    const locationStr = localStorage.getItem('user_location');
    if (locationStr) {
      const { latitude, longitude } = JSON.parse(locationStr);
      fetchWeatherAndLocation(latitude, longitude);
    } else {
      getLocation();
    }
  }, [fetchWeatherAndLocation, getLocation]);

  const handleRefreshLocation = () => {
    setLoading(true);
    setError(null);
    setLocationName('');
    localStorage.removeItem('user_location');
    getLocation();
  };

  if (loading) {
    return (
      <div className={css.widget}>
        <p>Завантаження погоди...</p>
        <ClipLoader size={20} color={'#fff'} />
      </div>
    );
  }

  if (error) {
    return <div className={`${css.widget} ${css.error}`}>{error}</div>;
  }

  if (!weather) {
    return null;
  }

  const { current, hourly, daily } = weather;
  const currentInterpretation = getWeatherInterpretation(current.weather_code);

  const now = new Date();
  const todayHourlyForecast = hourly.time
    .map((time, index) => ({
      time: new Date(time),
      temp: hourly.temperature_2m[index],
      code: hourly.weather_code[index],
    }))
    .filter(
      (forecast) =>
        forecast.time > now && forecast.time.getDate() === now.getDate()
    );

  const dailyForecast = daily.time
    .map((time, index) => ({
      time: new Date(time),
      code: daily.weather_code[index],
      maxTemp: daily.temperature_2m_max[index],
      minTemp: daily.temperature_2m_min[index],
    }))
    .slice(1, 6);

  return (
    <div className={css.widget}>
      <button
        onClick={handleRefreshLocation}
        className={css.refreshButton}
        title="Оновити геолокацію"
      >
        <RefreshCw size={16} />
      </button>
      <h3>{locationName ? `Погода в ${locationName}` : 'Погода зараз'}</h3>

      <div className={css.weatherData}>
        <span className={css.emoji}>{currentInterpretation.emoji}</span>
        <span className={css.temp}>
          {Math.round(current.temperature_2m)}°C
        </span>
        <span className={css.desc}>{currentInterpretation.description}</span>
      </div>

      <div className={css.forecastSection}>
        <h4>Прогноз на сьогодні</h4>
        <div className={css.hourlyForecast}>
          {todayHourlyForecast.map((forecast, index) => (
            <div key={index} className={css.hourItem}>
              <span>{forecast.time.getHours()}:00</span>
              <span className={css.hourEmoji}>
                {getWeatherInterpretation(forecast.code).emoji}
              </span>
              <span>{Math.round(forecast.temp)}°C</span>
            </div>
          ))}
        </div>
      </div>

      <div className={css.forecastSection}>
        <h4>Прогноз на 5 днів</h4>
        <div className={css.dailyForecast}>
          {dailyForecast.map((forecast, index) => (
            <div key={index} className={css.dayItem}>
              <span className={css.dayName}>
                {forecast.time.toLocaleDateString('uk-UA', { weekday: 'short' })}
              </span>
              <span className={css.dayEmoji}>
                {getWeatherInterpretation(forecast.code).emoji}
              </span>
              <span className={css.dayTemp}>
                <strong>{Math.round(forecast.maxTemp)}°</strong> /{' '}
                {Math.round(forecast.minTemp)}°
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WeatherWidget;
