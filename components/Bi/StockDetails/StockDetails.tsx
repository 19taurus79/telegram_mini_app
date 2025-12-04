"use client";
import css from "./StockDetails.module.css";
import { BiOrdersItem } from "@/types/types";
import toast from "react-hot-toast";
import { useState, useEffect } from "react";

interface StockDetailsProps {
  selectedProduct: BiOrdersItem | null;
}

const StockDetails = ({ selectedProduct }: StockDetailsProps) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleCopy = (warehouse: string) => {
    navigator.clipboard.writeText(warehouse).then(
      () => {
        toast.success('Склад скопійовано!');
      },
      (err) => {
        toast.error('Не вдалося скопіювати склад.');
        console.error("Could not copy text: ", err);
      }
    );
  };

  return (
    <div className={css.detailsContainer}>
      <h2 className={css.title}>Вільні залишки на складах</h2>
      {selectedProduct ? (
        <>
          {isMobile ? (
            <div className={css.mobileList}>
              {selectedProduct.available_stock.map((stock) => (
                <div
                  key={`${stock.division}-${stock.warehouse}`}
                  onClick={() => handleCopy(stock.warehouse)}
                  className={css.mobileCard}
                >
                  <div className={css.cardRow}>
                    <span className={css.label}>Підрозділ:</span>
                    <span className={css.value}>{stock.division}</span>
                  </div>
                  <div className={css.cardRow}>
                    <span className={css.label}>Склад:</span>
                    <span className={css.value}>{stock.warehouse}</span>
                  </div>
                  <div className={css.cardRow}>
                    <span className={css.label}>Доступно:</span>
                    <span className={`${css.value} ${css.availableValue}`}>
                      {Number(stock.available).toFixed(2)}
                    </span>
                  </div>
                  <div className={css.copyHint}>Натисніть для копіювання</div>
                </div>
              ))}
            </div>
          ) : (
            <table className={css.table}>
              <thead>
                <tr>
                  <th className={`${css.th} ${css.divisionColumn}`}>Підрозділ</th>
                  <th className={`${css.th} ${css.divisionColumn}`}>Склад</th>
                  <th className={`${css.th} ${css.availableColumn}`}>
                    Доступно
                  </th>
                </tr>
              </thead>
              <tbody>
                {selectedProduct.available_stock.map((stock) => (
                  <tr
                    key={`${stock.division}-${stock.warehouse}`}
                    onClick={() => handleCopy(stock.warehouse)}
                    className={css.copyableRow}
                  >
                    <td className={`${css.td} ${css.divisionColumn}`} title={stock.division}>
                      {stock.division}
                    </td>
                    <td className={`${css.td} ${css.divisionColumn}`} title={stock.warehouse}>
                      {stock.warehouse}
                    </td>
                    <td className={`${css.td} ${css.availableColumn}`} title={stock.available.toString()}>
                      {Number(stock.available).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      ) : (
        <div className={css.placeholder}>
          <p>Оберіть номенклатуру для відображення деталізації</p>
        </div>
      )}
    </div>
  );
};

export default StockDetails;
