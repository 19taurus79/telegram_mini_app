'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Responsive, WidthProvider, Layouts } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import styles from './AnalyticsDashboard.module.css';
import dynamic from 'next/dynamic';
import ManagerFilter from '../ManagerFilter/ManagerFilter';
import LineOfBusinessFilter from '../LineOfBusinessFilter/LineOfBusinessFilter';
import AnalyticsDetailsWidget from './AnalyticsDetailsWidget';
import DataAuditWidget, { DataSourceType, DataAuditMetrics } from './DataAuditWidget';
import { ClusterData, calculateLogisticsCosts, CostSimulationResult, calculateDistanceKm } from '../AnalyticsMap/HubCalculator';
import { useAnalyticsStore } from '../../store/analyticsStore';
import { useApplicationsStore } from '../../store/applicationsStore';
import { useQuery } from '@tanstack/react-query';
import { fetchOrdersHeatmapData } from '../../fetchOrdersWithAddresses';
import { getDeliveries } from '@/lib/api';
import { getInitData } from '@/lib/getInitData';
import AnalyticsExport from './AnalyticsExport';
import AnalyticsGuideModal from './AnalyticsGuideModal';
import Portal from '@/components/Portal';
import { warehouses } from '../../warehouses';

const ResponsiveGridLayout = WidthProvider(Responsive);

const AnalyticsMap = dynamic(() => import('../AnalyticsMap/AnalyticsMap'), {
  ssr: false,
  loading: () => <div className={styles.loadingMap}>Завантаження карти...</div>,
});

const STORAGE_KEY = 'analytics-bento-layout-v3';

const defaultLayouts: Layouts = {
  lg: [
    { i: 'kpis',    x: 0,  y: 0,  w: 12, h: 2,  minH: 2,  maxH: 3,  minW: 6 },
    { i: 'map',     x: 0,  y: 2,  w: 8,  h: 18, minH: 6,  minW: 4 },
    { i: 'origin',  x: 8,  y: 2,  w: 4,  h: 5,  minH: 3,  minW: 2 },
    { i: 'audit',   x: 8,  y: 7,  w: 4,  h: 6,  minH: 4,  minW: 2 },
    { i: 'filters', x: 8,  y: 13, w: 4,  h: 5,  minH: 3,  minW: 2 },
    { i: 'tariffs', x: 8,  y: 18, w: 4,  h: 5,  minH: 4,  minW: 2 },
    { i: 'results', x: 8,  y: 23, w: 4,  h: 6,  minH: 4,  minW: 2 },
    { i: 'details', x: 0,  y: 20, w: 8,  h: 9,  minH: 4,  minW: 4 },
  ],
  md: [
    { i: 'kpis',    x: 0,  y: 0,  w: 10, h: 2,  minH: 2,  minW: 4 },
    { i: 'map',     x: 0,  y: 2,  w: 6,  h: 16, minH: 6,  minW: 4 },
    { i: 'origin',  x: 6,  y: 2,  w: 4,  h: 5,  minH: 3,  minW: 2 },
    { i: 'audit',   x: 6,  y: 7,  w: 4,  h: 6,  minH: 4,  minW: 2 },
    { i: 'filters', x: 6,  y: 13, w: 4,  h: 5,  minH: 3,  minW: 2 },
    { i: 'tariffs', x: 6,  y: 18, w: 4,  h: 5,  minH: 4,  minW: 2 },
    { i: 'results', x: 6,  y: 23, w: 4,  h: 6,  minH: 4,  minW: 2 },
    { i: 'details', x: 0,  y: 18, w: 6,  h: 9,  minH: 4,  minW: 4 },
  ],
  sm: [
    { i: 'kpis',    x: 0,  y: 0,  w: 6,  h: 3,  minH: 2,  minW: 6 },
    { i: 'map',     x: 0,  y: 3,  w: 6,  h: 14, minH: 6,  minW: 6 },
    { i: 'origin',  x: 0,  y: 17, w: 6,  h: 5,  minH: 3,  minW: 6 },
    { i: 'audit',   x: 0,  y: 22, w: 6,  h: 6,  minH: 4,  minW: 6 },
    { i: 'filters', x: 0,  y: 28, w: 6,  h: 5,  minH: 3,  minW: 6 },
    { i: 'tariffs', x: 0,  y: 33, w: 6,  h: 5,  minH: 4,  minW: 6 },
    { i: 'results', x: 0,  y: 38, w: 6,  h: 6,  minH: 4,  minW: 6 },
    { i: 'details', x: 0,  y: 44, w: 6,  h: 9,  minH: 4,  minW: 6 },
  ]
};

