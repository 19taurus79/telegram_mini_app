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
import { ClusterData, calculateLogisticsCosts, calculateLogisticsCostsAsync, CostSimulationResult, calculateDistanceKm, calculateCenterOfGravity } from '../AnalyticsMap/HubCalculator';
import { CandidateWarehouse, SavedZone } from '../AnalyticsMap/AnalyticsMap';
import * as XLSX from 'xlsx';
import { polygon } from '@turf/helpers';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { useAnalyticsStore } from '../../store/analyticsStore';
import { useApplicationsStore } from '../../store/applicationsStore';
import { useQuery } from '@tanstack/react-query';
import { fetchOrdersHeatmapData } from '../../fetchOrdersWithAddresses';
import { getDeliveries } from '@/lib/api';
import { getInitData } from '@/lib/getInitData';
import { fetchClientsList } from '../../services/fetchFormData';
import { ClientAddress } from '@/types/types';
import AnalyticsExport from './AnalyticsExport';
import AnalyticsGuideModal from './AnalyticsGuideModal';
import Portal from '@/components/Portal';
import { warehouses } from '../../warehouses';

function formatCatalogAddress(c?: ClientAddress | null): string {
  if (!c) return '—';
  const parts: string[] = [];
  if (c.region) parts.push(`${c.region} обл.`);
  if (c.area) parts.push(`${c.area} р-н`);
  if (c.commune) parts.push(`${c.commune} громада`);
  if (c.city) parts.push(c.city);
  return parts.length > 0 ? parts.join(', ') : '—';
}

const ResponsiveGridLayout = WidthProvider(Responsive);

const AnalyticsMap = dynamic(() => import('../AnalyticsMap/AnalyticsMap'), {
  ssr: false,
  loading: () => <div className={styles.loadingMap}>Завантаження карти...</div>,
});

const STORAGE_KEY = 'analytics-bento-layout-v4';
const SETTINGS_KEY = 'analytics-settings-v1';

const defaultLayouts: Layouts = {
  lg: [
    { i: 'kpis',        x: 0,  y: 0,  w: 12, h: 2,  minH: 2,  maxH: 3,  minW: 6 },
    { i: 'map',         x: 0,  y: 2,  w: 8,  h: 18, minH: 6,  minW: 4 },
    { i: 'origin',      x: 8,  y: 2,  w: 4,  h: 4,  minH: 3,  minW: 2 },
    { i: 'hubs',        x: 8,  y: 6,  w: 4,  h: 3,  minH: 2,  minW: 2 },
    { i: 'candidates',  x: 8,  y: 9,  w: 4,  h: 4,  minH: 3,  minW: 2 },
    { i: 'territories', x: 8,  y: 13, w: 4,  h: 5,  minH: 3,  minW: 2 },
    { i: 'algorithm',   x: 8,  y: 18, w: 4,  h: 4,  minH: 3,  minW: 2 },
    { i: 'layers',      x: 8,  y: 22, w: 4,  h: 3,  minH: 2,  minW: 2 },
    { i: 'audit',       x: 8,  y: 25, w: 4,  h: 6,  minH: 4,  minW: 2 },
    { i: 'filters',     x: 8,  y: 31, w: 4,  h: 4,  minH: 3,  minW: 2 },
    { i: 'tariffs',     x: 8,  y: 35, w: 4,  h: 4,  minH: 3,  minW: 2 },
    { i: 'results',     x: 8,  y: 39, w: 4,  h: 6,  minH: 4,  minW: 2 },
    { i: 'details',     x: 0,  y: 20, w: 8,  h: 9,  minH: 4,  minW: 4 },
  ],
  md: [
    { i: 'kpis',        x: 0,  y: 0,  w: 10, h: 2,  minH: 2,  minW: 4 },
    { i: 'map',         x: 0,  y: 2,  w: 6,  h: 16, minH: 6,  minW: 4 },
    { i: 'origin',      x: 6,  y: 2,  w: 4,  h: 4,  minH: 3,  minW: 2 },
    { i: 'hubs',        x: 6,  y: 6,  w: 4,  h: 3,  minH: 2,  minW: 2 },
    { i: 'candidates',  x: 6,  y: 9,  w: 4,  h: 4,  minH: 3,  minW: 2 },
    { i: 'territories', x: 6,  y: 13, w: 4,  h: 5,  minH: 3,  minW: 2 },
    { i: 'algorithm',   x: 6,  y: 18, w: 4,  h: 4,  minH: 3,  minW: 2 },
    { i: 'layers',      x: 6,  y: 22, w: 4,  h: 3,  minH: 2,  minW: 2 },
    { i: 'audit',       x: 6,  y: 25, w: 4,  h: 6,  minH: 4,  minW: 2 },
    { i: 'filters',     x: 6,  y: 31, w: 4,  h: 4,  minH: 3,  minW: 2 },
    { i: 'tariffs',     x: 6,  y: 35, w: 4,  h: 4,  minH: 3,  minW: 2 },
    { i: 'results',     x: 6,  y: 39, w: 4,  h: 6,  minH: 4,  minW: 2 },
    { i: 'details',     x: 0,  y: 18, w: 6,  h: 9,  minH: 4,  minW: 4 },
  ],
  sm: [
    { i: 'kpis',        x: 0,  y: 0,  w: 6,  h: 3,  minH: 2,  minW: 6 },
    { i: 'map',         x: 0,  y: 3,  w: 6,  h: 14, minH: 6,  minW: 6 },
    { i: 'origin',      x: 0,  y: 17, w: 6,  h: 4,  minH: 3,  minW: 6 },
    { i: 'hubs',        x: 0,  y: 21, w: 6,  h: 3,  minH: 2,  minW: 6 },
    { i: 'candidates',  x: 0,  y: 24, w: 6,  h: 4,  minH: 3,  minW: 6 },
    { i: 'territories', x: 0,  y: 28, w: 6,  h: 5,  minH: 3,  minW: 6 },
    { i: 'algorithm',   x: 0,  y: 33, w: 6,  h: 4,  minH: 3,  minW: 6 },
    { i: 'layers',      x: 0,  y: 37, w: 6,  h: 3,  minH: 2,  minW: 6 },
    { i: 'audit',       x: 0,  y: 40, w: 6,  h: 6,  minH: 4,  minW: 6 },
    { i: 'filters',     x: 0,  y: 46, w: 6,  h: 4,  minH: 3,  minW: 6 },
    { i: 'tariffs',     x: 0,  y: 50, w: 6,  h: 4,  minH: 3,  minW: 6 },
    { i: 'results',     x: 0,  y: 54, w: 6,  h: 6,  minH: 4,  minW: 6 },
    { i: 'details',     x: 0,  y: 60, w: 6,  h: 9,  minH: 4,  minW: 6 },
  ]
};

// ─── Date Presets ─────────────────────────────────────────────────────────────
const DATE_PRESETS = [
  {
    label: 'Цей місяць',
    get: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
    },
  },
  {
    label: 'Минулий місяць',
    get: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
    },
  },
  {
    label: 'Квартал',
    get: () => {
      const now = new Date();
      const q = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), q * 3, 1);
      const end = new Date(now.getFullYear(), q * 3 + 3, 0);
      return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
    },
  },
  {
    label: 'Рік',
    get: () => {
      const y = new Date().getFullYear();
      return { start: `${y}-01-01`, end: `${y}-12-31` };
    },
  },
  {
    label: 'Скинути',
    get: () => ({ start: '', end: '' }),
  },
];

