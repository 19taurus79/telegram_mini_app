declare module 'leaflet.heat';
declare module '@turf/helpers';
declare module '@turf/clusters-dbscan';
declare module '@turf/convex';
declare module '@turf/area';
declare module '@turf/buffer';
declare module 'react-leaflet' {
  import * as React from 'react';
  import * as L from 'leaflet';

  export const MapContainer: React.ComponentType<Record<string, unknown>>;
  export const TileLayer: React.ComponentType<Record<string, unknown>>;
  export const Marker: React.ComponentType<Record<string, unknown>>;
  export const Popup: React.ComponentType<Record<string, unknown>>;
  export const Tooltip: React.ComponentType<Record<string, unknown>>;
  export const Polygon: React.ComponentType<Record<string, unknown>>;
  export const Polyline: React.ComponentType<Record<string, unknown>>;
  export const Circle: React.ComponentType<Record<string, unknown>>;
  export const CircleMarker: React.ComponentType<Record<string, unknown>>;
  export function useMap(): L.Map;
  export function useMapEvents(handlers: Record<string, unknown>): L.Map;
}
