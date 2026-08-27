'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Tooltip, Polyline, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import HeatmapLayer from '../HeatmapLayer/HeatmapLayer';
import { useApplicationsStore } from '../../store/applicationsStore';
import { calculateCenterOfGravity, clusterDeliveries, calculateAverageDistance, ClusterData, filterOutliers, getDeliveryWeight } from './HubCalculator';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import { warehouses } from '../../warehouses';
import { filterDelivery } from '../../utils/filterUtils';
import { DeliveryRequest, DeliveryRequestItem } from '@/types/types';
import { DataSourceType, DataAuditMetrics } from '../AnalyticsDashboard/DataAuditWidget';

/**
 * Leaflet calculates container size on initialization.
 * Invalidates size upon layout shifts or tab changes.
 */
function MapInvalidator() {
  const map = useMap();
  useEffect(() => {
    const timers = [
      setTimeout(() => map.invalidateSize(), 0),
      setTimeout(() => map.invalidateSize(), 100),
      setTimeout(() => map.invalidateSize(), 300),
      setTimeout(() => map.invalidateSize(), 800),
    ];
    const container = map.getContainer();
    const onTransitionEnd = () => map.invalidateSize();
    container.addEventListener('transitionend', onTransitionEnd);
    return () => {
      timers.forEach(clearTimeout);
      container.removeEventListener('transitionend', onTransitionEnd);
    };
  }, [map]);
  return null;
}

/**
 * Listener for clicking on map to set a Custom Warehouse Pin
 */
