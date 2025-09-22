"use client";

import { useEffect, useState, useCallback } from "react";
import { ClipLoader } from "react-spinners";
import { Settings } from "lucide-react";
import css from "./CurrencyWidget.module.css";
import CurrencySelectionModal from "./CurrencySelectionModal";

interface Rate {
  rate: number;
  cc: string;
  txt: string;
}

const useCurrencySelection = () => {
    const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem("selectedCurrencies");
        if (saved) {
            setSelectedCurrencies(JSON.parse(saved));
        } else {
            setSelectedCurrencies(["USD", "EUR"]); // Default selection
        }
    }, []);

    const saveSelection = (selection: string[]) => {
        localStorage.setItem("selectedCurrencies", JSON.stringify(selection));
        setSelectedCurrencies(selection);
    };

    return [selectedCurrencies, saveSelection] as const;
};

const CurrencyWidget = () => {
  const [allRates, setAllRates] = useState<Rate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCurrencies, saveSelection] = useCurrencySelection();

  const fetchRates = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json")
      .then((response) => response.json())
      .then((data: Rate[]) => {
        setAllRates(data);
        const today = new Date().toLocaleDateString("uk-UA");
        setDate(today);
        setLoading(false);
      })
      .catch(() => {
        setError("Помилка під час запиту курсів валют.");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const displayedRates = allRates.filter(rate => selectedCurrencies.includes(rate.cc));

  return (
    <div className={css.widget}>
      <div className={css.header}>
        <h3>Курс НБУ на {date}</h3>
        <button onClick={() => setIsModalOpen(true)} className={css.settingsButton}>
          <Settings size={16} />
        </button>
      </div>
      
      {loading && <ClipLoader size={20} color={"#fff"} />}
      {error && <div className={css.error}>{error}</div>}
      
      {!loading && !error && (
        <div className={css.ratesContainer}>
            {displayedRates.map(rate => (
                <div className={css.rateItem} key={rate.cc}>
                    <span className={css.currency}>{rate.cc}</span>
                    <span className={css.value}>{rate.rate.toFixed(2)}</span>
                </div>
            ))}
        </div>
      )}

      {isModalOpen && (
        <CurrencySelectionModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            allCurrencies={allRates}
            selectedCurrencies={selectedCurrencies}
            onSave={(selection) => {
                saveSelection(selection);
                setIsModalOpen(false);
            }}
        />
      )}
    </div>
  );
};

export default CurrencyWidget;