// ─── Settings persistence ──────────────────────────────────────────────────────
interface SavedSettings {
  tariffs: { direct: number; linehaul: number; lastMile: number };
  dataSource: DataSourceType;
  hubCount: number;
  includeZeroWeight: boolean;
  fallbackWeightKg: number;
  selectedOriginId: string;
  autoFilterOutliers: boolean;
  maxRadiusKm: number;
  weightingMode?: 'geometric' | 'weighted';
  outlierSigma?: number;
}

function loadSettings(): Partial<SavedSettings> {
  if (typeof window === 'undefined') return {};
  try {
    const s = localStorage.getItem(SETTINGS_KEY);
    return s ? JSON.parse(s) : {};
  } catch { return {}; }
}

function saveSettings(s: SavedSettings) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

// ─── Scenario type ────────────────────────────────────────────────────────────
type Scenario = {
  label: string;
  originName: string;
  hubCount: number;
  tariffs: { direct: number; linehaul: number; lastMile: number };
  result: CostSimulationResult;
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
  
  // Load saved settings once on client
  const savedSettings = useMemo(() => (typeof window !== 'undefined' ? loadSettings() : {}), []);

  const [selectedOriginId, setSelectedOriginId] = useState<string>(savedSettings.selectedOriginId || 'wh-1');
  const [customOriginLocation, setCustomOriginLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isPickingLocation, setIsPickingLocation] = useState<boolean>(false);

  const [hubCount, setHubCount] = useState<number>(savedSettings.hubCount ?? 1);
  const [customHubs, setCustomHubs] = useState<{ lat: number; lng: number }[]>([]);
  const [isPickingCustomHub, setIsPickingCustomHub] = useState<boolean>(false);

  const [dataSource, setDataSource] = useState<DataSourceType>(savedSettings.dataSource || 'applications');
  const [includeZeroWeight, setIncludeZeroWeight] = useState<boolean>(savedSettings.includeZeroWeight ?? true);
  const [fallbackWeightKg, setFallbackWeightKg] = useState<number>(savedSettings.fallbackWeightKg ?? 100);
  const [autoFilterOutliers, setAutoFilterOutliers] = useState<boolean>(savedSettings.autoFilterOutliers ?? true);
  const [maxRadiusKm, setMaxRadiusKm] = useState<number>(savedSettings.maxRadiusKm ?? 300);
  
  const [weightingMode, setWeightingMode] = useState<'geometric' | 'weighted'>(savedSettings.weightingMode || 'weighted');
  const [outlierSigma, setOutlierSigma] = useState<number>(savedSettings.outlierSigma !== undefined ? savedSettings.outlierSigma : 3);
  
  // Visibility Toggles
  const [showTonnageLabels, setShowTonnageLabels] = useState<boolean>(true);
  const [showWarehouses, setShowWarehouses] = useState<boolean>(true);
  const [showPolygons, setShowPolygons] = useState<boolean>(true);
  const [showClusters, setShowClusters] = useState<boolean>(true);
  
  // Modal State
  const [viewingZoneId, setViewingZoneId] = useState<string | null>(null);

  // Block E: Candidate Warehouses (What-If Planner)
  const CANDIDATE_COLORS = ['#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#ec4899'];
  const [candidateWarehouses, setCandidateWarehouses] = useState<CandidateWarehouse[]>(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem('candidate-warehouses') || '[]'); } catch { return []; }
  });
  const [isCandidateMode, setIsCandidateMode] = useState<boolean>(false);
  const [isWithoutRC, setIsWithoutRC] = useState<boolean>(false);

  // Block D: Territory Management
  const [savedZones, setSavedZones] = useState<SavedZone[]>(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem('analytics-saved-zones') || '[]'); } catch { return []; }
  });
  const [isDrawingMode, setIsDrawingMode] = useState<boolean>(false);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [backupZonePolygon, setBackupZonePolygon] = useState<{ id: string; polygon: [number, number][] } | null>(null);

  // Persist saved zones
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('analytics-saved-zones', JSON.stringify(savedZones));
    }
  }, [savedZones]);

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
  const selectedCluster = useAnalyticsStore(state => state.selectedCluster);
  const [clusters, setClusters] = useState<ClusterData[]>([]);
  const [globalCog, setGlobalCog] = useState<{ lat: number; lng: number } | null>(null);

  // Persist candidate warehouses to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('candidate-warehouses', JSON.stringify(candidateWarehouses));
    }
  }, [candidateWarehouses]);

  const handleCandidatePlaced = useCallback((loc: { lat: number; lng: number }) => {
    setCandidateWarehouses(prev => {
      const idx = prev.length;
      const color = CANDIDATE_COLORS[idx % CANDIDATE_COLORS.length];
      const newCand: CandidateWarehouse = {
        id: `cand-${Date.now()}`,
        name: `Кандидат ${idx + 1}`,
        lat: loc.lat,
        lng: loc.lng,
        color,
      };
      return [...prev, newCand];
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCandidateMove = useCallback((id: string, loc: { lat: number; lng: number }) => {
    setCandidateWarehouses(prev => prev.map(c => c.id === id ? { ...c, ...loc } : c));
  }, []);

  const handleCandidateRemove = useCallback((id: string) => {
    setCandidateWarehouses(prev => prev.filter(c => c.id !== id));
  }, []);

  // Helper to calculate clients, total weight, local CoG and warehouse assignment for a zone
  const calculateZoneMetrics = useCallback((
    polygonCoords: [number, number][],
    existingZone?: SavedZone
  ): {
    clients: string[];
    totalWeightTons: number;
    optimalCog?: { lat: number; lng: number };
    warehouseId: string | null;
    color?: string;
  } => {
    if (!polygonCoords || polygonCoords.length < 3) {
      return {
        clients: existingZone?.clients || [],
        totalWeightTons: existingZone?.totalWeightTons || 0,
        optimalCog: existingZone?.optimalCog,
        warehouseId: existingZone?.warehouseId || null,
        color: existingZone?.color,
      };
    }

    // Check which deliveries fall into this polygon
    // Note: polygonCoords are [lat, lng]. Turf expects [lng, lat]
    const turfPolygon = polygon([[
      ...polygonCoords.map(c => [c[1], c[0]]),
      [polygonCoords[0][1], polygonCoords[0][0]] // close the ring
    ]]);

    const insideClients = new Set<string>();
    let totalWeightTons = 0;

    // Gather all deliveries from the current clusters and check intersection
    clusters.forEach(cluster => {
      cluster.deliveries.forEach(d => {
        if (typeof d.latitude === 'number' && typeof d.longitude === 'number') {
          if (booleanPointInPolygon([d.longitude, d.latitude], turfPolygon)) {
            insideClients.add(d.client);
            totalWeightTons += (d.total_weight || 0) / 1000;
          }
        }
      });
    });

    // Auto-detect warehouse if not already manually chosen
    let assignedWarehouseId = existingZone?.warehouseId || null;
    let assignedColor = existingZone?.color;

    if (!assignedWarehouseId) {
      for (const cand of candidateWarehouses) {
        if (booleanPointInPolygon([cand.lng, cand.lat], turfPolygon)) {
          assignedWarehouseId = cand.id;
          assignedColor = cand.color;
          break;
        }
      }
      if (!assignedWarehouseId) {
        for (const wh of warehouses) {
          if (booleanPointInPolygon([wh.lng, wh.lat], turfPolygon)) {
            assignedWarehouseId = `wh-${wh.id}`;
            assignedColor = '#3b82f6';
            break;
          }
        }
      }
    }

    // Calculate local Center of Gravity for this zone's deliveries
    const zoneDeliveries = clusters.flatMap(c => c.deliveries).filter(d => insideClients.has(d.client));
    const optimalCog = calculateCenterOfGravity(zoneDeliveries, fallbackWeightKg, weightingMode) || undefined;

    return {
      clients: Array.from(insideClients),
      totalWeightTons,
      optimalCog,
      warehouseId: assignedWarehouseId,
      color: assignedColor,
    };
  }, [clusters, candidateWarehouses, fallbackWeightKg, weightingMode]);

  const handleZoneCreate = useCallback((polygonCoords: [number, number][]) => {
    if (!clusters || clusters.length === 0) return;

    const metrics = calculateZoneMetrics(polygonCoords);

    const newZone: SavedZone = {
      id: `zone-${Date.now()}`,
      name: `Зона ${savedZones.length + 1}`,
      warehouseId: metrics.warehouseId,
      color: metrics.color,
      polygon: polygonCoords,
      clients: metrics.clients,
      totalWeightTons: metrics.totalWeightTons,
      optimalCog: metrics.optimalCog
    };

    setSavedZones(prev => [...prev, newZone]);
    setIsDrawingMode(false);
  }, [clusters, savedZones.length, calculateZoneMetrics]);

  const handleZoneGeometryChange = useCallback((zoneId: string, newCoords: [number, number][]) => {
    setSavedZones(prev => prev.map(zone => {
      if (zone.id !== zoneId) return zone;
      const metrics = calculateZoneMetrics(newCoords, zone);
      return {
        ...zone,
        polygon: newCoords,
        clients: metrics.clients,
        totalWeightTons: metrics.totalWeightTons,
        optimalCog: metrics.optimalCog,
        warehouseId: metrics.warehouseId,
        color: metrics.color || zone.color,
      };
    }));
  }, [calculateZoneMetrics]);

  const handleStartEditZone = useCallback((zoneId: string) => {
    const target = savedZones.find(z => z.id === zoneId);
    if (target) {
      setBackupZonePolygon({ id: zoneId, polygon: [...target.polygon] });
      setEditingZoneId(zoneId);
      setIsDrawingMode(false);
    }
  }, [savedZones]);

  const handleFinishEditZone = useCallback(() => {
    setEditingZoneId(null);
    setBackupZonePolygon(null);
  }, []);

  const handleCancelEditZone = useCallback(() => {
    if (backupZonePolygon) {
      const backupId = backupZonePolygon.id;
      const backupCoords = backupZonePolygon.polygon;
      setSavedZones(prev => prev.map(zone => {
        if (zone.id !== backupId) return zone;
        const metrics = calculateZoneMetrics(backupCoords, zone);
        return {
          ...zone,
          polygon: backupCoords,
          clients: metrics.clients,
          totalWeightTons: metrics.totalWeightTons,
          optimalCog: metrics.optimalCog,
        };
      }));
    }
    setEditingZoneId(null);
    setBackupZonePolygon(null);
  }, [backupZonePolygon, calculateZoneMetrics]);

  // When candidate warehouses exist, pass them as customHubs to the map
  const effectiveCustomHubs = candidateWarehouses.length > 0
    ? candidateWarehouses.map(c => ({ lat: c.lat, lng: c.lng }))
    : customHubs;

  // Scenario comparison
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [isComparingScenarios, setIsComparingScenarios] = useState(false);

  const { applications, setApplications, setUnmappedApplications, deliveries, setDeliveries, clients, setClients } = useApplicationsStore();

  // Zone details modal filters
  const [zoneSearchQuery, setZoneSearchQuery] = useState('');
  const [showOnlyOverlapping, setShowOnlyOverlapping] = useState(false);

  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: fetchClientsList,
    enabled: (!clients || clients.length === 0),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (clientsData && Array.isArray(clientsData) && clientsData.length > 0 && (!clients || clients.length === 0)) {
      setClients(clientsData);
    }
  }, [clientsData, clients, setClients]);

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

  const [tariffs, setTariffs] = useState(savedSettings.tariffs || { direct: 12, linehaul: 5, lastMile: 18 });
  const [costResult, setCostResult] = useState<CostSimulationResult | null>(null);
  const [useRealRoads, setUseRealRoads] = useState<boolean>(false);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState<boolean>(false);

  // Persist settings whenever they change
  useEffect(() => {
    if (!isClient) return;
    saveSettings({ tariffs, dataSource, hubCount, includeZeroWeight, fallbackWeightKg, selectedOriginId, autoFilterOutliers, maxRadiusKm, weightingMode, outlierSigma });
  }, [isClient, tariffs, dataSource, hubCount, includeZeroWeight, fallbackWeightKg, selectedOriginId, autoFilterOutliers, maxRadiusKm, weightingMode, outlierSigma]);

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
    if (useRealRoads) {
      setIsCalculatingRoute(true);
      calculateLogisticsCostsAsync(activeOriginCoords, globalCog, clusters, tariffs, effFallback)
        .then(result => {
          if (result) setCostResult(result);
          setIsCalculatingRoute(false);
        });
    } else {
      const result = calculateLogisticsCosts(activeOriginCoords, globalCog, clusters, tariffs, effFallback);
      setCostResult(result);
    }
  }, [activeOriginCoords, globalCog, clusters, tariffs, includeZeroWeight, fallbackWeightKg, useRealRoads]);

  const handleLayoutChange = useCallback((_: unknown, allLayouts: Layouts) => {
    setLayouts(allLayouts);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allLayouts));
  }, []);

  const handleResetLayout = () => {
    setLayouts(defaultLayouts);
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleCustomLocationPick = (loc: { lat: number; lng: number }) => {
    if (isPickingCustomHub) {
      setCustomHubs(prev => [...prev, loc]);
      setIsPickingCustomHub(false);
    } else {
      setCustomOriginLocation(loc);
      setSelectedOriginId('custom');
      setIsPickingLocation(false);
    }
  };

  const totalDeliveries = clusters.reduce((acc, c) => acc + c.deliveries.length, 0);
  const totalWeightTons = clusters.reduce((acc, c) => acc + c.totalWeight, 0) / 1000;

  // Zero-weight accuracy warning
  const zeroWeightRatio = auditMetrics.includedCount > 0
    ? auditMetrics.zeroWeightCount / auditMetrics.includedCount
    : 0;
  const hasAccuracyWarning = auditMetrics.zeroWeightCount > 0;

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

  // Save scenario
  const handleSaveScenario = useCallback(() => {
    if (!costResult) return;
    const label = `Сценарій ${String.fromCharCode(65 + scenarios.length)}`;
    const newScenario: Scenario = {
      label,
      originName: originInfo.name,
      hubCount,
      tariffs: { ...tariffs },
      result: { ...costResult },
    };
    setScenarios(prev => [...prev.slice(-1), newScenario]); // keep last 2
  }, [costResult, scenarios.length, originInfo.name, hubCount, tariffs]);

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
                <span className={styles.kpiLabel}>📦 Доставок в аналітиці</span>
                <span className={styles.kpiValue}>{totalDeliveries > 0 ? `${totalDeliveries} шт` : '—'}</span>
              </div>
              <div className={styles.kpiDivider} />
              <div className={styles.kpiItem}>
                <span className={styles.kpiLabel}>⚖️ Загальна вага</span>
                <span className={styles.kpiValue}>{totalWeightTons > 0 ? `${totalWeightTons.toFixed(1)} т` : '—'}</span>
              </div>
              <div className={styles.kpiDivider} />
              <div className={styles.kpiItem}>
                <span className={styles.kpiLabel}>🔵 Кластерів (зон)</span>
                <span className={styles.kpiValue}>{clusters.length > 0 ? clusters.length : '—'}</span>
              </div>
              <div className={styles.kpiDivider} />
              <div className={`${styles.kpiItem} ${costResult && costResult.savings > 0 ? styles.kpiAccent : ''}`}>
                <span className={styles.kpiLabel}>💰 Економія від Хабів</span>
                <span className={styles.kpiValue}>
                  {costResult ? `${costResult.savings >= 0 ? '+' : ''}${Math.round(costResult.savings).toLocaleString()} ₴` : '—'}
                </span>
              </div>
              <div className={styles.kpiDivider} />
              {/* Accuracy warning badge */}
              {hasAccuracyWarning && (
                <>
                  <div className={styles.kpiItem} title={`${auditMetrics.zeroWeightCount} клієнтів отримали авто-вагу ${fallbackWeightKg} кг — реальний розрахунок може відрізнятись`}>
                    <span className={styles.kpiLabel}>⚠️ Точність розрахунку</span>
                    <span className={styles.kpiValue} style={{ color: '#fbbf24', fontSize: '12px' }}>
                      {auditMetrics.zeroWeightCount} без ваги ({Math.round(zeroWeightRatio * 100)}%)
                    </span>
                  </div>
                  <div className={styles.kpiDivider} />
                </>
              )}
              <div className={styles.kpiItem} style={{ flex: 2 }}>
                <span className={styles.kpiLabel}>📅 Період</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input type="date" value={dateRange.start} className={styles.dateInput}
                      onChange={e => setDateRange(p => ({...p, start: e.target.value}))} />
                    <span style={{ color: '#475569' }}>—</span>
                    <input type="date" value={dateRange.end} className={styles.dateInput}
                      onChange={e => setDateRange(p => ({...p, end: e.target.value}))} />
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {DATE_PRESETS.map(p => (
                      <button
                        key={p.label}
                        onClick={() => setDateRange(p.get())}
                        style={{
                          padding: '2px 8px',
                          fontSize: '10px',
                          borderRadius: '4px',
                          border: '1px solid rgba(255,255,255,0.12)',
                          background: 'rgba(255,255,255,0.06)',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = 'rgba(59,130,246,0.2)'; (e.target as HTMLButtonElement).style.color = '#60a5fa'; }}
                        onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)'; (e.target as HTMLButtonElement).style.color = '#94a3b8'; }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
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
              <h3 className={styles.cardTitle}>Головний Склад (Origin)</h3>
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
                onClick={() => {
                  setIsPickingLocation(prev => !prev);
                  setIsPickingCustomHub(false);
                }}
              >
                {isPickingLocation ? '✕ Скасувати вибір на карті' : '🎯 Клікніть на карті для нової точки складу'}
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

        {/* ─── 3. Regional Hubs (K-Means) ─── */}
        <div key="hubs">
          <div className={styles.bentoCard}>
            <div className={styles.cardHeader}>
              <span className={styles.dragHandle}>⠿</span>
              <h3 className={styles.cardTitle}>Регіональні Хаби</h3>
            </div>
            <div className={styles.cardContent}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label style={{ fontSize: '12px', flex: 1 }}>Кількість авто-хабів (K-Means):</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="10" 
                    value={hubCount} 
                    onChange={e => setHubCount(Math.max(1, Number(e.target.value) || 1))}
                    style={{ width: '60px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    disabled={customHubs.length > 0}
                  />
                </div>
                
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  {customHubs.length > 0 
                    ? `Використовуються ручні хаби (${customHubs.length} шт). Авто-розрахунок вимкнено.` 
                    : 'Система автоматично розіб\'є доставки на вказану кількість зон.'}
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button
                    className={`${styles.pickMapBtn} ${isPickingCustomHub ? styles.pickMapBtnActive : ''}`}
                    style={{ flex: 1, borderColor: '#f59e0b', color: isPickingCustomHub ? '#111827' : '#f59e0b', background: isPickingCustomHub ? '#f59e0b' : 'transparent' }}
                    onClick={() => {
                      setIsPickingCustomHub(prev => !prev);
                      setIsPickingLocation(false);
                    }}
                  >
                    {isPickingCustomHub ? '✕ Завершити розстановку' : '📍 Додати ручний хаб'}
                  </button>
                  
                  {customHubs.length > 0 && (
                    <button
                      style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', padding: '0 12px', fontSize: '12px', cursor: 'pointer' }}
                      onClick={() => {
                        setCustomHubs([]);
                        setIsPickingCustomHub(false);
                      }}
                    >
                      Очистити
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── 4. Candidate Warehouses (What-If) ─── */}
        <div key="candidates">
          <div className={styles.bentoCard}>
            <div className={styles.cardHeader}>
              <span className={styles.dragHandle}>⠿</span>
              <h3 className={styles.cardTitle}>Кандидатні Склади (What-If)</h3>
            </div>
            <div className={styles.cardContent}>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px' }}>
                Розставте потенційні місця для складів. Система миттєво перерахує зони і вартість логістики.
              </div>

              {candidateWarehouses.length > 0 && (
                <div style={{ marginBottom: '8px', padding: '8px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                  <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#fcd34d' }}>
                    <input type="checkbox" checked={isWithoutRC} onChange={e => setIsWithoutRC(e.target.checked)} />
                    Режим «Прямі склади» (Без головного РЦ)
                  </label>
                  <div style={{ fontSize: '10px', color: '#fbbf24', marginTop: '4px', opacity: 0.8 }}>
                    Склади отримують товар напряму. Магістральне плече від головного РЦ вимикається з розрахунку.
                  </div>
                </div>
              )}

              <button
                onClick={() => setIsCandidateMode(prev => !prev)}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '8px',
                  border: `1px solid ${isCandidateMode ? '#8b5cf6' : 'rgba(139,92,246,0.4)'}`,
                  background: isCandidateMode ? '#8b5cf6' : 'rgba(139,92,246,0.1)',
                  color: isCandidateMode ? 'white' : '#a78bfa',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginBottom: '8px',
                }}
              >
                {isCandidateMode ? '✕ Завершити розстановку' : '🏭 Додати кандидатний склад'}
              </button>
              
              {/* Candidate list */}
              {candidateWarehouses.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                  {candidateWarehouses.map((cand, idx) => (
                    <div key={cand.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'rgba(255,255,255,0.04)',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '12px',
                    }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: cand.color, flexShrink: 0 }} />
                      <input
                        value={cand.name}
                        onChange={e => setCandidateWarehouses(prev => prev.map(c => c.id === cand.id ? { ...c, name: e.target.value } : c))}
                        style={{ flex: 1, background: 'transparent', border: 'none', color: '#e2e8f0', fontSize: '12px', outline: 'none' }}
                      />
                      <span style={{ color: '#64748b', fontSize: '10px', flexShrink: 0 }}>#{idx + 1}</span>
                      <button
                        onClick={() => handleCandidateRemove(cand.id)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0 2px', fontSize: '14px', lineHeight: 1 }}
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}

              {candidateWarehouses.length > 0 && (
                <button
                  onClick={() => setCandidateWarehouses([])}
                  style={{ width: '100%', padding: '4px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#f87171', fontSize: '11px', cursor: 'pointer' }}
                >
                  🗑️ Очистити всі кандидати
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ─── 5. Territory Management (Saved Zones) ─── */}
        <div key="territories">
          <div className={styles.bentoCard}>
            <div className={styles.cardHeader}>
              <span className={styles.dragHandle}>⠿</span>
              <h3 className={styles.cardTitle}>Збережені Зони (Території)</h3>
            </div>
            <div className={styles.cardContent}>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px' }}>
                Малюйте та редагуйте полігони на карті для закріплення клієнтів за складами.
              </div>

              <button
                onClick={() => setIsDrawingMode(prev => !prev)}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '8px',
                  border: `1px solid ${isDrawingMode ? '#34d399' : 'rgba(52, 211, 153, 0.4)'}`,
                  background: isDrawingMode ? '#34d399' : 'rgba(52, 211, 153, 0.1)',
                  color: isDrawingMode ? '#111827' : '#34d399',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginBottom: '8px',
                }}
              >
                {isDrawingMode ? '✕ Завершити малювання' : '🖍️ Намалювати нову зону'}
              </button>

              {savedZones.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
                  {savedZones.map((zone) => {
                    const isEditing = editingZoneId === zone.id;
                    return (
                      <div 
                        key={zone.id} 
                        style={{
                          background: isEditing ? 'rgba(139, 92, 246, 0.12)' : 'rgba(255,255,255,0.04)',
                          border: isEditing ? '1px solid #8b5cf6' : '1px solid transparent',
                          borderRadius: '6px',
                          padding: '8px',
                          fontSize: '11px',
                          transition: 'all 0.2s',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <input 
                            type="text"
                            value={zone.name}
                            onChange={(e) => {
                              const newName = e.target.value;
                              setSavedZones(prev => prev.map(z => z.id === zone.id ? { ...z, name: newName } : z));
                            }}
                            style={{
                              color: zone.color || '#8b5cf6',
                              fontWeight: 'bold',
                              background: 'transparent',
                              border: '1px solid transparent',
                              borderBottom: '1px dashed rgba(255,255,255,0.3)',
                              padding: '0 2px',
                              width: '100%',
                              marginRight: '8px',
                              outline: 'none',
                              fontSize: '13px'
                            }}
                            onFocus={(e) => e.target.style.borderBottom = '1px solid ' + (zone.color || '#8b5cf6')}
                            onBlur={(e) => e.target.style.borderBottom = '1px dashed rgba(255,255,255,0.3)'}
                          />
                          
                          {/* Action controls */}
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  title="Завершити редагування"
                                  onClick={handleFinishEditZone}
                                  style={{
                                    background: 'rgba(16, 185, 129, 0.25)',
                                    border: '1px solid #10b981',
                                    color: '#34d399',
                                    borderRadius: '4px',
                                    padding: '2px 6px',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                  }}
                                >
                                  ✓ Готово
                                </button>
                                <button
                                  type="button"
                                  title="Скасувати зміни"
                                  onClick={handleCancelEditZone}
                                  style={{
                                    background: 'rgba(239, 68, 68, 0.2)',
                                    border: '1px solid #ef4444',
                                    color: '#f87171',
                                    borderRadius: '4px',
                                    padding: '2px 6px',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  ✕
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  title="Редагувати форму контуру"
                                  onClick={() => handleStartEditZone(zone.id)}
                                  style={{
                                    background: 'rgba(139, 92, 246, 0.15)',
                                    border: '1px solid rgba(139, 92, 246, 0.4)',
                                    color: '#a78bfa',
                                    borderRadius: '4px',
                                    padding: '2px 6px',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '2px',
                                  }}
                                >
                                  ✏️ Редагувати
                                </button>
                                <button
                                  type="button"
                                  title="Видалити зону"
                                  onClick={() => {
                                    if (editingZoneId === zone.id) {
                                      handleCancelEditZone();
                                    }
                                    setSavedZones(prev => prev.filter(z => z.id !== zone.id));
                                  }}
                                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0 4px', fontSize: '12px' }}
                                >
                                  ✕
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {isEditing && (
                          <div style={{ fontSize: '10px', color: '#34d399', marginBottom: '4px', fontWeight: 600 }}>
                            ⚡ Режим редагування: перетягуйте точки на карті
                          </div>
                        )}

                        <div style={{ color: '#94a3b8', marginBottom: '6px' }}>
                          {zone.clients.length} клієнтів • {zone.totalWeightTons.toFixed(1)} т
                        </div>
                        
                        {/* Warehouse binding */}
                        <select 
                          value={zone.warehouseId || ''}
                          onChange={(e) => {
                            const wId = e.target.value || null;
                            let wColor = '#8b5cf6';
                            if (wId) {
                              if (wId.startsWith('wh-')) {
                                wColor = '#3b82f6';
                              } else {
                                const cand = candidateWarehouses.find(c => c.id === wId);
                                if (cand) wColor = cand.color;
                              }
                            }
                            setSavedZones(prev => prev.map(z => z.id === zone.id ? { ...z, warehouseId: wId, color: wColor } : z));
                          }}
                          style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', color: '#cbd5e1', fontSize: '11px', marginBottom: '8px' }}
                        >
                          <option value="" style={{ background: '#1e293b' }}>-- Не прив&apos;язано --</option>
                          <optgroup label="Реальні склади" style={{ background: '#0f172a' }}>
                            {warehouses.map(w => (
                              <option key={`wh-${w.id}`} value={`wh-${w.id}`} style={{ background: '#1e293b' }}>{w.name}</option>
                            ))}
                          </optgroup>
                          {candidateWarehouses.length > 0 && (
                            <optgroup label="Кандидатні склади" style={{ background: '#0f172a' }}>
                              {candidateWarehouses.map(c => (
                                <option key={c.id} value={c.id} style={{ background: '#1e293b' }}>{c.name}</option>
                              ))}
                            </optgroup>
                          )}
                        </select>

                        <button
                          type="button"
                          onClick={() => setViewingZoneId(zone.id)}
                          style={{
                            width: '100%',
                            padding: '4px',
                            borderRadius: '4px',
                            border: '1px solid rgba(59,130,246,0.3)',
                            background: 'rgba(59,130,246,0.1)',
                            color: '#60a5fa',
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                        >
                          👥 Переглянути клієнти ({zone.clients.length})
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── 6. Algorithm Settings (Super Analyst) ─── */}
        <div key="algorithm">
          <div className={styles.bentoCard}>
            <div className={styles.cardHeader}>
              <span className={styles.dragHandle}>⠿</span>
              <h3 className={styles.cardTitle}>Налаштування Алгоритму</h3>
            </div>
            <div className={styles.cardContent}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span>Режим розрахунку РЦ та Кластерів:</span>
                  <select 
                    value={weightingMode} 
                    onChange={e => setWeightingMode(e.target.value as 'geometric' | 'weighted')}
                    style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                  >
                    <option value="weighted">По Тоннажу (Зважений) - РЦ магнітиться до важких доставок</option>
                    <option value="geometric">По Географії (Стандартний) - суто географічний центр</option>
                  </select>
                </label>

                <label style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                  <span>Фільтрація аномалій (Z-Score):</span>
                  <select 
                    value={outlierSigma} 
                    onChange={e => setOutlierSigma(Number(e.target.value))}
                    style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                  >
                    <option value={3}>М&apos;яка (3 Sigma) - відкидає лише крайні викиди</option>
                    <option value={2}>Жорстка (2 Sigma) - відкидає все, крім щільного ядра</option>
                    <option value={0}>Вимкнено - показувати всі точки на карті</option>
                  </select>
                </label>

                <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={showTonnageLabels} onChange={e => setShowTonnageLabels(e.target.checked)} />
                  Показувати мітки тоннажу на карті
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* ─── 7. Layer Visibility Toggles ─── */}
        <div key="layers">
          <div className={styles.bentoCard}>
            <div className={styles.cardHeader}>
              <span className={styles.dragHandle}>⠿</span>
              <h3 className={styles.cardTitle}>Відображення Шарів</h3>
            </div>
            <div className={styles.cardContent}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={showWarehouses} onChange={e => setShowWarehouses(e.target.checked)} />
                  Склади (фактичні та кандидати)
                </label>
                <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={showClusters} onChange={e => setShowClusters(e.target.checked)} />
                  Автоматичні кластери та локальні хаби
                </label>
                <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={showPolygons} onChange={e => setShowPolygons(e.target.checked)} />
                  Намальовані зони та локальні РЦ зон
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* ─── 4. Interactive Map ─── */}
        <div key="map">
          <div className={styles.bentoCard}>
            <div className={styles.dragHandle}>⠿</div>
            <div className={styles.mapWrapper}>
              <AnalyticsMap
                dateRange={dateRange}
                onClusterClick={(cluster) => {
                  setSelectedCluster(cluster);
                }}
                onMapMetricsUpdate={handleMapMetricsUpdate}
                onAuditMetricsUpdate={handleAuditMetricsUpdate}
                selectedOriginId={selectedOriginId}
                onSelectOriginId={(id) => {
                  setSelectedOriginId(id);
                  setIsPickingLocation(false);
                }}
                customOriginLocation={customOriginLocation}
                onCustomOriginChange={handleCustomLocationPick}
                isPickingLocation={isPickingLocation || isPickingCustomHub}
                dataSource={dataSource}
                includeZeroWeight={includeZeroWeight}
                fallbackWeightKg={fallbackWeightKg}
                hubCount={hubCount}
                customHubs={effectiveCustomHubs}
                selectedClusterId={selectedCluster?.clusterId || null}
                autoFilterOutliers={autoFilterOutliers}
                maxRadiusKm={maxRadiusKm}
                weightingMode={weightingMode}
                outlierSigma={outlierSigma}
                showTonnageLabels={showTonnageLabels}
                showWarehouses={showWarehouses}
                showPolygons={showPolygons}
                showClusters={showClusters}
                candidateWarehouses={candidateWarehouses}
                isCandidateMode={isCandidateMode}
                onCandidatePlaced={handleCandidatePlaced}
                onCandidateMove={handleCandidateMove}
                onCandidateRemove={handleCandidateRemove}
                savedZones={savedZones}
                isDrawingMode={isDrawingMode}
                onZoneCreate={handleZoneCreate}
                editingZoneId={editingZoneId}
                onStartEditZone={handleStartEditZone}
                onFinishEditZone={handleFinishEditZone}
                onCancelEditZone={handleCancelEditZone}
                onZoneGeometryChange={handleZoneGeometryChange}
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
                autoFilterOutliers={autoFilterOutliers}
                onToggleAutoFilter={setAutoFilterOutliers}
                maxRadiusKm={maxRadiusKm}
                onChangeMaxRadiusKm={setMaxRadiusKm}
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
              <AnalyticsExport clusters={clusters} dateRange={dateRange} savedZones={savedZones} candidateWarehouses={candidateWarehouses} clients={Array.isArray(clients) ? (clients as ClientAddress[]) : []} />
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
              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={useRealRoads} 
                    onChange={e => setUseRealRoads(e.target.checked)} 
                  />
                  Реальні дороги (Valhalla API)
                </label>
                {isCalculatingRoute && <span style={{ fontSize: '11px', color: '#f59e0b' }}>⏳ Розрахунок...</span>}
              </div>

              {/* Zero-weight accuracy warning */}
              {hasAccuracyWarning && (
                <div style={{
                  background: 'rgba(251, 191, 36, 0.08)',
                  border: '1px solid rgba(251, 191, 36, 0.3)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  marginBottom: '12px',
                  fontSize: '11px',
                  color: '#fbbf24',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '6px',
                }}>
                  <span style={{ flexShrink: 0, marginTop: 1 }}>⚠️</span>
                  <span>
                    <strong>Розрахунок неточний</strong> — {auditMetrics.zeroWeightCount} клієнтів
                    {' '}({Math.round(zeroWeightRatio * 100)}%) отримали авто-вагу {fallbackWeightKg} кг.
                    Для точних результатів заповніть вагу в 1С.
                  </span>
                </div>
              )}

              {costResult ? (
                <div className={styles.resultsGrid}>
                  <div className={styles.resultBox}>
                    <div className={styles.resultLabel}>1. Пряма від складу</div>
                    <div className={styles.resultValue}>{Math.round(costResult.directCost).toLocaleString()} ₴</div>
                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: 2 }}>{costResult.directTkm.toFixed(0)} т·км × {tariffs.direct} ₴</div>
                  </div>
                  
                  {isWithoutRC && candidateWarehouses.length > 0 ? (
                    <div className={styles.resultBox} style={{ borderColor: '#f59e0b', background: 'rgba(245, 158, 11, 0.05)' }}>
                      <div className={styles.resultLabel} style={{ color: '#fcd34d' }}>2. Прямі склади (Без РЦ)</div>
                      <div className={styles.resultValue} style={{ color: '#f59e0b' }}>
                        {Math.round(costResult.lastMileTkm * tariffs.lastMile).toLocaleString()} ₴
                      </div>
                      <div style={{ fontSize: '10px', color: '#fbbf24', marginTop: 2 }}>
                        Без магістралі! Тільки {costResult.lastMileTkm.toFixed(0)} т·км × {tariffs.lastMile} ₴
                      </div>
                    </div>
                  ) : (
                    <div className={styles.resultBox}>
                      <div className={styles.resultLabel}>2. Хабова модель</div>
                      <div className={styles.resultValue}>{Math.round(costResult.hubModelCost).toLocaleString()} ₴</div>
                      <div style={{ fontSize: '10px', color: '#64748b', marginTop: 2 }}>
                        {costResult.linehaulTkm.toFixed(0)} т·км × {tariffs.linehaul} ₴
                        {' + '}{costResult.lastMileTkm.toFixed(0)} т·км × {tariffs.lastMile} ₴
                      </div>
                    </div>
                  )}

                  <div className={styles.resultBox} style={{ gridColumn: 'span 2' }}>
                    <div className={styles.resultLabel}>3. Пряма від Оптимального РЦ (якщо перенести)</div>
                    <div className={styles.resultValue} style={{ color: '#34d399' }}>
                      {Math.round(costResult.optimalDirectCost).toLocaleString()} ₴
                    </div>
                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: 2 }}>{costResult.directTkm.toFixed(0)} → зменшується до ~{(costResult.optimalDirectCost / tariffs.direct).toFixed(0)} т·км</div>
                  </div>
                  
                  {/* Savings from Hubs / Direct Candidate */}
                  <div className={`${styles.resultBox} ${ (isWithoutRC && candidateWarehouses.length > 0 ? (costResult.directCost - (costResult.lastMileTkm * tariffs.lastMile)) : costResult.savings) >= 0 ? styles.highlight : styles.warning}`}>
                    <div className={styles.resultLabel}>
                      {isWithoutRC && candidateWarehouses.length > 0 ? 'Економія від Прямих Складів' : 'Економія від Хабів'}
                    </div>
                    <div className={styles.resultValue}>
                      {(isWithoutRC && candidateWarehouses.length > 0 ? (costResult.directCost - (costResult.lastMileTkm * tariffs.lastMile)) : costResult.savings) >= 0 ? '+' : ''}
                      {Math.round(isWithoutRC && candidateWarehouses.length > 0 ? (costResult.directCost - (costResult.lastMileTkm * tariffs.lastMile)) : costResult.savings).toLocaleString()} ₴
                    </div>
                  </div>

                  {/* Savings from Relocation */}
                  <div className={`${styles.resultBox} ${costResult.relocationSavings >= 0 ? styles.highlight : styles.warning}`}>
                    <div className={styles.resultLabel}>Економія від переносу РЦ</div>
                    <div className={styles.resultValue}>
                      {costResult.relocationSavings >= 0 ? '+' : ''}{Math.round(costResult.relocationSavings).toLocaleString()} ₴
                    </div>
                  </div>

                  {/* Save scenario button */}
                  <div style={{ gridColumn: 'span 2', marginTop: '4px' }}>
                    <button
                      onClick={handleSaveScenario}
                      style={{
                        width: '100%',
                        padding: '6px',
                        borderRadius: '6px',
                        border: '1px solid rgba(99,102,241,0.4)',
                        background: 'rgba(99,102,241,0.1)',
                        color: '#818cf8',
                        fontSize: '11px',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      💾 Зберегти як сценарій {scenarios.length === 0 ? 'А' : scenarios.length === 1 ? 'Б' : '(замінить А)'}
                    </button>
                    {scenarios.length === 2 && (
                      <button
                        onClick={() => setIsComparingScenarios(v => !v)}
                        style={{
                          width: '100%',
                          marginTop: '4px',
                          padding: '6px',
                          borderRadius: '6px',
                          border: '1px solid rgba(16,185,129,0.4)',
                          background: isComparingScenarios ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.08)',
                          color: '#34d399',
                          fontSize: '11px',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        📊 {isComparingScenarios ? 'Сховати порівняння' : 'Порівняти сценарії А vs Б'}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className={styles.emptyState}>Дані відсутні. Завантажте карту.</div>
              )}

              {/* Scenario Comparison Table */}
              {isComparingScenarios && scenarios.length === 2 && (
                <div style={{ marginTop: '12px', fontSize: '11px' }}>
                  <div style={{ fontWeight: 700, marginBottom: '8px', color: '#e2e8f0' }}>📊 Порівняння сценаріїв</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#64748b' }}>
                        <th style={{ padding: '4px 6px', textAlign: 'left' }}>Параметр</th>
                        <th style={{ padding: '4px 6px', textAlign: 'right' }}>{scenarios[0].label}</th>
                        <th style={{ padding: '4px 6px', textAlign: 'right' }}>{scenarios[1].label}</th>
                        <th style={{ padding: '4px 6px', textAlign: 'right' }}>Різниця</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: 'Склад', a: scenarios[0].originName, b: scenarios[1].originName, isText: true },
                        { label: 'Хабів', a: String(scenarios[0].hubCount), b: String(scenarios[1].hubCount), isText: true },
                        { label: 'Пряма (₴)', a: Math.round(scenarios[0].result.directCost), b: Math.round(scenarios[1].result.directCost) },
                        { label: 'Хабова (₴)', a: Math.round(scenarios[0].result.hubModelCost), b: Math.round(scenarios[1].result.hubModelCost) },
                        { label: 'Від Опт.РЦ (₴)', a: Math.round(scenarios[0].result.optimalDirectCost), b: Math.round(scenarios[1].result.optimalDirectCost) },
                        { label: 'Економія Хаб (₴)', a: Math.round(scenarios[0].result.savings), b: Math.round(scenarios[1].result.savings) },
                      ].map((row, i) => {
                        const diff = row.isText ? null : ((row.b as number) - (row.a as number));
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding: '4px 6px', color: '#94a3b8' }}>{row.label}</td>
                            <td style={{ padding: '4px 6px', textAlign: 'right', color: '#e2e8f0' }}>
                              {row.isText ? row.a : (row.a as number).toLocaleString()}
                            </td>
                            <td style={{ padding: '4px 6px', textAlign: 'right', color: '#e2e8f0' }}>
                              {row.isText ? row.b : (row.b as number).toLocaleString()}
                            </td>
                            <td style={{ padding: '4px 6px', textAlign: 'right', color: diff == null ? '#64748b' : diff < 0 ? '#34d399' : diff > 0 ? '#f87171' : '#64748b', fontWeight: 600 }}>
                              {diff == null ? '—' : diff === 0 ? '=' : `${diff > 0 ? '+' : ''}${diff.toLocaleString()}`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <button
                    onClick={() => { setScenarios([]); setIsComparingScenarios(false); }}
                    style={{ marginTop: '8px', fontSize: '10px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Скинути сценарії
                  </button>
                </div>
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
        
        {/* Zone Details Modal */}
        {viewingZoneId && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999
          }}>
            <div style={{
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '12px',
              padding: '24px',
              width: '90%',
              maxWidth: '800px',
              maxHeight: '85vh',
              overflowY: 'auto',
              boxShadow: '0 10px 25px rgba(0,0,0,0.8)',
              position: 'relative'
            }}>
              <button 
                onClick={() => {
                  setViewingZoneId(null);
                  setZoneSearchQuery('');
                  setShowOnlyOverlapping(false);
                }}
                style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
              
              {(() => {
                const zone = savedZones.find(z => z.id === viewingZoneId);
                if (!zone) return <div>Zone not found</div>;
                
                // Get all deliveries for this zone's clients
                const zoneDeliveries = clusters.flatMap(c => c.deliveries).filter(d => zone.clients.includes(d.client));
                
                // Lookup map for fast client directory retrieval
                const clientCatalogMap = new Map<string, ClientAddress>();
                (Array.isArray(clients) ? (clients as ClientAddress[]) : []).forEach((c: ClientAddress) => {
                  if (c && c.client) {
                    clientCatalogMap.set(c.client.trim().toLowerCase(), c);
                  }
                });

                type ZoneClientItem = {
                  client: string;
                  deliveryAddress: string;
                  catalogAddress: string;
                  manager: string;
                  totalWeightKg: number;
                  deliveryCount: number;
                  matchingZones: SavedZone[];
                  otherZones: SavedZone[];
                  isOverlapping: boolean;
                };

                const clientMap = new Map<string, ZoneClientItem>();

                zoneDeliveries.forEach(d => {
                  const clientName = d.client || 'Невідомий';
                  const matchingZones = savedZones.filter(z => z.clients.includes(clientName));
                  const otherZones = matchingZones.filter(z => z.id !== zone.id);
                  const catalogClient = clientCatalogMap.get(clientName.trim().toLowerCase());
                  const catalogAddress = formatCatalogAddress(catalogClient);
                  const manager = d.manager || catalogClient?.manager || '—';

                  if (!clientMap.has(clientName)) {
                    clientMap.set(clientName, {
                      client: clientName,
                      deliveryAddress: d.address || '—',
                      catalogAddress,
                      manager,
                      totalWeightKg: d.total_weight || 0,
                      deliveryCount: 1,
                      matchingZones,
                      otherZones,
                      isOverlapping: otherZones.length > 0,
                    });
                  } else {
                    const existing = clientMap.get(clientName);
                    if (existing) {
                      existing.totalWeightKg += (d.total_weight || 0);
                      existing.deliveryCount += 1;
                      if (!existing.deliveryAddress || existing.deliveryAddress === '—') {
                        existing.deliveryAddress = d.address || '—';
                      }
                    }
                  }
                });

                const allZoneClients = Array.from(clientMap.values()).sort((a, b) => b.totalWeightKg - a.totalWeightKg);
                const overlappingCount = allZoneClients.filter(c => c.isOverlapping).length;

                const filteredZoneClients = allZoneClients.filter(c => {
                  if (showOnlyOverlapping && !c.isOverlapping) return false;
                  if (!zoneSearchQuery.trim()) return true;
                  const q = zoneSearchQuery.toLowerCase();
                  return (
                    c.client.toLowerCase().includes(q) ||
                    c.deliveryAddress.toLowerCase().includes(q) ||
                    c.catalogAddress.toLowerCase().includes(q) ||
                    c.manager.toLowerCase().includes(q) ||
                    c.otherZones.some(z => z.name.toLowerCase().includes(q))
                  );
                });
                
                let warehouseName = 'Не прив\'язано';
                if (zone.warehouseId) {
                  if (zone.warehouseId.startsWith('wh-')) {
                    warehouseName = warehouses.find(w => `wh-${w.id}` === zone.warehouseId)?.name || zone.warehouseId;
                  } else {
                    warehouseName = candidateWarehouses.find(c => c.id === zone.warehouseId)?.name || zone.warehouseId;
                  }
                }

                const handleExportZone = () => {
                  const exportData = filteredZoneClients.map(c => ({
                    'Клієнт': c.client,
                    'Менеджер': c.manager,
                    'Адреса доставки': c.deliveryAddress,
                    'Довідкова адреса (довідник)': c.catalogAddress,
                    'Поточна зона': zone.name,
                    'ID Складу': zone.warehouseId || '',
                    'Назва Складу': warehouseName,
                    'Зони перетину': c.otherZones.map(z => z.name).join(', ') || '—',
                    'Кількість зон': c.matchingZones.length,
                    'Перетин (Так/Ні)': c.isOverlapping ? 'Так' : 'Ні',
                    'Кількість доставок': c.deliveryCount,
                    'Вага (кг)': c.totalWeightKg,
                    'Вага (т)': Number((c.totalWeightKg / 1000).toFixed(2))
                  }));
                  
                  const wb = XLSX.utils.book_new();
                  const ws = XLSX.utils.json_to_sheet(exportData);
                  XLSX.utils.book_append_sheet(wb, ws, 'Клієнти Зони');
                  XLSX.writeFile(wb, `zone_${zone.name.replace(/\s+/g, '_')}_clients.xlsx`);
                };

                return (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', paddingRight: '32px' }}>
                      <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: zone.color || '#8b5cf6' }} />
                        {zone.name} — Клієнти та Логістичний Аудит
                      </h2>
                    </div>

                    <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#94a3b8' }}>
                      Склад: <strong style={{ color: '#e2e8f0' }}>{warehouseName}</strong> • 
                      Клієнтів у зоні: <strong>{allZoneClients.length}</strong> • 
                      Загальна вага: <strong>{zone.totalWeightTons.toFixed(2)} т</strong>
                      {overlappingCount > 0 && (
                        <span style={{ marginLeft: '12px', color: '#f59e0b', fontWeight: 600 }}>
                          ⚠️ Перетин: {overlappingCount} {overlappingCount === 1 ? 'клієнт входить' : 'клієнтів входять'} у кілька зон
                        </span>
                      )}
                    </p>
                    
                    {/* Controls toolbar */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button 
                          onClick={handleExportZone} 
                          style={{ 
                            padding: '6px 12px', borderRadius: '6px', background: '#10b981', color: 'white', 
                            border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' 
                          }}
                        >
                          📥 Експорт в Excel
                        </button>
                        <button 
                          onClick={() => window.print()} 
                          style={{ 
                            padding: '6px 12px', borderRadius: '6px', background: 'transparent', color: '#e2e8f0', 
                            border: '1px solid #334155', cursor: 'pointer', fontSize: '12px' 
                          }}
                        >
                          🖨️ Друк / PDF
                        </button>
                        
                        {/* Overlap toggle filter */}
                        {overlappingCount > 0 && (
                          <button
                            onClick={() => setShowOnlyOverlapping(prev => !prev)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              background: showOnlyOverlapping ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255,255,255,0.05)',
                              border: `1px solid ${showOnlyOverlapping ? '#f59e0b' : 'rgba(255,255,255,0.1)'}`,
                              color: showOnlyOverlapping ? '#fbbf24' : '#94a3b8',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: showOnlyOverlapping ? 600 : 400,
                            }}
                          >
                            {showOnlyOverlapping ? '✓ Тільки з перетином' : `⚠️ Тільки з перетином (${overlappingCount})`}
                          </button>
                        )}
                      </div>

                      {/* Search input */}
                      <div style={{ minWidth: '220px', flex: '1 1 200px', maxWidth: '320px' }}>
                        <input
                          type="text"
                          placeholder="🔍 Пошук клієнта, адреси, зони..."
                          value={zoneSearchQuery}
                          onChange={e => setZoneSearchQuery(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid #334155',
                            background: 'rgba(0,0,0,0.3)',
                            color: '#f8fafc',
                            fontSize: '12px',
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>
                            <th style={{ padding: '8px 10px', borderBottom: '1px solid #334155' }}>Клієнт / Менеджер</th>
                            <th style={{ padding: '8px 10px', borderBottom: '1px solid #334155' }}>Адреса доставки</th>
                            <th style={{ padding: '8px 10px', borderBottom: '1px solid #334155' }}>Довідкова адреса</th>
                            <th style={{ padding: '8px 10px', borderBottom: '1px solid #334155' }}>Зони перетину</th>
                            <th style={{ padding: '8px 10px', borderBottom: '1px solid #334155', textAlign: 'center' }}>Доставок</th>
                            <th style={{ padding: '8px 10px', borderBottom: '1px solid #334155', textAlign: 'right' }}>Вага (кг)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredZoneClients.length === 0 ? (
                            <tr>
                              <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                                {zoneSearchQuery || showOnlyOverlapping ? 'Нічого не знайдено за вказаними фільтрами' : 'Немає клієнтів у цій зоні'}
                              </td>
                            </tr>
                          ) : (
                            filteredZoneClients.map((c, i) => (
                              <tr 
                                key={i} 
                                style={{ 
                                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                                  background: c.isOverlapping ? 'rgba(245, 158, 11, 0.04)' : 'transparent',
                                }}
                              >
                                <td style={{ padding: '8px 10px', color: '#e2e8f0', verticalAlign: 'top' }}>
                                  <div style={{ fontWeight: 600 }}>{c.client}</div>
                                  {c.manager && c.manager !== '—' && (
                                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                                      Менеджер: {c.manager}
                                    </div>
                                  )}
                                </td>
                                <td style={{ padding: '8px 10px', color: '#cbd5e1', verticalAlign: 'top' }}>
                                  <div>{c.deliveryAddress}</div>
                                </td>
                                <td style={{ padding: '8px 10px', color: '#94a3b8', verticalAlign: 'top' }}>
                                  <div style={{ fontStyle: c.catalogAddress === '—' ? 'italic' : 'normal' }}>
                                    {c.catalogAddress}
                                  </div>
                                </td>
                                <td style={{ padding: '8px 10px', verticalAlign: 'top' }}>
                                  {c.isOverlapping ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      <div style={{ fontSize: '10px', color: '#fbbf24', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span>⚠️ Входить ще у {c.otherZones.length} {c.otherZones.length === 1 ? 'зону' : 'зони'}:</span>
                                      </div>
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                        {c.otherZones.map(oz => (
                                          <span 
                                            key={oz.id}
                                            style={{
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '4px',
                                              padding: '1px 6px',
                                              borderRadius: '4px',
                                              background: 'rgba(245, 158, 11, 0.15)',
                                              border: `1px solid ${oz.color || '#f59e0b'}`,
                                              color: '#fde68a',
                                              fontSize: '10px',
                                              fontWeight: 500
                                            }}
                                          >
                                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: oz.color || '#f59e0b' }} />
                                            {oz.name}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <span style={{ 
                                      display: 'inline-block', padding: '1px 6px', borderRadius: '4px', 
                                      background: 'rgba(255,255,255,0.04)', color: '#64748b', fontSize: '10px' 
                                    }}>
                                      Тільки ця зона
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: '8px 10px', color: '#94a3b8', textAlign: 'center', verticalAlign: 'top' }}>
                                  {c.deliveryCount}
                                </td>
                                <td style={{ padding: '8px 10px', color: '#e2e8f0', textAlign: 'right', fontWeight: 600, verticalAlign: 'top' }}>
                                  {c.totalWeightKg.toLocaleString()}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </Portal>
    </div>
  );
}
