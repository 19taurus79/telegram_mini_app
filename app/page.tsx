import WeatherWidget from "@/components/WeatherWidget/WeatherWidget";
import CurrencyWidget from "@/components/CurrencyWidget/CurrencyWidget";
import css from "./page.module.css";

export default function Home() {
  return (
    <div className={css.container}>
      <h1>Головна сторінка</h1>
      <div className={css.widgetsContainer}>
        <WeatherWidget />
        <CurrencyWidget />
      </div>
    </div>
  );
}
