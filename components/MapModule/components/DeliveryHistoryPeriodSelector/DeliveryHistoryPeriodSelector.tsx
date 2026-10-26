'use client';

import React, { useState } from 'react';
import { Clock, ChevronRight } from 'lucide-react';
import { useMapControlStore } from '../../store/mapControlStore';
import { HISTORY_PERIODS, HistoryPeriodId } from '../../utils/historyPeriodUtils';
import css from './DeliveryHistoryPeriodSelector.module.css';

export default function DeliveryHistoryPeriodSelector() {
  const {
    deliveryHistoryPeriod,
    setDeliveryHistoryPeriod,
    deliveryCustomDateFrom,
    deliveryCustomDateTo,
    setDeliveryCustomDates,
    selectedStatuses,
  } = useMapControlStore();

  const [isCustomOpen, setIsCustomOpen] = useState(deliveryHistoryPeriod === 'custom');

  // Відображаємо селектор тільки якщо статус "Виконано" вибрано у фільтрі
  const isCompletedActive = Array.isArray(selectedStatuses) && selectedStatuses.some(
    s => s === 'Виконано' || s === 'completed' || s?.toLowerCase() === 'виконано'
  );

  if (!isCompletedActive) {
    return null;
  }

  const handlePeriodChange = (id: HistoryPeriodId) => {
    setDeliveryHistoryPeriod(id);
    if (id === 'custom') {
      setIsCustomOpen(true);
    } else {
      setIsCustomOpen(false);
    }
  };

  return (
    <div className={css.container}>
      <div className={css.header}>
        <div className={css.titleWrap}>
          <Clock size={13} className={css.clockIcon} />
          <span className={css.title}>Період для «Виконано»:</span>
        </div>
        <span className={css.hint}>
          {deliveryHistoryPeriod === '3days' && 'Останні 3 дні'}
          {deliveryHistoryPeriod === '7days' && 'Останні 7 днів'}
          {deliveryHistoryPeriod === '30days' && 'Останні 30 днів (місяць)'}
          {deliveryHistoryPeriod === 'season' && 'Сезон (останні 90 днів)'}
          {deliveryHistoryPeriod === 'year' && 'Рік (останні 365 днів)'}
          {deliveryHistoryPeriod === 'all' && 'За весь час'}
          {deliveryHistoryPeriod === 'custom' && 'Власний діапазон'}
        </span>
      </div>

      <div className={css.pills}>
        {HISTORY_PERIODS.map((period) => {
          const isActive = deliveryHistoryPeriod === period.id;
          return (
            <button
              key={period.id}
              type="button"
              className={`${css.pill} ${isActive ? css.pillActive : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                handlePeriodChange(period.id);
              }}
            >
              {period.label}
            </button>
          );
        })}
      </div>

      {(isCustomOpen || deliveryHistoryPeriod === 'custom') && (
        <div className={css.customRangeRow} onClick={(e) => e.stopPropagation()}>
          <div className={css.dateField}>
            <label>Від:</label>
            <input
              type="date"
              className={css.dateInput}
              value={deliveryCustomDateFrom || ''}
              onChange={(e) => setDeliveryCustomDates(e.target.value, deliveryCustomDateTo || '')}
            />
          </div>
          <ChevronRight size={14} className={css.rangeArrow} />
          <div className={css.dateField}>
            <label>До:</label>
            <input
              type="date"
              className={css.dateInput}
              value={deliveryCustomDateTo || ''}
              onChange={(e) => setDeliveryCustomDates(deliveryCustomDateFrom || '', e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
