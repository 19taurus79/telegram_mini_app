"use client";

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import './RoutingControl.css';

export default function RoutingControl({ waypoints, onRouteFound, onRoutingError }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !waypoints || waypoints.length < 2) return;

    // Создаем контрол для построения маршрута
    const routingControl = L.Routing.control({
      waypoints: waypoints.map(wp => L.latLng(wp.lat, wp.lng)),
      router: L.Routing.osrmv1({
        serviceUrl: 'https://router.project-osrm.org/route/v1',
        profile: 'driving' // Режим: driving, walking, cycling
      }),
      lineOptions: {
        styles: [{ color: '#6366f1', opacity: 0.8, weight: 6 }]
      },
      addWaypoints: true, // Разрешить добавление точек
      routeWhileDragging: true,
      draggableWaypoints: true,
      fitSelectedRoutes: false,
      show: false, // Скрыть стандартные инструкции
      showAlternatives: false,
      createMarker: function(i, waypoint, n) {
        // Создаем кастомные маркеры для начала и конца
        const isStart = i === 0;
        const isEnd = i === n - 1;
        
        const markerIcon = L.divIcon({
          className: 'routing-marker',
          html: `<div style="
            background-color: ${isStart ? '#22c55e' : isEnd ? '#ef4444' : '#3b82f6'};
            width: 30px;
            height: 30px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 14px;
          ">${isStart ? 'A' : isEnd ? 'B' : i + 1}</div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        });

        return L.marker(waypoint.latLng, {
          icon: markerIcon,
          draggable: true
        });
      }
    }).addTo(map);

    // Обработчик успешного построения маршрута
    routingControl.on('routesfound', function(e) {
      const routes = e.routes;
      const summary = routes[0].summary;
      
      // Конвертируем расстояние в км и время в минуты
      const distance = (summary.totalDistance / 1000).toFixed(2); // км
      const time = Math.round(summary.totalTime / 60); // минуты
      
      if (onRouteFound) {
        onRouteFound({
          distance: distance,
          time: time,
          route: routes[0]
        });
      }
    });

    // Обработчик ошибок
    routingControl.on('routingerror', function(e) {
      console.error('Routing error:', e);
      if (onRoutingError) {
        onRoutingError(e.error);
      }
    });

    // Очистка при размонтировании
    return () => {
      if (map && routingControl) {
        map.removeControl(routingControl);
      }
    };
  }, [map, waypoints, onRouteFound, onRoutingError]);

  return null;
}