function loadLayouts(): Layouts {
  if (typeof window === 'undefined') return defaultLayouts;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : defaultLayouts;
  } catch {
    return defaultLayouts;
  }
}

export default function AnalyticsDashboard() {
  const [layouts, setLayouts] = useState<Layouts>(defaultLayouts);
  const [isClient, setIsClient] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  
  const [selectedOriginId, setSelectedOriginId] = useState<string>('wh-1');
  const [customOriginLocation, setCustomOriginLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isPickingLocation, setIsPickingLocation] = useState<boolean>(false);

  const [dataSource, setDataSource] = useState<DataSourceType>('applications');
  const [includeZeroWeight, setIncludeZeroWeight] = useState<boolean>(true);
  const [fallbackWeightKg, setFallbackWeightKg] = useState<number>(100);
  const [auditMetrics, setAuditMetrics] = useState<DataAuditMetrics>({
    totalRaw: 0,
    includedCount: 0,
    includedWeightTons: 0,
    zeroWeightCount: 0,
    unmappedCount: 0,
    filteredOutCount: 0,
    unmappedClients: []
  });

  const setSelectedCluster = useAnalyticsStore(state => state.setSelectedCluster);
  const [clusters, setClusters] = useState<ClusterData[]>([]);
  const [globalCog, setGlobalCog] = useState<{ lat: number; lng: number } | null>(null);

  const { applications, setApplications, setUnmappedApplications, deliveries, setDeliveries } = useApplicationsStore();

  const { data: applicationsData } = useQuery({
    queryKey: ['applications'],
    queryFn: async () => {
      return await fetchOrdersHeatmapData();
    },
    enabled: (!applications || applications.length === 0),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (applicationsData) {
      setApplications(applicationsData.mergedData);
      setUnmappedApplications(applicationsData.unmappedData);
    }
  }, [applicationsData, setApplications, setUnmappedApplications]);

  const { data: deliveriesData } = useQuery({
    queryKey: ['deliveries'],
    queryFn: async () => {
      const initData = getInitData();
      return await getDeliveries(initData);
    },
    enabled: (!deliveries || deliveries.length === 0),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (deliveriesData && Array.isArray(deliveriesData)) {
      setDeliveries(deliveriesData);
    }
  }, [deliveriesData, setDeliveries]);

  useEffect(() => {
    setIsClient(true);
    setLayouts(loadLayouts());
  }, []);

  const [tariffs, setTariffs] = useState({ direct: 12, linehaul: 5, lastMile: 18 });
  const [costResult, setCostResult] = useState<CostSimulationResult | null>(null);

  const handleMapMetricsUpdate = useCallback((calculatedClusters: ClusterData[], cog: { lat: number; lng: number } | null) => {
    setClusters(calculatedClusters);
    setGlobalCog(cog);
  }, []);

  const handleAuditMetricsUpdate = useCallback((metrics: DataAuditMetrics) => {
    setAuditMetrics(metrics);
  }, []);

  const activeOriginCoords = useMemo(() => {
    if (selectedOriginId === 'cog' && globalCog) {
      return globalCog;
    }
    if (selectedOriginId === 'custom' && customOriginLocation) {
      return customOriginLocation;
    }
    const wh = warehouses.find(w => `wh-${w.id}` === selectedOriginId);
    if (wh) {
      return { lat: wh.lat, lng: wh.lng };
    }
    return warehouses[0] ? { lat: warehouses[0].lat, lng: warehouses[0].lng } : globalCog;
  }, [selectedOriginId, globalCog, customOriginLocation]);

  useEffect(() => {
    const effFallback = includeZeroWeight ? fallbackWeightKg : 0;
    const result = calculateLogisticsCosts(activeOriginCoords, globalCog, clusters, tariffs, effFallback);
    setCostResult(result);
  }, [activeOriginCoords, globalCog, clusters, tariffs, includeZeroWeight, fallbackWeightKg]);

  const handleLayoutChange = useCallback((_: unknown, allLayouts: Layouts) => {
    setLayouts(allLayouts);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allLayouts));
  }, []);

  const handleResetLayout = () => {
    setLayouts(defaultLayouts);
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleCustomLocationPick = (loc: { lat: number; lng: number }) => {
    setCustomOriginLocation(loc);
    setSelectedOriginId('custom');
    setIsPickingLocation(false);
  };

  const totalDeliveries = clusters.reduce((acc, c) => acc + c.deliveries.length, 0);
  const totalWeightTons = clusters.reduce((acc, c) => acc + c.totalWeight, 0) / 1000;

  // Active origin description & distance to CoG
  const originInfo = useMemo(() => {
    let name = 'Склад Коротич';
    if (selectedOriginId === 'wh-2') name = 'Склад Балаклія';
    else if (selectedOriginId === 'cog') name = 'Оптимальний РЦ (Center of Gravity)';
    else if (selectedOriginId === 'custom') name = 'Власна точка на карті';

    let distToCog = 0;
    if (activeOriginCoords && globalCog) {
      distToCog = calculateDistanceKm(activeOriginCoords, globalCog);
    }
    return { name, distToCog };
  }, [selectedOriginId, activeOriginCoords, globalCog]);

  if (!isClient) return null;

  return (
    <div className={styles.analyticsContainer}>
      
      {/* ─── Toolbar ─── */}
      <div className={styles.layoutToolbar}>
        <span className={styles.layoutHint}>⠿ Перетягуйте та змінюйте розмір карток</span>
        <div className={styles.toolbarActions}>
          <button className={styles.helpBtn} onClick={() => setIsGuideOpen(true)}>
            📖 Довідка
          </button>
          <button className={styles.resetBtn} onClick={handleResetLayout}>
            ↺ Скинути
          </button>
        </div>
      </div>

      <ResponsiveGridLayout
        className={styles.bentoGrid}
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768 }}
        cols={{ lg: 12, md: 10, sm: 6 }}
        rowHeight={40}
        margin={[12, 12]}
        draggableHandle={`.${styles.dragHandle}`}
        isResizable={true}
        isDraggable={true}
        onLayoutChange={handleLayoutChange}
        resizeHandles={['se', 's', 'e']}
      >

        {/* ─── 1. KPI Metrics ─── */}
        <div key="kpis">
          <div className={styles.bentoCard}>
            <div className={styles.dragHandle}>⠿</div>
            <div className={styles.kpiRow}>
              <div className={styles.kpiItem}>
                <span className={styles.kpiLabel}>📦 Доставок</span>
                <span className={styles.kpiValue}>{totalDeliveries > 0 ? `${totalDeliveries} шт` : '—'}</span>
              </div>
              <div className={styles.kpiDivider} />
              <div className={styles.kpiItem}>
                <span className={styles.kpiLabel}>⚖️ Загальна вага</span>
                <span className={styles.kpiValue}>{totalWeightTons > 0 ? `${totalWeightTons.toFixed(1)} т` : '—'}</span>
              </div>
              <div className={styles.kpiDivider} />
              <div className={styles.kpiItem}>
                <span className={styles.kpiLabel}>🔵 Кластерів</span>
                <span className={styles.kpiValue}>{clusters.length > 0 ? clusters.length : '—'}</span>
              </div>
              <div className={styles.kpiDivider} />
              <div className={`${styles.kpiItem} ${costResult && costResult.savings > 0 ? styles.kpiAccent : ''}`}>
                <span className={styles.kpiLabel}>💰 Економія від Хабів</span>
                <span className={styles.kpiValue}>
                  {costResult ? `+${Math.round(costResult.savings).toLocaleString()} ₴` : '—'}
                </span>
              </div>
              <div className={styles.kpiDivider} />
              <div className={styles.kpiItem} style={{ flex: 2 }}>
                <span className={styles.kpiLabel}>📅 Період</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="date" value={dateRange.start} className={styles.dateInput}
                    onChange={e => setDateRange(p => ({...p, start: e.target.value}))} />
                  <span style={{ color: '#475569' }}>—</span>
                  <input type="date" value={dateRange.end} className={styles.dateInput}
                    onChange={e => setDateRange(p => ({...p, end: e.target.value}))} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── 2. Origin Warehouse Selector ─── */}
        <div key="origin">
          <div className={styles.bentoCard}>
            <div className={styles.cardHeader}>
              <span className={styles.dragHandle}>⠿</span>
              <h3 className={styles.cardTitle}>Точка відвантаження (Склад)</h3>
            </div>
            <div className={styles.cardContent}>
              <div className={styles.originChipsGrid}>
                {warehouses.map(wh => (
                  <button
                    key={`opt-wh-${wh.id}`}
                    className={`${styles.originChip} ${selectedOriginId === `wh-${wh.id}` ? styles.originChipActive : ''}`}
                    onClick={() => {
                      setSelectedOriginId(`wh-${wh.id}`);
                      setIsPickingLocation(false);
                    }}
                  >
                    <span>🏭 {wh.name}</span>
                    <span className={styles.originBadge}>Фактичний</span>
                  </button>
                ))}

                <button
                  className={`${styles.originChip} ${selectedOriginId === 'custom' ? styles.originChipActive : ''}`}
                  onClick={() => {
                    setSelectedOriginId('custom');
                    if (!customOriginLocation) {
                      setIsPickingLocation(true);
                    }
                  }}
                >
                  <span>📍 Власна точка на карті</span>
                  <span className={styles.originBadge}>
                    {customOriginLocation ? 'Задано' : 'Не вказано'}
                  </span>
                </button>

                <button
                  className={`${styles.originChip} ${selectedOriginId === 'cog' ? styles.originChipActive : ''}`}
                  onClick={() => {
                    setSelectedOriginId('cog');
                    setIsPickingLocation(false);
                  }}
                >
                  <span>🌟 Оптимальний РЦ (CoG)</span>
                  <span className={styles.originBadge} style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>
                    Теор. мінімум
                  </span>
                </button>
              </div>

              {/* Action button to pick on map */}
              <button
                className={`${styles.pickMapBtn} ${isPickingLocation ? styles.pickMapBtnActive : ''}`}
                onClick={() => setIsPickingLocation(prev => !prev)}
              >
                {isPickingLocation ? '✕ Скасувати вибір на карті' : '🎯 Клікніть на карті для нової точки'}
              </button>

              {/* Distance info */}
              {originInfo.distToCog > 0 && selectedOriginId !== 'cog' && (
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', textAlign: 'center' }}>
                  Відстань до ідеального Центру Тяжіння: <strong>{originInfo.distToCog.toFixed(1)} км</strong>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── 3. Interactive Map ─── */}
        <div key="map">
          <div className={`${styles.bentoCard} ${styles.mapBentoCard}`}>
            <div className={styles.cardHeader}>
              <span className={styles.dragHandle}>⠿</span>
              <h3 className={styles.cardTitle}>Карта доставок та хабів</h3>
              <span className={styles.cardSubtitle}>
                Активна база: <strong style={{ color: '#38bdf8' }}>{originInfo.name}</strong>
              </span>
            </div>
            <div className={styles.mapWrapper}>
              <AnalyticsMap
                dateRange={dateRange}
                onClusterClick={(cluster) => setSelectedCluster(cluster)}
                onMapMetricsUpdate={handleMapMetricsUpdate}
                onAuditMetricsUpdate={handleAuditMetricsUpdate}
                selectedOriginId={selectedOriginId}
                onSelectOriginId={(id) => {
                  setSelectedOriginId(id);
                  setIsPickingLocation(false);
                }}
                customOriginLocation={customOriginLocation}
                onCustomOriginChange={handleCustomLocationPick}
                isPickingLocation={isPickingLocation}
                dataSource={dataSource}
                includeZeroWeight={includeZeroWeight}
                fallbackWeightKg={fallbackWeightKg}
              />
            </div>
          </div>
        </div>

        {/* ─── 4. Data Quality & Audit Widget ─── */}
        <div key="audit">
          <div className={styles.bentoCard}>
            <div className={styles.cardHeader}>
              <span className={styles.dragHandle}>⠿</span>
              <h3 className={styles.cardTitle}>Аудит Даних та Авто-вага</h3>
            </div>
            <div className={styles.cardContent}>
              <DataAuditWidget
                dataSource={dataSource}
                onDataSourceChange={setDataSource}
                metrics={auditMetrics}
                includeZeroWeight={includeZeroWeight}
                onToggleIncludeZeroWeight={setIncludeZeroWeight}
                fallbackWeightKg={fallbackWeightKg}
                onChangeFallbackWeightKg={setFallbackWeightKg}
              />
            </div>
          </div>
        </div>

        {/* ─── 5. Filters & Export ─── */}
        <div key="filters">
          <div className={styles.bentoCard}>
            <div className={styles.cardHeader}>
              <span className={styles.dragHandle}>⠿</span>
              <h3 className={styles.cardTitle}>Фільтри та Експорт</h3>
            </div>
            <div className={styles.cardContent}>
              <ManagerFilter />
              <LineOfBusinessFilter />
              <AnalyticsExport clusters={clusters} dateRange={dateRange} />
            </div>
          </div>
        </div>

        {/* ─── 5. Tariff Simulator ─── */}
        <div key="tariffs">
          <div className={styles.bentoCard}>
            <div className={styles.cardHeader}>
              <span className={styles.dragHandle}>⠿</span>
              <h3 className={styles.cardTitle}>Калькулятор Тарифів</h3>
            </div>
            <div className={styles.cardContent}>
              <div className={styles.tariffGroup}>
                <label>Пряма доставка (₴/т·км)</label>
                <input type="number" className={styles.tariffInput} value={tariffs.direct}
                  onChange={e => setTariffs({...tariffs, direct: Number(e.target.value)})} />
              </div>
              <div className={styles.tariffGroup}>
                <label>Магістраль / Хаб (₴/т·км)</label>
                <input type="number" className={styles.tariffInput} value={tariffs.linehaul}
                  onChange={e => setTariffs({...tariffs, linehaul: Number(e.target.value)})} />
              </div>
              <div className={styles.tariffGroup}>
                <label>Остання миля (₴/т·км)</label>
                <input type="number" className={styles.tariffInput} value={tariffs.lastMile}
                  onChange={e => setTariffs({...tariffs, lastMile: Number(e.target.value)})} />
              </div>
            </div>
          </div>
        </div>

        {/* ─── 6. Multi-Model Results ─── */}
        <div key="results">
          <div className={styles.bentoCard}>
            <div className={styles.cardHeader}>
              <span className={styles.dragHandle}>⠿</span>
              <h3 className={styles.cardTitle}>Результати Моделювання</h3>
            </div>
            <div className={styles.cardContent}>
              {costResult ? (
                <div className={styles.resultsGrid}>
                  <div className={styles.resultBox}>
                    <div className={styles.resultLabel}>1. Пряма від складу</div>
                    <div className={styles.resultValue}>{Math.round(costResult.directCost).toLocaleString()} ₴</div>
                  </div>
                  <div className={styles.resultBox}>
                    <div className={styles.resultLabel}>2. Хабова модель</div>
                    <div className={styles.resultValue}>{Math.round(costResult.hubModelCost).toLocaleString()} ₴</div>
                  </div>
                  <div className={styles.resultBox} style={{ gridColumn: 'span 2' }}>
                    <div className={styles.resultLabel}>3. Пряма від Оптимального РЦ (якщо перенести)</div>
                    <div className={styles.resultValue} style={{ color: '#34d399' }}>
                      {Math.round(costResult.optimalDirectCost).toLocaleString()} ₴
                    </div>
                  </div>
                  
                  {/* Savings from Hubs */}
                  <div className={`${styles.resultBox} ${costResult.savings >= 0 ? styles.highlight : styles.warning}`}>
                    <div className={styles.resultLabel}>Економія від Хабів</div>
                    <div className={styles.resultValue}>
                      {costResult.savings >= 0 ? '+' : ''}{Math.round(costResult.savings).toLocaleString()} ₴
                    </div>
                  </div>

                  {/* Savings from Relocation */}
                  <div className={`${styles.resultBox} ${costResult.relocationSavings >= 0 ? styles.highlight : styles.warning}`}>
                    <div className={styles.resultLabel}>Економія від переносу РЦ</div>
                    <div className={styles.resultValue}>
                      {costResult.relocationSavings >= 0 ? '+' : ''}{Math.round(costResult.relocationSavings).toLocaleString()} ₴
                    </div>
                  </div>
                </div>
              ) : (
                <div className={styles.emptyState}>Дані відсутні. Завантажте карту.</div>
              )}
            </div>
          </div>
        </div>

        {/* ─── 7. Zone Details ─── */}
        <div key="details">
          <div className={`${styles.bentoCard} ${styles.detailsBentoCard}`}>
            <div className={styles.cardHeader}>
              <span className={styles.dragHandle}>⠿</span>
              <h3 className={styles.cardTitle}>Деталізація Зони</h3>
            </div>
            <div className={styles.detailsWrapper}>
              <AnalyticsDetailsWidget />
            </div>
          </div>
        </div>

      </ResponsiveGridLayout>

      <Portal>
        <AnalyticsGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
      </Portal>
    </div>
  );
}
