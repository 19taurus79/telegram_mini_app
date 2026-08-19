'use client';

import React, { useState } from 'react';
import styles from './DataAuditWidget.module.css';
import { AlertTriangle, MapPinOff, Filter, CheckCircle2, ShieldAlert } from 'lucide-react';
import UnmappedClientsModal from './UnmappedClientsModal';

export type DataSourceType = 'applications' | 'deliveries' | 'combined';

export interface DataAuditMetrics {
  totalRaw: number;
  includedCount: number;
  includedWeightTons: number;
  zeroWeightCount: number;
  unmappedCount: number;
  filteredOutCount: number;
  unmappedClients: { client: string; totalWeight?: number; ordersCount?: number }[];
}

interface Props {
  dataSource: DataSourceType;
  onDataSourceChange: (src: DataSourceType) => void;
  metrics: DataAuditMetrics;
  includeZeroWeight: boolean;
  onToggleIncludeZeroWeight: (val: boolean) => void;
  fallbackWeightKg: number;
  onChangeFallbackWeightKg: (val: number) => void;
}

export default function DataAuditWidget({
  dataSource,
  onDataSourceChange,
  metrics,
  includeZeroWeight,
  onToggleIncludeZeroWeight,
  fallbackWeightKg,
  onChangeFallbackWeightKg,
}: Props) {
  const [isUnmappedModalOpen, setIsUnmappedModalOpen] = useState(false);

  return (
    <div className={styles.auditContainer}>
      {/* Data Source Selector */}
      <div className={styles.sourceSelector}>
        <button
          className={`${styles.sourceBtn} ${dataSource === 'applications' ? styles.sourceBtnActive : ''}`}
          onClick={() => onDataSourceChange('applications')}
          title="Замовлення клієнтів з 1С (Заявки)"
        >
          📦 Заявки 1С
        </button>
        <button
          className={`${styles.sourceBtn} ${dataSource === 'deliveries' ? styles.sourceBtnActive : ''}`}
          onClick={() => onDataSourceChange('deliveries')}
          title="Створені логістичні доставки"
        >
          🚚 Доставки
        </button>
        <button
          className={`${styles.sourceBtn} ${dataSource === 'combined' ? styles.sourceBtnActive : ''}`}
          onClick={() => onDataSourceChange('combined')}
          title="Об'єднати заявки та доставки"
        >
          🔄 Усі разом
        </button>
      </div>

      {/* Metrics Grid */}
      <div className={styles.statsGrid}>
        {/* Included */}
        <div className={`${styles.statCard} ${styles.statCardIncluded}`}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>В аналітиці</span>
            <CheckCircle2 size={13} color="#34d399" />
          </div>
          <div className={`${styles.statVal} ${styles.statValIncluded}`}>{metrics.includedCount} <span style={{ fontSize: 11, fontWeight: 500 }}>шт</span></div>
          <div className={styles.statSub}>{metrics.includedWeightTons.toFixed(1)} т ваги</div>
        </div>

        {/* Zero Weight */}
        <div className={`${styles.statCard} ${styles.statCardWarning}`}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Без ваги (0 кг)</span>
            <AlertTriangle size={13} color="#fbbf24" />
          </div>
          <div className={`${styles.statVal} ${styles.statValWarning}`}>{metrics.zeroWeightCount} <span style={{ fontSize: 11, fontWeight: 500 }}>шт</span></div>
          <div className={styles.statSub}>
            {includeZeroWeight ? '🟢 Враховані з авто-вагою' : '🔴 Відсічені калькулятором'}
          </div>
        </div>

        {/* Unmapped Coordinates */}
        <div className={`${styles.statCard} ${styles.statCardDanger}`}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Без координат</span>
            <MapPinOff size={13} color="#f87171" />
          </div>
          <div className={`${styles.statVal} ${styles.statValDanger}`}>{metrics.unmappedCount} <span style={{ fontSize: 11, fontWeight: 500 }}>клієнтів</span></div>
          <div className={styles.statSub}>Не мають гео-прив&apos;язки</div>
        </div>

        {/* Filtered Out */}
        <div className={`${styles.statCard} ${styles.statCardInfo}`}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Відфільтровано</span>
            <Filter size={13} color="#818cf8" />
          </div>
          <div className={styles.statVal}>{metrics.filteredOutCount} <span style={{ fontSize: 11, fontWeight: 500 }}>шт</span></div>
          <div className={styles.statSub}>За датою/менеджером</div>
        </div>
      </div>

      {/* Quick Actions & Fixes */}
      <div className={styles.fixSection}>
        {/* Toggle Fallback Weight */}
        <div className={styles.fixRow}>
          <label className={styles.fixToggleLabel}>
            <input
              type="checkbox"
              checked={includeZeroWeight}
              onChange={e => onToggleIncludeZeroWeight(e.target.checked)}
              className={styles.fixToggleInput}
            />
            <span>Авто-вага для замовлень без ваги</span>
          </label>

          {includeZeroWeight && (
            <div className={styles.weightInputGroup}>
              <input
                type="number"
                min="10"
                max="50000"
                step="50"
                value={fallbackWeightKg}
                onChange={e => onChangeFallbackWeightKg(Math.max(1, Number(e.target.value) || 100))}
                className={styles.weightInput}
              />
              <span className={styles.weightUnit}>кг</span>
            </div>
          )}
        </div>

        {/* Unmapped Modal Trigger */}
        {metrics.unmappedCount > 0 && (
          <button
            className={styles.unmappedBtn}
            onClick={() => setIsUnmappedModalOpen(true)}
          >
            <ShieldAlert size={14} />
            <span>Переглянути негеокодованих ({metrics.unmappedCount})</span>
          </button>
        )}
      </div>

      {/* Unmapped Clients Modal */}
      <UnmappedClientsModal
        isOpen={isUnmappedModalOpen}
        onClose={() => setIsUnmappedModalOpen(false)}
        unmappedClients={metrics.unmappedClients}
      />
    </div>
  );
}
