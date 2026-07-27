import WeatherWidget from "@/components/WeatherWidget/WeatherWidget";
import CurrencyWidget from "@/components/CurrencyWidget/CurrencyWidget";
import TaskManager from "@/components/TaskManager/TaskManager";
import AddressFixWidget from "@/components/AddressFixWidget/AddressFixWidget";
import css from "./page.module.css";

export default function Home() {
  return (
    <div className={css.container}>
      <AddressFixWidget />
      <TaskManager />
      <div className={css.widgetsContainer}>
        <WeatherWidget />
        <CurrencyWidget />
      </div>
    </div>
  );
}
