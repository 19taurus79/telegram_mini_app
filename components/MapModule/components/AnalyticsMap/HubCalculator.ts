import { DeliveryRequest } from '@/types/types';
import { point, featureCollection } from '@turf/helpers';
import dbscan from '@turf/clusters-dbscan';
import convex from '@turf/convex';
import area from '@turf/area';
import buffer from '@turf/buffer';

// Helper to convert degrees to radians
export const deg2rad = (deg: number) => deg * (Math.PI / 180);

/**
 * Calculates distance between two points in km using Haversine formula
 */
export const calculateDistanceKm = (p1: {lat: number, lng: number}, p2: {lat: number, lng: number}): number => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(p2.lat - p1.lat);
  const dLon = deg2rad(p2.lng - p1.lng); 
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(p1.lat)) * Math.cos(deg2rad(p2.lat)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
};

/**
 * Calculates the Center of Gravity (Optimal Hub Location) based on delivery weights and coordinates.
 */
export const calculateCenterOfGravity = (deliveries: DeliveryRequest[], fallbackWeightKg: number = 0): { lat: number, lng: number } | null => {
  if (!deliveries || deliveries.length === 0) return null;

  let totalWeight = 0;
  let sumLatWeight = 0;
  let sumLngWeight = 0;

  deliveries.forEach((d: DeliveryRequest) => {
    if (d.latitude && d.longitude) {
      const w = (d.total_weight && d.total_weight > 0) ? d.total_weight : fallbackWeightKg;
      if (w > 0) {
        totalWeight += w;
        sumLatWeight += d.latitude * w;
        sumLngWeight += d.longitude * w;
      }
    }
  });

  if (totalWeight === 0) return null;

  return {
    lat: sumLatWeight / totalWeight,
    lng: sumLngWeight / totalWeight
  };
};

export type ClusterData = {
  clusterId: number;
  deliveries: DeliveryRequest[];
  totalWeight: number;
  center: { lat: number, lng: number }; // Average geometric center
  localCog: { lat: number, lng: number } | null; // Center of Gravity (weighted by mass)
  hull: unknown; // GeoJSON polygon
  areaSqKm: number;
  density: number; // weight per sq km
  topClients: { client: string; weight: number; count: number }[];
  topProducts: { product: string; quantity: number }[];
};

/**
 * Clusters delivery points using DBSCAN algorithm from Turf.js
 */