function MapClickHandler({ 
  isPickingLocation, 
  onLocationPick 
}: { 
  isPickingLocation: boolean; 
  onLocationPick: (loc: { lat: number; lng: number }) => void;
}) {
  useMapEvents({
    click(e: L.LeafletMouseEvent) {
      if (isPickingLocation) {
        onLocationPick({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });
  return null;
}

/**
 * Geoman Draw Control for Territory Management (Block D)
 */
function GeomanDrawControl({ 
  isDrawingMode, 
  onZoneCreate 
}: { 
  isDrawingMode: boolean; 
  onZoneCreate: (polygon: [number, number][]) => void; 
}) {
  const map = useMap();

  useEffect(() => {
    // Only enable geoman if we are in drawing mode
    if (!isDrawingMode) {
      map.pm.removeControls();
      map.pm.disableDraw('Polygon');
      return;
    }

    // Configure Geoman for territory drawing
    map.pm.setGlobalOptions({
      snappable: true,
      snapDistance: 20,
      allowSelfIntersection: false,
      templineStyle: { color: '#fbbf24', weight: 3 },
      hintlineStyle: { color: '#fbbf24', dashArray: [5, 5] },
      pathOptions: { color: '#fbbf24', fillColor: '#fbbf24', fillOpacity: 0.2 },
    });

    // Add polygon control only
    map.pm.addControls({
      position: 'topleft',
      drawMarker: false,
      drawCircleMarker: false,
      drawPolyline: false,
      drawRectangle: false,
      drawPolygon: true,
      drawCircle: false,
      drawText: false,
      editMode: true,
      dragMode: false,
      cutPolygon: false,
      removalMode: false,
      rotateMode: false,
    });

    // Programmatically enable the polygon drawing mode
    map.pm.enableDraw('Polygon');

    const handleCreate = (e: unknown) => {
      const event = e as { shape: string; layer: L.Polygon | L.Layer };
      if (event.shape === 'Polygon' && 'getLatLngs' in event.layer) {
        const layer = event.layer as L.Polygon;
        // getLatLngs() returns LatLng[][] for polygons, so we take the first array
        const latlngs = layer.getLatLngs()[0] as L.LatLng[];
        
        // Convert to [lat, lng] array
        const polygonCoords: [number, number][] = latlngs.map((ll) => [ll.lat, ll.lng]);
        
        // Give time for leaflet-geoman to finish its internal state, then remove the drawn layer
        // because we will render it reactively via <Polygon>
        setTimeout(() => {
          map.removeLayer(layer);
          onZoneCreate(polygonCoords);
        }, 10);
      }
    };

    map.on('pm:create', handleCreate);

    return () => {
      map.pm.removeControls();
      map.pm.disableDraw('Polygon');
      map.off('pm:create', handleCreate);
    };
  }, [map, isDrawingMode, onZoneCreate]);

  return null;
}

// Fix for default marker icon in leaflet
const DefaultIcon = L.icon({
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom icon for Optimal Hub (Main Distribution Center - Theoretical CoG)
const optimalHubIcon = L.divIcon({
  className: 'optimal-hub-icon',
  html: `
    <div style="
      background-color: #10b981;
      border: 2px solid white;
      border-radius: 8px;
      width: 36px;
      height: 36px;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
      </svg>
      <div style="
        position: absolute;
        bottom: -20px;
        background: rgba(16, 18, 27, 0.9);
        color: #34d399;
        font-size: 10px;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 4px;
        border: 1px solid rgba(52, 211, 153, 0.4);
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        white-space: nowrap;
      ">
        Оптимальний РЦ
      </div>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18]
});

// Custom icon for Real Physical Warehouses
const createWarehouseIcon = (name: string, isSelected: boolean) => L.divIcon({
  className: 'real-warehouse-icon',
  html: `
    <div style="
      background: ${isSelected ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 'rgba(30, 41, 59, 0.95)'};
      border: 2px solid ${isSelected ? '#60a5fa' : '#94a3b8'};
      border-radius: 8px;
      width: ${isSelected ? '38px' : '32px'};
      height: ${isSelected ? '38px' : '32px'};
      box-shadow: 0 4px 16px ${isSelected ? 'rgba(59, 130, 246, 0.8)' : 'rgba(0,0,0,0.4)'};
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      cursor: pointer;
      transition: all 0.2s ease;
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="${isSelected ? '20' : '16'}" height="${isSelected ? '20' : '16'}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 21V8l9-4 9 4v13"></path>
        <path d="M9 21v-6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6"></path>
      </svg>
      <div style="
        position: absolute;
        bottom: -20px;
        background: ${isSelected ? '#3b82f6' : 'rgba(16, 18, 27, 0.9)'};
        color: white;
        font-size: 10px;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 4px;
        border: 1px solid ${isSelected ? '#93c5fd' : 'rgba(255, 255, 255, 0.15)'};
        box-shadow: 0 2px 6px rgba(0,0,0,0.5);
        white-space: nowrap;
      ">
        ${name} ${isSelected ? '⭐' : ''}
      </div>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18]
});

// Custom icon for User-placed Custom Pin
const customPinIcon = L.divIcon({
  className: 'custom-pin-icon',
  html: `
    <div style="
      background: linear-gradient(135deg, #f59e0b, #d97706);
      border: 2px solid #fef3c7;
      border-radius: 8px;
      width: 36px;
      height: 36px;
      box-shadow: 0 4px 16px rgba(245, 158, 11, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      cursor: grab;
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3"></circle>
      </svg>
      <div style="
        position: absolute;
        bottom: -20px;
        background: #f59e0b;
        color: #111827;
        font-size: 10px;
        font-weight: 800;
        padding: 2px 6px;
        border-radius: 4px;
        border: 1px solid #fde68a;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        white-space: nowrap;
      ">
        Нова локація
      </div>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18]
});

interface AppOrderAddress {
  latitude?: number;
  longitude?: number;
  city?: string;
  area?: string;
  manager?: string;
}

interface AppOrderItem {
  line_of_business?: string;
  different?: number | string;
  delivery_date?: string;
  date?: string;
  manager?: string;
  [key: string]: unknown;
}

interface ApplicationRecord {
  client: string;
  address?: AppOrderAddress;
  orders?: AppOrderItem[];
  count?: number;
  totalQuantity?: number;
  totalWeight?: number;
}

interface UnmappedAppRecord {
  client: string;
  totalWeight?: number;
  count?: number;
  orders?: unknown[];
}

// ─── Map Legend Component ────────────────────────────────────────────────────
function MapLegend() {
  return (
    <div style={{
      position: 'absolute',
      bottom: 28,
      right: 10,
      zIndex: 1000,
      background: 'rgba(15, 20, 35, 0.92)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '10px',
      padding: '10px 14px',
      fontSize: '11px',
      color: '#cbd5e1',
      backdropFilter: 'blur(8px)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      minWidth: '190px',
    }}>
      <div style={{ fontWeight: 700, fontSize: '11px', color: '#f1f5f9', marginBottom: '8px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
        Легенда карти
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <LegendRow color="#10b981" shape="star" label="Оптимальний РЦ (CoG)" sub="Ідеальне місце для головного складу" />
        <LegendRow color="#3b82f6" shape="square" label="Фактичний склад" sub="Поточне місце відправлення" />
        <LegendRow color="#f59e0b" shape="pin" label="Власна точка" sub="Задана вами локація" />
        <LegendRow color="#ef4444" shape="square" label="Регіональний хаб" sub="Рекомендоване місце перевантаження" />
        <LegendRow color="#ef4444" shape="polygon" label="Зона кластера" sub="Щільність: яскравіше = більше тоннажу" />
        <LegendRow color="#3b82f6" shape="dashes" label="Магістраль" sub="Склад → Хаб (великий вантаж)" />
      </div>
    </div>
  );
}

type LegendRowProps = { color: string; shape: 'star' | 'square' | 'pin' | 'polygon' | 'dashes'; label: string; sub: string };
function LegendRow({ color, shape, label, sub }: LegendRowProps) {
  const iconStyle: React.CSSProperties = { flexShrink: 0, width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' };

  const renderIcon = () => {
    if (shape === 'dashes') {
      return (
        <svg width="18" height="10" viewBox="0 0 18 10">
          <line x1="0" y1="5" x2="18" y2="5" stroke={color} strokeWidth="2" strokeDasharray="4,3" />
        </svg>
      );
    }
    if (shape === 'polygon') {
      return (
        <svg width="18" height="14" viewBox="0 0 18 14">
          <polygon points="9,1 17,7 13,13 5,13 1,7" fill={color} fillOpacity="0.5" stroke={color} strokeWidth="1.5"/>
        </svg>
      );
    }
    if (shape === 'star') {
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill={color}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      );
    }
    if (shape === 'pin') {
      return (
        <svg width="12" height="14" viewBox="0 0 24 24" fill={color}>
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3" fill="white"/>
        </svg>
      );
    }
    // square
    return <div style={{ width: 12, height: 12, borderRadius: 3, background: color, border: `2px solid rgba(255,255,255,0.5)` }} />;
  };

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
      <div style={{ ...iconStyle, marginTop: 1 }}>{renderIcon()}</div>
      <div>
        <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '11px' }}>{label}</div>
        <div style={{ color: '#64748b', fontSize: '10px', marginTop: '1px' }}>{sub}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

// Candidate warehouse type (What-If Planner)
export interface CandidateWarehouse {
  id: string;
  name: string;
  lat: number;
  lng: number;
  color: string;
}

// Block D: Territory Management (Saved Zones)
export interface SavedZone {
  id: string;
  name: string;
  warehouseId: string | null; // e.g., 'wh-1' or 'cand-123'
  polygon: [number, number][]; // LatLng tuple array
  color?: string;
  clients: string[]; // List of client names
  totalWeightTons: number; // Total weight inside
}

type Props = {
  dateRange: { start: string; end: string };
  onClusterClick: (cluster: ClusterData) => void;
  onMapMetricsUpdate?: (clusters: ClusterData[], globalCog: { lat: number; lng: number } | null) => void;
  onAuditMetricsUpdate?: (metrics: DataAuditMetrics) => void;
  selectedOriginId?: string;
  onSelectOriginId?: (id: string) => void;
  customOriginLocation?: { lat: number; lng: number } | null;
  onCustomOriginChange?: (loc: { lat: number; lng: number }) => void;
  isPickingLocation?: boolean;
  dataSource?: DataSourceType;
  includeZeroWeight?: boolean;
  fallbackWeightKg?: number;
  hubCount?: number;
  customHubs?: { lat: number; lng: number }[];
  selectedClusterId?: number | null;
  autoFilterOutliers?: boolean;
  maxRadiusKm?: number;
  weightingMode?: 'geometric' | 'weighted';
  outlierSigma?: number;
  // Block A: tonnage labels
  showTonnageLabels?: boolean;
  // Block E: candidate warehouses
  candidateWarehouses?: CandidateWarehouse[];
  isCandidateMode?: boolean;
  onCandidatePlaced?: (loc: { lat: number; lng: number }) => void;
  onCandidateMove?: (id: string, loc: { lat: number; lng: number }) => void;
  onCandidateRemove?: (id: string) => void;
  // Block D: Territory Management
  savedZones?: SavedZone[];
  isDrawingMode?: boolean;
  onZoneCreate?: (polygon: [number, number][]) => void;
};

export default function AnalyticsMap({ 
  dateRange, 
  onClusterClick, 
  onMapMetricsUpdate,
  onAuditMetricsUpdate,
  selectedOriginId = 'wh-1',
  onSelectOriginId,
  customOriginLocation,
  onCustomOriginChange,
  isPickingLocation = false,
  dataSource = 'applications',
  includeZeroWeight = true,
  fallbackWeightKg = 100,
  hubCount = 1,
  customHubs = [],
  selectedClusterId = null,
  autoFilterOutliers = true,
  maxRadiusKm = 300,
  weightingMode = 'weighted',
  outlierSigma = 3,
  showTonnageLabels = true,
  candidateWarehouses = [],
  isCandidateMode = false,
  onCandidatePlaced,
  onCandidateMove,
  onCandidateRemove,
  savedZones = [],
  isDrawingMode = false,
  onZoneCreate,
}: Props) {
  const { applications, unmappedApplications, deliveries, selectedManagers, selectedLoBs } = useApplicationsStore();
  
  const [clusters, setClusters] = useState<ClusterData[]>([]);
  const [optimalHub, setOptimalHub] = useState<{ lat: number; lng: number } | null>(null);
  const [avgDistance, setAvgDistance] = useState<number>(0);

  // Block B: selected cluster for floating card
  const [floatingCluster, setFloatingCluster] = useState<ClusterData | null>(null);

  // Escape key clears cluster selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFloatingCluster(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Normalize raw data from selected source
  const rawDeliveries = useMemo((): DeliveryRequest[] => {
    if (dataSource === 'deliveries') {
      return deliveries;
    }

    const appsList = (applications || []) as ApplicationRecord[];
    const fromApps: DeliveryRequest[] = appsList.map((app: ApplicationRecord, index: number): DeliveryRequest => {
      const firstOrder = app.orders?.[0];
      return {
        id: -(index + 1),
        client: app.client || '',
        manager: app.address?.manager || (firstOrder?.manager as string) || '',
        address: app.address ? `${app.address.city || ''}, ${app.address.area || ''}`.trim() : '',
        contact: '',
        phone: '',
        delivery_date: (firstOrder?.delivery_date as string) || (firstOrder?.date as string) || '',
        comment: '',
        total_weight: app.totalWeight || 0,
        is_custom_address: false,
        latitude: (app.address?.latitude !== undefined ? app.address.latitude : (NaN as number)),
        longitude: (app.address?.longitude !== undefined ? app.address.longitude : (NaN as number)),
        created_by: 0,
        status: 'crm_order',
        created_at: new Date().toISOString(),
        items: (app.orders || []).map((o: AppOrderItem, oIdx: number): DeliveryRequestItem => ({
          id: oIdx,
          product: o.line_of_business || 'Товар',
          quantity: typeof o.different === 'number' ? o.different : parseFloat(String(o.different)) || 1,
          parties: []
        }))
      };
    });

    if (dataSource === 'applications') {
      return fromApps;
    }

    // 'combined'
    const combinedMap = new Map<string, DeliveryRequest>();
    fromApps.forEach((d: DeliveryRequest) => combinedMap.set(d.client.toLowerCase(), d));
    ((deliveries || []) as DeliveryRequest[]).forEach((d: DeliveryRequest) => {
      if (d.client) combinedMap.set(d.client.toLowerCase(), d);
      else combinedMap.set(String(d.id), d);
    });
    return Array.from(combinedMap.values());
  }, [dataSource, deliveries, applications]);

  // List of clients missing coordinates
  const unmappedClientsList = useMemo(() => {
    const list: { client: string; totalWeight?: number; ordersCount?: number }[] = [];
    const seen = new Set<string>();

    const unmappedList = (unmappedApplications || []) as UnmappedAppRecord[];
    unmappedList.forEach((u: UnmappedAppRecord) => {
      if (u.client && !seen.has(u.client.toLowerCase())) {
        seen.add(u.client.toLowerCase());
        list.push({
          client: u.client,
          totalWeight: u.totalWeight,
          ordersCount: u.orders?.length || u.count || 1
        });
      }
    });

    rawDeliveries.forEach((d: DeliveryRequest) => {
      if ((!d.latitude || !d.longitude) && d.client && !seen.has(d.client.toLowerCase())) {
        seen.add(d.client.toLowerCase());
        list.push({
          client: d.client,
          totalWeight: d.total_weight,
          ordersCount: d.items?.length || 1
        });
      }
    });

    return list;
  }, [unmappedApplications, rawDeliveries]);

  // Filter deliveries and compute Data Quality Audit metrics
  const { filteredDeliveries, auditMetrics, initialGlobalCog } = useMemo(() => {
    let zeroWeightCount = 0;
    let filteredOutCount = 0;

    const rejected: { id: string | number; client: string; reason: string; date?: string }[] = []; // Collect rejected deliveries for debugging

    const filtered = rawDeliveries.filter((d: DeliveryRequest) => {
      const hasCoords = typeof d.latitude === 'number' && typeof d.longitude === 'number';
      if (!hasCoords) {
        rejected.push({ id: d.id, client: d.client, reason: 'No coordinates' });
        return false;
      }

      const hasWeight = typeof d.total_weight === 'number' && d.total_weight > 0;
      if (!hasWeight) {
        zeroWeightCount++;
        if (!includeZeroWeight) {
          rejected.push({ id: d.id, client: d.client, reason: 'Zero weight (and fallback disabled)' });
          return false;
        }
      }

      const dDate = d.delivery_date || ((d as Record<string, unknown>).date as string | undefined);
      if (dateRange.start && dDate && new Date(dDate) < new Date(dateRange.start)) {
        filteredOutCount++;
        rejected.push({ id: d.id, client: d.client, date: dDate, reason: 'Before dateRange.start' });
        return false;
      }
      if (dateRange.end && dDate && new Date(dDate) > new Date(dateRange.end)) {
        filteredOutCount++;
        rejected.push({ id: d.id, client: d.client, date: dDate, reason: 'After dateRange.end' });
        return false;
      }

      if (!filterDelivery(d, [], selectedManagers, [], selectedLoBs, applications)) {
        filteredOutCount++;
        rejected.push({ id: d.id, client: d.client, reason: 'Failed global filters (Manager/LoB)' });
        return false;
      }

      return true;
    });

    if (rejected.length > 0) {
      console.warn(`[AnalyticsMap] ${rejected.length} deliveries were filtered out:`, rejected);
    }

    const effFallback = includeZeroWeight ? fallbackWeightKg : 0;
    
    // Apply geographical outlier filtering
    const { filteredDeliveries: postOutlierDeliveries, outliersCount, globalCog } = filterOutliers(
      filtered, 
      effFallback, 
      maxRadiusKm, 
      autoFilterOutliers,
      weightingMode,
      outlierSigma
    );

    const includedWeightKg = postOutlierDeliveries.reduce((sum, d) => {
      const w = getDeliveryWeight(d, effFallback);
      return sum + w;
    }, 0);

    const metrics: DataAuditMetrics = {
      totalRaw: rawDeliveries.length + (unmappedApplications?.length || 0),
      includedCount: postOutlierDeliveries.length,
      includedWeightTons: includedWeightKg / 1000,
      zeroWeightCount,
      unmappedCount: unmappedClientsList.length,
      filteredOutCount,
      outliersCount,
      unmappedClients: unmappedClientsList
    };

    return { filteredDeliveries: postOutlierDeliveries, auditMetrics: metrics, initialGlobalCog: globalCog };
  }, [rawDeliveries, unmappedApplications, unmappedClientsList, includeZeroWeight, fallbackWeightKg, dateRange, selectedManagers, selectedLoBs, applications, autoFilterOutliers, maxRadiusKm, weightingMode, outlierSigma]);

  // Send audit metrics to parent
  useEffect(() => {
    if (onAuditMetricsUpdate) {
      onAuditMetricsUpdate(auditMetrics);
    }
  }, [auditMetrics, onAuditMetricsUpdate]);

  // Points for heatmap [lat, lng, weight]
  const heatPoints = useMemo((): [number, number, number][] => {
    return filteredDeliveries
      .filter((d: DeliveryRequest): d is DeliveryRequest & { latitude: number; longitude: number } => 
        typeof d.latitude === 'number' && typeof d.longitude === 'number'
      )
      .map((d): [number, number, number] => {
        const effFallback = includeZeroWeight ? fallbackWeightKg : 0;
        const w = getDeliveryWeight(d, effFallback);
        return [d.latitude, d.longitude, w];
      });
  }, [filteredDeliveries, includeZeroWeight, fallbackWeightKg]);

  // Calculate Hub and Clusters
  useEffect(() => {
    const effFallback = includeZeroWeight ? fallbackWeightKg : 0;
    if (filteredDeliveries.length > 0) {
      const hub = calculateCenterOfGravity(filteredDeliveries, effFallback, weightingMode);
      setOptimalHub(hub);
      
      const newClusters = clusterDeliveries(filteredDeliveries, hubCount, customHubs, effFallback, weightingMode);
      setClusters(newClusters);
      if (onMapMetricsUpdate) onMapMetricsUpdate(newClusters, hub);
      
      if (hub) {
        setAvgDistance(calculateAverageDistance(hub, filteredDeliveries));
      }
    } else {
      setOptimalHub(null);
      setClusters([]);
      if (onMapMetricsUpdate) onMapMetricsUpdate([], null);
      setAvgDistance(0);
    }
  }, [filteredDeliveries, onMapMetricsUpdate, includeZeroWeight, fallbackWeightKg, hubCount, customHubs, weightingMode]);

  // Determine active origin coordinates
  const activeOriginCoords = useMemo(() => {
    if (selectedOriginId === 'cog' && optimalHub) {
      return optimalHub;
    }
    if (selectedOriginId === 'custom' && customOriginLocation) {
      return customOriginLocation;
    }
    const wh = warehouses.find(w => `wh-${w.id}` === selectedOriginId);
    if (wh) {
      return { lat: wh.lat, lng: wh.lng };
    }
    return warehouses[0] ? { lat: warehouses[0].lat, lng: warehouses[0].lng } : optimalHub;
  }, [selectedOriginId, optimalHub, customOriginLocation]);

  // Determine cursor style
  const cursorStyle = isCandidateMode ? 'crosshair' : isPickingLocation ? 'crosshair' : 'default';

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative', cursor: cursorStyle }}>
      
      {/* Picking Location Banner */}
      {isPickingLocation && (
        <div style={{
          position: 'absolute',
          top: 14,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          background: 'rgba(245, 158, 11, 0.95)',
          color: '#111827',
          padding: '8px 18px',
          borderRadius: '30px',
          fontWeight: 700,
          fontSize: '13px',
          boxShadow: '0 4px 20px rgba(245, 158, 11, 0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>📍 Клікніть на карті, щоб встановити маркер (Склад або Хаб)</span>
        </div>
      )}

      {/* Candidate Mode Banner */}
      {isCandidateMode && (
        <div style={{
          position: 'absolute',
          top: 14,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          background: 'rgba(139, 92, 246, 0.95)',
          color: 'white',
          padding: '8px 18px',
          borderRadius: '30px',
          fontWeight: 700,
          fontSize: '13px',
          boxShadow: '0 4px 20px rgba(139, 92, 246, 0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>🏭 Клікніть на карті, щоб додати кандидатний склад</span>
        </div>
      )}

      {/* Block B: Floating Cluster Analytics Card */}
      {floatingCluster && (
        <div style={{
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 1100,
          width: 280,
          background: 'rgba(13, 17, 28, 0.97)',
          border: '1px solid rgba(251, 191, 36, 0.4)',
          borderRadius: '14px',
          padding: '14px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
          backdropFilter: 'blur(12px)',
          color: '#e2e8f0',
          fontSize: '12px',
          pointerEvents: 'auto',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ fontWeight: 800, fontSize: '13px', color: '#fbbf24' }}>
              🔷 Кластер #{floatingCluster.clusterId}
            </div>
            <button
              onClick={() => setFloatingCluster(null)}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '2px 4px' }}
            >✕</button>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
            {([
              ['⚖️ Тоннаж', `${(floatingCluster.totalWeight / 1000).toFixed(1)} т`],
              ['👥 Клієнтів', `${floatingCluster.deliveries.length}`],
              ['📐 Площа', `${floatingCluster.areaSqKm.toFixed(0)} км²`],
              ['📊 Щільність', `${floatingCluster.density.toFixed(2)} т/км²`],
            ] as [string, string][]).map(([label, val]) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '6px 8px' }}>
                <div style={{ color: '#64748b', fontSize: '10px' }}>{label}</div>
                <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '13px' }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Top Clients */}
          {floatingCluster.topClients.length > 0 && (
            <div style={{ marginBottom: '10px' }}>
              <div style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 700, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🏆 Топ клієнти</div>
              {floatingCluster.topClients.slice(0, 3).map((c, i) => (
                <div key={c.client} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ color: '#cbd5e1', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {i + 1}. {c.client}
                  </span>
                  <span style={{ color: '#34d399', fontWeight: 700, flexShrink: 0 }}>{(c.weight / 1000).toFixed(1)} т</span>
                </div>
              ))}
            </div>
          )}

          {/* Top Products */}
          {floatingCluster.topProducts.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 700, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📦 Товарний мікс</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {floatingCluster.topProducts.slice(0, 3).map(p => (
                  <span key={p.product} style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '6px', padding: '2px 6px', fontSize: '10px', color: '#a5b4fc' }}>
                    {p.product}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={() => { onClusterClick(floatingCluster); }}
            style={{
              width: '100%',
              padding: '7px',
              borderRadius: '8px',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              background: 'rgba(251, 191, 36, 0.1)',
              color: '#fbbf24',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            📋 Відкрити повну деталізацію →
          </button>
        </div>
      )}

      {/* Average arm info — compact top-left badge */}
      {optimalHub && avgDistance > 0 && (
        <div style={{
          position: 'absolute',
          top: 10,
          left: 10,
          zIndex: 900,
          background: 'rgba(15, 20, 35, 0.85)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '8px',
          padding: '6px 12px',
          fontSize: '11px',
          color: '#94a3b8',
          backdropFilter: 'blur(6px)',
        }}>
          📏 Середнє плече від Опт. РЦ: <strong style={{ color: '#38bdf8' }}>{avgDistance.toFixed(1)} км</strong>
        </div>
      )}

      <MapContainer 
        center={[49.5, 36.5]} // Center around Kharkiv / East region
        zoom={7} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapInvalidator />
        {/* Block D: territory drawing tool */}
        <GeomanDrawControl 
          isDrawingMode={!!isDrawingMode} 
          onZoneCreate={onZoneCreate || (() => {})} 
        />

        <MapClickHandler 
          isPickingLocation={isPickingLocation || isCandidateMode} 
          onLocationPick={(loc) => {
            if (isCandidateMode) {
              if (onCandidatePlaced) onCandidatePlaced(loc);
            } else {
              if (onCustomOriginChange) onCustomOriginChange(loc);
            }
          }} 
        />

        {/* Heatmap Layer */}
        {heatPoints.length > 0 && (
          <HeatmapLayer points={heatPoints} />
        )}

        {/* Block D: Render Saved Zones */}
        {savedZones && savedZones.map(zone => (
          <Polygon
            key={`zone-${zone.id}`}
            positions={zone.polygon}
            pathOptions={{
              color: zone.color || '#8b5cf6',
              fillColor: zone.color || '#8b5cf6',
              fillOpacity: 0.25,
              weight: 3,
              dashArray: '5, 5'
            }}
          >
            <Tooltip sticky>
              <strong>🗺️ {zone.name}</strong><br/>
              Склад: {zone.warehouseId || 'Не призначено'}
            </Tooltip>
          </Polygon>
        ))}

        {/* Block A: Tonnage Labels on Heatmap */}
        {showTonnageLabels && clusters.map(cluster => {
          const pos = cluster.localCog || cluster.center;
          return (
            <Marker
              key={`label-${cluster.clusterId}`}
              position={[pos.lat, pos.lng]}
              icon={L.divIcon({
                className: '',
                html: `<div style="
                  background: rgba(10,15,28,0.82);
                  border: 1px solid rgba(251,191,36,0.5);
                  border-radius: 8px;
                  padding: 4px 8px;
                  font-size: 11px;
                  font-weight: 800;
                  color: #fbbf24;
                  white-space: nowrap;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.5);
                  pointer-events: none;
                  text-align: center;
                  line-height: 1.4;
                ">
                  ${(cluster.totalWeight / 1000).toFixed(1)} т
                  <div style="font-size:9px;font-weight:600;color:#94a3b8;">${cluster.deliveries.length} кл.</div>
                </div>`,
                iconSize: [70, 36],
                iconAnchor: [35, 18]
              })}
              interactive={false}
            />
          );
        })}

        {/* Linehaul Connections: lines from active origin warehouse to regional hubs */}
        {activeOriginCoords && clusters.map(c => {
          const hubLoc = c.localCog || c.center;
          return (
            <Polyline
              key={`line-${c.clusterId}`}
              positions={[
                [activeOriginCoords.lat, activeOriginCoords.lng],
                [hubLoc.lat, hubLoc.lng]
              ]}
              pathOptions={{
                color: '#3b82f6',
                weight: 2,
                dashArray: '6, 8',
                opacity: 0.7
              }}
            />
          );
        })}

        {/* Real Physical Warehouses */}
        {warehouses.map(wh => {
          const isSelected = selectedOriginId === `wh-${wh.id}`;
          return (
            <Marker
              key={`wh-${wh.id}`}
              position={[wh.lat, wh.lng]}
              icon={createWarehouseIcon(wh.name, isSelected)}
              eventHandlers={{
                click: () => onSelectOriginId && onSelectOriginId(`wh-${wh.id}`)
              }}
            >
              <Popup>
                <div style={{ padding: '4px' }}>
                  <strong style={{ fontSize: '13px', color: '#1e293b' }}>{wh.name}</strong>
                  <p style={{ margin: '4px 0 8px 0', fontSize: '11px', color: '#64748b' }}>{wh.description}</p>
                  <button
                    onClick={() => onSelectOriginId && onSelectOriginId(`wh-${wh.id}`)}
                    style={{
                      background: isSelected ? '#10b981' : '#3b82f6',
                      color: 'white',
                      border: 'none',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {isSelected ? '✓ Активна точка' : 'Обрати як вихідний склад'}
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Custom Location Pin */}
        {customOriginLocation && (
          <Marker
            position={[customOriginLocation.lat, customOriginLocation.lng]}
            icon={customPinIcon}
            eventHandlers={{
              click: () => onSelectOriginId && onSelectOriginId('custom')
            }}
          >
            <Popup>
              <div style={{ padding: '4px' }}>
                <strong style={{ fontSize: '13px' }}>📍 Користувацька точка</strong>
                <p style={{ margin: '4px 0', fontSize: '11px', color: '#64748b' }}>
                  Координати: {customOriginLocation.lat.toFixed(4)}, {customOriginLocation.lng.toFixed(4)}
                </p>
                <button
                  onClick={() => onSelectOriginId && onSelectOriginId('custom')}
                  style={{
                    background: '#f59e0b',
                    color: '#111827',
                    border: 'none',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {selectedOriginId === 'custom' ? '✓ Активна точка' : 'Обрати для моделювання'}
                </button>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Render Clusters as Polygons/Circles and Local Hubs */}
        {clusters.map(cluster => {
          let coords: [number, number][] = [];
          let hasPolygon = false;
          const isSelected = selectedClusterId === cluster.clusterId;
          
          if (cluster.hull && (cluster.hull as { geometry?: { type: string; coordinates: unknown[] } }).geometry) {
            const geom = (cluster.hull as { geometry: { type: string; coordinates: unknown[] } }).geometry;
            if (geom.type === 'Polygon' || geom.type === 'MultiPolygon') {
              const rawCoords = geom.type === 'Polygon' 
                ? (geom.coordinates[0] as number[][]) 
                : ((geom.coordinates[0] as unknown[])[0] as number[][]);
              
              if (rawCoords) {
                coords = rawCoords.map(c => [c[1], c[0]]);
                hasPolygon = coords.length > 2;
              }
            }
          }
          
          const intensity = cluster.density > 0 
            ? Math.min(cluster.density / 10, 1) 
            : Math.min((cluster.totalWeight / 1000) / 10, 1);

          // Selected cluster is brighter; non-selected dims when something is selected
          const fillOpacity = isSelected ? 0.7 : (selectedClusterId != null ? 0.2 : 0.4);
          const strokeColor = isSelected ? '#fbbf24' : '#ef4444';
          const strokeWeight = isSelected ? 3 : 2;
          const fillColor = isSelected
            ? `rgba(251, 191, 36, 0.5)`
            : `rgba(${Math.round(255 * intensity)}, ${Math.round(59 + 100 * (1-intensity))}, ${Math.round(130 + 100 * (1-intensity))}, 0.6)`;
          
          return (
            <React.Fragment key={cluster.clusterId}>
              {hasPolygon ? (
                <Polygon 
                  positions={coords} 
                  pathOptions={{ 
                    color: strokeColor, 
                    weight: strokeWeight, 
                    fillColor: fillColor, 
                    fillOpacity,
                  }}
                  eventHandlers={{ click: () => { onClusterClick(cluster); setFloatingCluster(cluster); } }}
                >
                  <Tooltip sticky>
                    <div>
                      <strong>Кластер #{cluster.clusterId}</strong><br/>
                      Щільність: {cluster.density.toFixed(2)} т/км²<br/>
                      Вага: {(cluster.totalWeight / 1000).toFixed(2)} т<br/>
                      Клієнтів: {cluster.deliveries.length}<br/>
                      <span style={{ fontSize: '10px', color: '#666' }}>Клікніть для деталізації</span>
                    </div>
                  </Tooltip>
                </Polygon>
              ) : (
                <Marker
                   position={[cluster.center.lat, cluster.center.lng]}
                   icon={L.divIcon({
                    className: 'cluster-circle-icon',
                    html: `<div style="background:${fillColor}; border:2px solid ${strokeColor}; width:${isSelected ? 36 : 30}px; height:${isSelected ? 36 : 30}px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; font-size:10px; font-weight:bold; margin-left:-${isSelected ? 18 : 15}px; margin-top:-${isSelected ? 18 : 15}px; box-shadow: ${isSelected ? '0 0 0 3px rgba(251,191,36,0.4)' : 'none'};">
                      ${(cluster.totalWeight/1000).toFixed(1)}т
                    </div>`,
                    iconSize: [isSelected ? 36 : 30, isSelected ? 36 : 30], iconAnchor: [0,0]
                  })}
                  eventHandlers={{ click: () => onClusterClick && onClusterClick(cluster) }}
                >
                  <Tooltip>Кластер #{cluster.clusterId} (Клікніть для деталей)</Tooltip>
                </Marker>
              )}

              {/* Local Hub Marker */}
              {cluster.localCog && (
                <Marker 
                  position={[cluster.localCog.lat, cluster.localCog.lng]} 
                  icon={L.divIcon({
                    className: 'local-hub-icon',
                    html: `
                      <div style="
                        background-color: ${isSelected ? '#f59e0b' : '#ef4444'};
                        border: 2px solid white;
                        border-radius: 6px;
                        width: ${isSelected ? 32 : 28}px;
                        height: ${isSelected ? 32 : 28}px;
                        box-shadow: 0 2px 12px ${isSelected ? 'rgba(245, 158, 11, 0.9)' : 'rgba(239, 68, 68, 0.6)'};
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        position: relative;
                        ${isSelected ? 'animation: hubPulse 1.5s ease-in-out infinite;' : ''}
                      ">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          <line x1="3" y1="9" x2="21" y2="9"></line>
                          <line x1="9" y1="21" x2="9" y2="9"></line>
                        </svg>
                        <div style="
                          position: absolute;
                          bottom: -18px;
                          background: ${isSelected ? 'rgba(245, 158, 11, 0.95)' : 'rgba(16, 18, 27, 0.9)'};
                          color: ${isSelected ? '#111827' : '#f87171'};
                          font-size: 9px;
                          font-weight: bold;
                          padding: 1px 4px;
                          border-radius: 3px;
                          border: 1px solid ${isSelected ? '#fde68a' : 'rgba(239, 68, 68, 0.3)'};
                          box-shadow: 0 1px 3px rgba(0,0,0,0.4);
                          white-space: nowrap;
                        ">
                          Хаб #${cluster.clusterId}${isSelected ? ' ✓' : ''}
                        </div>
                      </div>
                    `,
                    iconSize: [isSelected ? 32 : 28, isSelected ? 32 : 28], 
                    iconAnchor: [isSelected ? 16 : 14, isSelected ? 16 : 14]
                  })}
                >
                  <Tooltip>Локальний склад #{cluster.clusterId} (Остання миля)</Tooltip>
                </Marker>
              )}
            </React.Fragment>
          );
        })}

        {/* Block E: Candidate Warehouse Markers */}
        {candidateWarehouses.map((cand, idx) => (
          <Marker
            key={`cand-${cand.id}`}
            position={[cand.lat, cand.lng]}
            draggable={true}
            icon={L.divIcon({
              className: '',
              html: `<div style="
                background: ${cand.color};
                border: 3px solid white;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                width: 36px;
                height: 36px;
                box-shadow: 0 4px 16px rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: grab;
              "><div style="transform:rotate(45deg);font-size:16px">🏭</div></div>
              <div style="
                position: absolute;
                bottom: -22px;
                left: 50%;
                transform: translateX(-50%);
                background: ${cand.color};
                color: white;
                font-size: 10px;
                font-weight: 800;
                padding: 2px 6px;
                border-radius: 4px;
                white-space: nowrap;
                box-shadow: 0 2px 6px rgba(0,0,0,0.4);
              ">${cand.name}</div>`,
              iconSize: [36, 36],
              iconAnchor: [18, 36]
            })}
            eventHandlers={{
              dragend: (e: L.DragEndEvent) => {
                const latlng = (e.target as L.Marker).getLatLng();
                if (onCandidateMove) onCandidateMove(cand.id, { lat: latlng.lat, lng: latlng.lng });
              }
            }}
          >
            <Popup>
              <div style={{ padding: '4px', minWidth: '160px' }}>
                <strong style={{ fontSize: '13px' }}>🏭 {cand.name}</strong>
                <p style={{ margin: '4px 0', fontSize: '11px', color: '#64748b' }}>
                  Кандидат #{idx + 1}<br/>
                  {cand.lat.toFixed(4)}, {cand.lng.toFixed(4)}
                </p>
                <button
                  onClick={() => onCandidateRemove && onCandidateRemove(cand.id)}
                  style={{ background: '#ef4444', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', width: '100%', marginTop: '4px' }}
                >
                  🗑️ Видалити
                </button>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Optimal Hub Marker (Theoretical Center of Gravity) */}
        {optimalHub && (
          <Marker 
            position={[optimalHub.lat, optimalHub.lng]} 
            icon={optimalHubIcon}
            eventHandlers={{
              click: () => onSelectOriginId && onSelectOriginId('cog')
            }}
          >
            <Popup>
              <div style={{ padding: '4px' }}>
                <strong style={{ fontSize: '13px', color: '#047857' }}>🌟 Оптимальний РЦ (Центр тяжіння)</strong>
                <p style={{ margin: '4px 0 8px 0', fontSize: '11px', color: '#64748b' }}>
                  Математично розрахований центр мас вантажопотоку. Забезпечує мінімальний сумарний тонно-кілометраж.
                </p>
                <button
                  onClick={() => onSelectOriginId && onSelectOriginId('cog')}
                  style={{
                    background: selectedOriginId === 'cog' ? '#10b981' : '#059669',
                    color: 'white',
                    border: 'none',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {selectedOriginId === 'cog' ? '✓ Активна точка' : 'Розрахувати від Опт. РЦ'}
                </button>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Max Radius Circle from Global CoG */}
        {initialGlobalCog && maxRadiusKm && (
          <Circle
            center={[initialGlobalCog.lat, initialGlobalCog.lng]}
            radius={maxRadiusKm * 1000} // radius is in meters
            pathOptions={{
              color: '#f87171',
              weight: 1,
              fillColor: '#f87171',
              fillOpacity: 0.05,
              dashArray: '5, 10'
            }}
          />
        )}

        {/* Map Legend */}
        <MapLegend />
      </MapContainer>
    </div>
  );
}
