"use client";

import { useEffect, useState } from "react";
import { ClipLoader } from "react-spinners";
import css from "./WeatherWidget.module.css";

// Helper function to interpret weather codes from Open-Meteo
const getWeatherInterpretation = (code: number) => {
  const interpretations: { [key: number]: { description: string; emoji: string } } = {
    0: { description: "Ясно", emoji: "☀️" },
    1: { description: "В основном ясно", emoji: "🌤️" },
    2: { description: "Переменная облачность", emoji: "⛅" },
    3: { description: "Пасмурно", emoji: "☁️" },
    45: { description: "Туман", emoji: "🌫️" },
    48: { description: "Изморозь", emoji: "🥶" },
    51: { description: "Легкая морось", emoji: "🌦️" },
    53: { description: "Умеренная морось", emoji: "🌦️" },
    55: { description: "Сильная морось", emoji: "🌧️" },
    61: { description: "Небольшой дождь", emoji: "🌧️" },
    63: { description: "Умеренный дождь", emoji: "🌧️" },
    65: { description: "Сильный дождь", emoji: "⛈️" },
    80: { description: "Небольшие ливни", emoji: "🌦️" },
    81: { description: "Умеренные ливни", emoji: "🌧️" },
    82: { description: "Сильные ливни", emoji: "⛈️" },
    95: { description: "Гроза", emoji: "⚡" },
  };
  return interpretations[code] || { description: "Нет данных", emoji: "🤷" };
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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Геолокация не поддерживается вашим браузером.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`
        )
          .then((response) => response.json())
          .then((data) => {
            if (data.current && data.hourly && data.daily) {
              setWeather(data);
            } else {
              setError("Не удалось получить данные о погоде.");
            }
            setLoading(false);
          })
          .catch(() => {
            setError("Ошибка при запросе погоды.");
            setLoading(false);
          });
      },
      (err) => {
        setError(`Ошибка получения геолокации: ${err.message}`);
        setLoading(false);
      }
    );
  }, []);

  if (loading) {
    return (
      <div className={css.widget}>
        <p>Загрузка погоды...</p>
        <ClipLoader size={20} color={"#fff"} />
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
  const todayHourlyForecast = hourly.time.map((time, index) => ({
      time: new Date(time),
      temp: hourly.temperature_2m[index],
      code: hourly.weather_code[index]
  })).filter(forecast => forecast.time > now && forecast.time.getDate() === now.getDate());

  const dailyForecast = daily.time.map((time, index) => ({
      time: new Date(time),
      code: daily.weather_code[index],
      maxTemp: daily.temperature_2m_max[index],
      minTemp: daily.temperature_2m_min[index]
  })).slice(1, 6); // Skip today, take next 5 days

  return (
    <div className={css.widget}>
      <h3>Погода сейчас</h3>
      <div className={css.weatherData}>
        <span className={css.emoji}>{currentInterpretation.emoji}</span>
        <span className={css.temp}>{Math.round(current.temperature_2m)}°C</span>
        <span className={css.desc}>{currentInterpretation.description}</span>
      </div>

      <div className={css.forecastSection}>
        <h4>Прогноз на сегодня</h4>
        <div className={css.hourlyForecast}>
            {todayHourlyForecast.map((forecast, index) => (
                <div key={index} className={css.hourItem}>
                    <span>{forecast.time.getHours()}:00</span>
                    <span className={css.hourEmoji}>{getWeatherInterpretation(forecast.code).emoji}</span>
                    <span>{Math.round(forecast.temp)}°C</span>
                </div>
            ))}
        </div>
      </div>

      <div className={css.forecastSection}>
        <h4>Прогноз на 5 дней</h4>
        <div className={css.dailyForecast}>
            {dailyForecast.map((forecast, index) => (
                <div key={index} className={css.dayItem}>
                    <span className={css.dayName}>{forecast.time.toLocaleDateString('ru-RU', { weekday: 'short' })}</span>
                    <span className={css.dayEmoji}>{getWeatherInterpretation(forecast.code).emoji}</span>
                    <span className={css.dayTemp}>
                        <strong>{Math.round(forecast.maxTemp)}°</strong> / {Math.round(forecast.minTemp)}°
                    </span>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default WeatherWidget;
