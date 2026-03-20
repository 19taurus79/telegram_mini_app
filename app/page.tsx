import WeatherWidget from "@/components/WeatherWidget/WeatherWidget";
import CurrencyWidget from "@/components/CurrencyWidget/CurrencyWidget";
import TaskManager from "@/components/TaskManager/TaskManager";
import css from "./page.module.css";

export default function Home() {
  return (
    <div className={css.container}>
      <TaskManager />
      <div className={css.widgetsContainer}>
        <WeatherWidget />
        <CurrencyWidget />
      </div>
    </div>
  );
}