export const clusterDeliveries = (
  deliveries: DeliveryRequest[], 
  maxDistanceKm: number = 20, 
  fallbackWeightKg: number = 0
): ClusterData[] => {
  const validDeliveries = deliveries.filter((d: DeliveryRequest) => Boolean(d.latitude && d.longitude));
  
  if (validDeliveries.length === 0) {
    return [];
  }

  const points = validDeliveries.map((d: DeliveryRequest) => {
    return point([d.longitude!, d.latitude!], { delivery: d });
  });

  const fc = featureCollection(points);
  
  // DBSCAN clustering. Minimum points to form a cluster: 3
  const clustered = dbscan(fc, maxDistanceKm, { minPoints: 3 });
  
  const clusterGroups: Record<number, DeliveryRequest[]> = {};
  
  clustered.features.forEach((f: { properties?: { cluster?: number; delivery?: DeliveryRequest } }) => {
    const clusterId = f.properties?.cluster;
    if (clusterId !== undefined && f.properties?.delivery) {
      if (!clusterGroups[clusterId]) clusterGroups[clusterId] = [];
      clusterGroups[clusterId].push(f.properties.delivery);
    }
  });

  return Object.entries(clusterGroups).map(([id, groupDeliveries]) => {
    // Generate convex hull for the group
    const groupPts = featureCollection(groupDeliveries.map(d => point([d.longitude!, d.latitude!])));
    let hull = groupDeliveries.length >= 3 ? convex(groupPts) : null;
    
    // Apply a buffer (e.g. 5 km) to the hull so it encompasses points nicely
    if (hull) {
      try {
        hull = buffer(hull, 5, { units: 'kilometers' }) || hull;
      } catch {
        // ignore buffer error if any
      }
    }
    
    // Area calculation (square meters to sq km)
    let areaSqKm = 0;
    if (hull) {
      areaSqKm = area(hull) / 1000000;
    }

    // Local Center of Gravity
    const localCog = calculateCenterOfGravity(groupDeliveries, fallbackWeightKg);

    // Calculate cluster center (geometric average) and total weight
    let cLat = 0, cLng = 0;
    let tWeight = 0;
    
    // Client and Product aggregations
    const clientMap: Record<string, { weight: number; count: number }> = {};
    const productMap: Record<string, number> = {};

    groupDeliveries.forEach((d: DeliveryRequest) => {
      cLat += d.latitude!;
      cLng += d.longitude!;
      const weight = (d.total_weight && d.total_weight > 0) ? d.total_weight : fallbackWeightKg;
      tWeight += weight;

      // Aggregating clients
      const cName = d.client || 'Невідомий';
      if (!clientMap[cName]) clientMap[cName] = { weight: 0, count: 0 };
      clientMap[cName].weight += weight;
      clientMap[cName].count += 1;

      // Aggregating products
      if (d.items) {
        d.items.forEach(item => {
          if (item.product) {
            productMap[item.product] = (productMap[item.product] || 0) + (item.quantity || 0);
          }
        });
      }
    });

    const density = areaSqKm > 0 ? (tWeight / 1000) / areaSqKm : 0; // ton per sq km

    const topClients = Object.entries(clientMap)
      .map(([client, data]) => ({ client, ...data }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5); // top 5

    const topProducts = Object.entries(productMap)
      .map(([product, quantity]) => ({ product, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5); // top 5
    
    return {
      clusterId: Number(id) + 1,
      deliveries: groupDeliveries,
      totalWeight: tWeight,
      center: { lat: cLat / groupDeliveries.length, lng: cLng / groupDeliveries.length },
      localCog,
      hull,
      areaSqKm,
      density,
      topClients,
      topProducts
    };
  });
};

/**
 * Calculate average delivery distance (straight line / Haversine) from a specific hub
 */
export const calculateAverageDistance = (hub: {lat: number, lng: number}, deliveries: DeliveryRequest[]): number => {
  const validDeliveries = deliveries.filter((d: DeliveryRequest) => Boolean(d.latitude && d.longitude));
  if (validDeliveries.length === 0) return 0;

  let totalDistance = 0;
  validDeliveries.forEach((d: DeliveryRequest) => {
    totalDistance += calculateDistanceKm(hub, { lat: d.latitude!, lng: d.longitude! });
  });

  return totalDistance / validDeliveries.length;
};

export type CostSimulationResult = {
  directCost: number;          // Поточна пряма доставка від обраного складу
  hubModelCost: number;        // Доставка від обраного складу через регіональні хаби
  optimalDirectCost: number;   // Доставка, якби склад стояв в Оптимальному РЦ (Center of Gravity)
  savings: number;             // Економія від хабів (directCost - hubModelCost)
  relocationSavings: number;   // Економія від переносу складу в Оптимальний РЦ (directCost - optimalDirectCost)
  directTkm: number;
  linehaulTkm: number;
  lastMileTkm: number;
};

/**
 * Simulates supply chain costs comparing:
 * 1. Direct Delivery from Selected Warehouse (Origin)
 * 2. Hub-and-Spoke model from Selected Warehouse
 * 3. Theoretical Optimal Direct Delivery from Center of Gravity (CoG)
 */
export const calculateLogisticsCosts = (
  origin: { lat: number; lng: number } | null,
  globalCog: { lat: number; lng: number } | null,
  clusters: ClusterData[],
  tariffs: { direct: number; linehaul: number; lastMile: number },
  fallbackWeightKg: number = 0
): CostSimulationResult => {
  
  if (!origin || clusters.length === 0) {
    return {
      directCost: 0,
      hubModelCost: 0,
      optimalDirectCost: 0,
      savings: 0,
      relocationSavings: 0,
      directTkm: 0,
      linehaulTkm: 0,
      lastMileTkm: 0
    };
  }

  let directTkm = 0;
  let linehaulTkm = 0;
  let lastMileTkm = 0;
  let optimalDirectTkm = 0;

  clusters.forEach(cluster => {
    // Local Hub for this cluster (Center of Gravity of the cluster)
    const localHub = cluster.localCog || cluster.center;
    const clusterWeightTon = cluster.totalWeight / 1000;

    // 1. Linehaul: from selected warehouse origin to regional cluster hub
    const linehaulDist = calculateDistanceKm(origin, localHub);
    linehaulTkm += linehaulDist * clusterWeightTon;

    cluster.deliveries.forEach(d => {
      const effWeight = (d.total_weight && d.total_weight > 0) ? d.total_weight : fallbackWeightKg;
      const weightTon = effWeight / 1000;
      if (weightTon > 0 && d.latitude && d.longitude) {
        const clientLoc = { lat: d.latitude, lng: d.longitude };

        // 1. Direct from selected warehouse to client
        const directDist = calculateDistanceKm(origin, clientLoc);
        directTkm += directDist * weightTon;

        // 2. Hub Last Mile: from regional hub to client
        const lastMileDist = calculateDistanceKm(localHub, clientLoc);
        lastMileTkm += lastMileDist * weightTon;

        // 3. Optimal Direct: if warehouse was located at theoretical Center of Gravity
        if (globalCog) {
          const optDist = calculateDistanceKm(globalCog, clientLoc);
          optimalDirectTkm += optDist * weightTon;
        }
      }
    });
  });

  const directCost = directTkm * tariffs.direct;
  const hubModelCost = (linehaulTkm * tariffs.linehaul) + (lastMileTkm * tariffs.lastMile);
  const optimalDirectCost = globalCog ? optimalDirectTkm * tariffs.direct : directCost;
  
  const savings = directCost - hubModelCost;
  const relocationSavings = directCost - optimalDirectCost;

  return {
    directCost,
    hubModelCost,
    optimalDirectCost,
    savings,
    relocationSavings,
    directTkm,
    linehaulTkm,
    lastMileTkm
  };
};
