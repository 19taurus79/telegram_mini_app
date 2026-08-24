'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Tooltip, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import HeatmapLayer from '../HeatmapLayer/HeatmapLayer';
import { useApplicationsStore } from '../../store/applicationsStore';
import { calculateCenterOfGravity, clusterDeliveries, calculateAverageDistance, ClusterData } from './HubCalculator';
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
  customHubs = []
}: Props) {
  const { applications, unmappedApplications, deliveries, selectedManagers, selectedLoBs } = useApplicationsStore();
  
  const [clusters, setClusters] = useState<ClusterData[]>([]);
  const [optimalHub, setOptimalHub] = useState<{ lat: number; lng: number } | null>(null);
  const [avgDistance, setAvgDistance] = useState<number>(0);

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
  const { filteredDeliveries, auditMetrics } = useMemo(() => {
    let zeroWeightCount = 0;
    let filteredOutCount = 0;

    const filtered = rawDeliveries.filter((d: DeliveryRequest) => {
      const hasCoords = typeof d.latitude === 'number' && typeof d.longitude === 'number';
      if (!hasCoords) {
        return false;
      }

      const hasWeight = typeof d.total_weight === 'number' && d.total_weight > 0;
      if (!hasWeight) {
        zeroWeightCount++;
        if (!includeZeroWeight) return false;
      }

      const dDate = d.delivery_date || ((d as Record<string, unknown>).date as string | undefined);
      if (dateRange.start && dDate && new Date(dDate) < new Date(dateRange.start)) {
        filteredOutCount++;
        return false;
      }
      if (dateRange.end && dDate && new Date(dDate) > new Date(dateRange.end)) {
        filteredOutCount++;
        return false;
      }

      if (!filterDelivery(d, [], selectedManagers, [], selectedLoBs, applications)) {
        filteredOutCount++;
        return false;
      }

      return true;
    });

    const includedWeightKg = filtered.reduce((sum, d) => {
      const w = (d.total_weight && d.total_weight > 0) ? d.total_weight : (includeZeroWeight ? fallbackWeightKg : 0);
      return sum + w;
    }, 0);

    const metrics: DataAuditMetrics = {
      totalRaw: rawDeliveries.length + (unmappedApplications?.length || 0),
      includedCount: filtered.length,
      includedWeightTons: includedWeightKg / 1000,
      zeroWeightCount,
      unmappedCount: unmappedClientsList.length,
      filteredOutCount,
      unmappedClients: unmappedClientsList
    };

    return { filteredDeliveries: filtered, auditMetrics: metrics };
  }, [rawDeliveries, unmappedApplications, unmappedClientsList, includeZeroWeight, fallbackWeightKg, dateRange, selectedManagers, selectedLoBs, applications]);

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
        const w = (d.total_weight && d.total_weight > 0) ? d.total_weight : (includeZeroWeight ? fallbackWeightKg : 0);
        return [d.latitude, d.longitude, w];
      });
  }, [filteredDeliveries, includeZeroWeight, fallbackWeightKg]);

  // Calculate Hub and Clusters
  useEffect(() => {
    const effFallback = includeZeroWeight ? fallbackWeightKg : 0;
    if (filteredDeliveries.length > 0) {
      const hub = calculateCenterOfGravity(filteredDeliveries, effFallback);
      setOptimalHub(hub);
      
      const newClusters = clusterDeliveries(filteredDeliveries, hubCount, customHubs, effFallback);
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
  }, [filteredDeliveries, onMapMetricsUpdate, includeZeroWeight, fallbackWeightKg, hubCount, customHubs]);

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

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative', cursor: isPickingLocation ? 'crosshair' : 'default' }}>
      
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

      {/* Analytics Overlay Stats */}
      <div className="analytics-stats-overlay">
        <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
          Логістичні Метрики
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
          <div><strong>Доставок:</strong> {filteredDeliveries.length} шт</div>
          <div><strong>Загальна вага:</strong> {(heatPoints.reduce((sum: number, p: [number, number, number]) => sum + p[2], 0) / 1000).toFixed(2)} т</div>
          {optimalHub && (
            <div><strong>Середнє плече:</strong> {avgDistance.toFixed(1)} км (від Опт. РЦ)</div>
          )}
          <div><strong>Кластерів:</strong> {clusters.length}</div>
        </div>
      </div>

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
        <MapClickHandler 
          isPickingLocation={isPickingLocation} 
          onLocationPick={(loc) => onCustomOriginChange && onCustomOriginChange(loc)} 
        />

        {/* Heatmap Layer */}
        {heatPoints.length > 0 && (
          <HeatmapLayer points={heatPoints} />
        )}

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
            
          const fillColor = `rgba(${255 * intensity}, ${59 + 100 * (1-intensity)}, ${130 + 100 * (1-intensity)}, 0.6)`;
          
          return (
            <React.Fragment key={cluster.clusterId}>
              {hasPolygon ? (
                <Polygon 
                  positions={coords} 
                  pathOptions={{ 
                    color: '#ef4444', 
                    weight: 2, 
                    fillColor: fillColor, 
                    fillOpacity: 0.4 
                  }}
                  eventHandlers={{ click: () => onClusterClick(cluster) }}
                >
                  <Tooltip sticky>
                    <div>
                      <strong>Кластер #{cluster.clusterId}</strong><br/>
                      Щільність: {cluster.density.toFixed(2)} т/км²<br/>
                      Вага: {(cluster.totalWeight / 1000).toFixed(2)} т<br/>
                      <span style={{ fontSize: '10px', color: '#666' }}>Клікніть для деталізації</span>
                    </div>
                  </Tooltip>
                </Polygon>
              ) : (
                <Marker
                   position={[cluster.center.lat, cluster.center.lng]}
                   icon={L.divIcon({
                    className: 'cluster-circle-icon',
                    html: `<div style="background:${fillColor}; border:2px solid #ef4444; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; font-size:10px; font-weight:bold; margin-left:-15px; margin-top:-15px;">
                      ${(cluster.totalWeight/1000).toFixed(1)}т
                    </div>`,
                    iconSize: [30,30], iconAnchor: [0,0]
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
                        background-color: #ef4444;
                        border: 2px solid white;
                        border-radius: 6px;
                        width: 28px;
                        height: 28px;
                        box-shadow: 0 2px 8px rgba(239, 68, 68, 0.6);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        position: relative;
                      ">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          <line x1="3" y1="9" x2="21" y2="9"></line>
                          <line x1="9" y1="21" x2="9" y2="9"></line>
                        </svg>
                        <div style="
                          position: absolute;
                          bottom: -18px;
                          background: rgba(16, 18, 27, 0.9);
                          color: #f87171;
                          font-size: 9px;
                          font-weight: bold;
                          padding: 1px 4px;
                          border-radius: 3px;
                          border: 1px solid rgba(239, 68, 68, 0.3);
                          box-shadow: 0 1px 3px rgba(0,0,0,0.4);
                          white-space: nowrap;
                        ">
                          Хаб #${cluster.clusterId}
                        </div>
                      </div>
                    `,
                    iconSize: [28, 28], 
                    iconAnchor: [14, 14]
                  })}
                >
                  <Tooltip>Локальний склад (Остання миля)</Tooltip>
                </Marker>
              )}
            </React.Fragment>
          );
        })}

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
      </MapContainer>
    </div>
  );
}
