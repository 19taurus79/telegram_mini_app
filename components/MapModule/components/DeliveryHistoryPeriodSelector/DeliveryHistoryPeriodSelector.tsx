'use client';

import React, { useState } from 'react';
import { Archive, ChevronRight } from 'lucide-react';
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
    setSelectedStatuses,
  } = useMapControlStore();

  const [isCustomOpen, setIsCustomOpen] = useState(deliveryHistoryPeriod === 'custom');

  // Перевіряємо, чи увімкнений статус "Виконано" зараз
  const isCompletedActive = Array.isArray(selectedStatuses) && selectedStatuses.some(
    s => s === 'Виконано' || s === 'completed' || s?.toLowerCase() === 'виконано'
  );

  const handlePeriodChange = (id: HistoryPeriodId) => {
    setDeliveryHistoryPeriod(id);
    if (id === 'custom') {
      setIsCustomOpen(true);
    } else {
      setIsCustomOpen(false);
    }

    // Автоматично активуємо статус "Виконано" при натисканні будь-якого періоду
    if (!isCompletedActive) {
      setSelectedStatuses((prev: string[]) => {
        const set = new Set(prev || []);
        set.add('Виконано');
        return Array.from(set);
      });
    }
  };

  const handleToggleOff = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedStatuses((prev: string[]) => {
      const arr = Array.isArray(prev) ? prev : [];
      return arr.filter(s => s !== 'Виконано' && s !== 'completed' && s?.toLowerCase() !== 'виконано');
    });
  };

  return (
    <div className={`${css.container} ${isCompletedActive ? css.containerActive : ''}`}>
      <div className={css.header}>
        <div className={css.titleWrap}>
          <Archive size={14} className={css.archiveIcon} />
          <span className={css.title}>Архів виконаних:</span>
          {isCompletedActive ? (
            <span className={css.activeBadge}>🟢 Увімкнено</span>
          ) : (
            <span className={css.inactiveBadge}>⚪ Вимкнено</span>
          )}
        </div>
        <div className={css.rightControls}>
          <span className={css.hint}>
            {isCompletedActive ? (
              <>
                {deliveryHistoryPeriod === '3days' && 'Останні 3 дні'}
                {deliveryHistoryPeriod === '7days' && 'Останні 7 днів'}
                {deliveryHistoryPeriod === '30days' && 'Останні 30 днів'}
                {deliveryHistoryPeriod === 'season' && 'Сезон (90 днів)'}
                {deliveryHistoryPeriod === 'year' && 'Рік (365 днів)'}
                {deliveryHistoryPeriod === 'all' && 'За весь час'}
                {deliveryHistoryPeriod === 'custom' && 'Власний діапазон'}
              </>
            ) : (
              'Оберіть період для показу'
            )}
          </span>
          {isCompletedActive && (
            <button
              type="button"
              className={css.turnOffBtn}
              onClick={handleToggleOff}
              title="Сховати виконані доставки"
            >
              ✕ Сховати
            </button>
          )}
        </div>
      </div>

      <div className={css.pills}>
        {HISTORY_PERIODS.map((period) => {
          const isSelected = deliveryHistoryPeriod === period.id;
          const isPillActive = isCompletedActive && isSelected;
          return (
            <button
              key={period.id}
              type="button"
              className={`${css.pill} ${isPillActive ? css.pillActive : isSelected ? css.pillSelected : ''}`}
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

      {(isCustomOpen || (isCompletedActive && deliveryHistoryPeriod === 'custom')) && (
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
