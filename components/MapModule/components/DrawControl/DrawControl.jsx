"use client";

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-geometryutil';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';

export default function DrawControl({ applications = [], clients = [], deliveries = [], onSelectionCreate }) {
  const map = useMap();
  const applicationsRef = useRef(applications);
  const clientsRef = useRef(clients);
  const deliveriesRef = useRef(deliveries);
  const onSelectionCreateRef = useRef(onSelectionCreate);

  // Обновляем рефы при изменении пропсов
  useEffect(() => {
    applicationsRef.current = applications;
    clientsRef.current = clients;
    deliveriesRef.current = deliveries;
    onSelectionCreateRef.current = onSelectionCreate;
  }, [applications, clients, deliveries, onSelectionCreate]);

  useEffect(() => {
    // Исправляем иконки маркеров для Leaflet.PM
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });

    // Настройки для измерений - ВАЖНО: включаем ДО добавления контролов
    map.pm.setGlobalOptions({
      measurements: { 
        measurement: true,
        displayFormat: 'metric',
      },
      templineStyle: {
        color: '#3388ff',
        weight: 3,
      },
      hintlineStyle: {
        color: '#3388ff',
        dashArray: [5, 5],
      },
      pathOptions: {
        color: '#3388ff',
        fillColor: '#3388ff',
        fillOpacity: 0.2,
      },
    });

    // Добавляем контролы для рисования
    map.pm.addControls({
      position: 'topleft',
      drawMarker: true,
      drawCircleMarker: false,
      drawPolyline: true,
      drawRectangle: true,
      drawPolygon: true,
      drawCircle: true,
      editMode: true,
      dragMode: true,
      cutPolygon: true,
      removalMode: true,
      rotateMode: false,
    });

    // Функция для расчета расстояния между двумя точками
    const calculateDistance = (latlngs) => {
      let totalDistance = 0;
      for (let i = 0; i < latlngs.length - 1; i++) {
        totalDistance += map.distance(latlngs[i], latlngs[i + 1]);
      }
      return totalDistance;
    };

    // Функция для расчета площади полигона (геодезическая площадь)
    const calculateArea = (latlngs) => {
      try {
        // Проверяем, доступен ли L.GeometryUtil
        if (L.GeometryUtil && L.GeometryUtil.geodesicArea) {
          return L.GeometryUtil.geodesicArea(latlngs);
        }
        
        // Альтернативный расчет площади по формуле сферической геометрии
        const earthRadius = 6371000; // радиус Земли в метрах
        let area = 0;
        const len = latlngs.length;
        
        if (len < 3) return 0;
        
        for (let i = 0; i < len; i++) {
          const p1 = latlngs[i];
          const p2 = latlngs[(i + 1) % len];
          
          const lat1 = p1.lat * Math.PI / 180;
          const lat2 = p2.lat * Math.PI / 180;
          const lng1 = p1.lng * Math.PI / 180;
          const lng2 = p2.lng * Math.PI / 180;
          
          area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
        }
        
        area = Math.abs(area * earthRadius * earthRadius / 2);
        return area;
      } catch (error) {
        console.error('Ошибка расчета площади:', error);
        return 0;
      }
    };

    // Функция для форматирования расстояния
    const formatDistance = (meters) => {
      if (meters < 1000) {
        return `${meters.toFixed(2)} м`;
      }
      return `${(meters / 1000).toFixed(2)} км`;
    };

    // Функция для форматирования площади
    const formatArea = (sqMeters) => {
      if (sqMeters < 10000) {
        return `${sqMeters.toFixed(2)} м²`;
      }
      return `${(sqMeters / 10000).toFixed(2)} га`;
    };

    // Функция для проверки, находится ли точка внутри полигона
    const isPointInPolygon = (point, polygon) => {
      const x = point.lat;
      const y = point.lng;
      let inside = false;

      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].lat;
        const yi = polygon[i].lng;
        const xj = polygon[j].lat;
        const yj = polygon[j].lng;

        const intersect = ((yi > y) !== (yj > y)) &&
          (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }

      return inside;
    };

    // Функция для проверки, находится ли точка внутри круга
    const isPointInCircle = (point, center, radius) => {
      const distance = map.distance(point, center);
      return distance <= radius;
    };

    // Функция для поиска маркеров внутри фигуры
    const checkMarkersInShape = (layer, shape) => {
      console.log('=== checkMarkersInShape вызвана ===');
      console.log('Shape:', shape);
      
      // Используем актуальные данные из рефов
      const currentApps = applicationsRef.current;
      const currentClients = clientsRef.current;
      const currentDeliveries = deliveriesRef.current;
      
      console.log('Applications доступно:', currentApps.length);
      console.log('Clients доступно:', currentClients.length);
      console.log('Deliveries доступно:', currentDeliveries.length);
      
      const selectedApplications = [];
      const selectedClients = [];
      const selectedDeliveries = [];

      if (shape === 'Polygon' || shape === 'Rectangle') {
        const latlngs = layer.getLatLngs()[0];
        console.log('Полигон координаты:', latlngs);
        
        // Проверяем заявки
        currentApps.forEach(app => {
          if (app.address?.latitude && app.address?.longitude) {
            const point = { lat: app.address.latitude, lng: app.address.longitude };
            const isInside = isPointInPolygon(point, latlngs);
            if (isInside) {
              console.log('Заявка внутри:', app.client);
              selectedApplications.push(app);
            }
          }
        });

        // Проверяем клиентов
        currentClients.forEach(client => {
          if (client.latitude && client.longitude) {
            const point = { lat: client.latitude, lng: client.longitude };
            const isInside = isPointInPolygon(point, latlngs);
            if (isInside) {
              console.log('Клиент внутри:', client.client);
              selectedClients.push(client);
            }
          }
        });

        // Проверяем доставки
        currentDeliveries.forEach(delivery => {
            if (delivery.latitude && delivery.longitude) {
                const point = { lat: delivery.latitude, lng: delivery.longitude };
                const isInside = isPointInPolygon(point, latlngs);
                if (isInside) {
                  console.log('Доставка внутри:', delivery.client);
                  selectedDeliveries.push(delivery);
                }
            }
        });
      } else if (shape === 'Circle') {
        const center = layer.getLatLng();
        const radius = layer.getRadius();
        console.log('Круг центр:', center, 'радиус:', radius);

        // Проверяем заявки
        currentApps.forEach(app => {
          if (app.address?.latitude && app.address?.longitude) {
            const point = { lat: app.address.latitude, lng: app.address.longitude };
            const isInside = isPointInCircle(point, center, radius);
            if (isInside) {
              console.log('Заявка внутри круга:', app.client);
              selectedApplications.push(app);
            }
          }
        });

        // Проверяем клиентов
        currentClients.forEach(client => {
          if (client.latitude && client.longitude) {
            const point = { lat: client.latitude, lng: client.longitude };
            const isInside = isPointInCircle(point, center, radius);
            if (isInside) {
              console.log('Клиент внутри круга:', client.client);
              selectedClients.push(client);
            }
          }
        });

         // Проверяем доставки
         currentDeliveries.forEach(delivery => {
            if (delivery.latitude && delivery.longitude) {
                const point = { lat: delivery.latitude, lng: delivery.longitude };
                const isInside = isPointInCircle(point, center, radius);
                if (isInside) {
                  console.log('Доставка внутри круга:', delivery.client);
                  selectedDeliveries.push(delivery);
                }
            }
        });
      }

      console.log('Найдено заявок:', selectedApplications.length);
      console.log('Найдено клиентов:', selectedClients.length);
      console.log('Найдено доставок:', selectedDeliveries.length);

      // Вызываем callback с результатами через реф
      if (onSelectionCreateRef.current && (selectedApplications.length > 0 || selectedClients.length > 0 || selectedDeliveries.length > 0)) {
        console.log('Вызываем onSelectionCreate');
        onSelectionCreateRef.current({
          applications: selectedApplications,
          clients: selectedClients,
          deliveries: selectedDeliveries,
          shape: shape
        });
      } else {
        console.log('Callback не вызван. onSelectionCreate:', !!onSelectionCreateRef.current, 'Есть результаты:', (selectedApplications.length > 0 || selectedClients.length > 0 || selectedDeliveries.length > 0));
      }

      console.log(`Найдено в фигуре: ${selectedApplications.length} заявок, ${selectedClients.length} клиентов, ${selectedDeliveries.length} доставок`);
    };

    // Обработчик создания фигуры
    map.on('pm:create', (e) => {
      console.log('Создана фигура:', e);
      const layer = e.layer;
      
      // Добавляем возможность редактирования
      if (layer.pm) {
        layer.pm.enable({
          allowSelfIntersection: false,
        });
      }

      // Добавляем измерения в зависимости от типа фигуры
      if (e.shape === 'Line') {
        const latlngs = layer.getLatLngs();
        const distance = calculateDistance(latlngs);
        const distanceText = formatDistance(distance);
        
        // Добавляем tooltip с расстоянием
        layer.bindTooltip(distanceText, {
          permanent: true,
          direction: 'center',
          className: 'measurement-tooltip'
        }).openTooltip();

        // Добавляем popup с деталями
        layer.bindPopup(`<strong>Расстояние:</strong> ${distanceText}`);
        
        console.log(`Линия: ${distanceText}`);
      } 
      else if (e.shape === 'Polygon' || e.shape === 'Rectangle') {
        const latlngs = layer.getLatLngs()[0];
        const area = calculateArea(latlngs);
        const areaText = formatArea(area);
        
        // Добавляем tooltip с площадью
        layer.bindTooltip(areaText, {
          permanent: true,
          direction: 'center',
          className: 'measurement-tooltip'
        }).openTooltip();

        // Добавляем popup с деталями
        layer.bindPopup(`<strong>Площадь:</strong> ${areaText}`);
        
        console.log(`Полигон: ${areaText}`);
        
        // Проверяем маркеры внутри фигуры
        checkMarkersInShape(layer, e.shape);
      }
      else if (e.shape === 'Circle') {
        const radius = layer.getRadius();
        const area = Math.PI * radius * radius;
        const radiusText = formatDistance(radius);
        const areaText = formatArea(area);
        
        // Добавляем tooltip
        layer.bindTooltip(`R: ${radiusText}<br/>S: ${areaText}`, {
          permanent: true,
          direction: 'center',
          className: 'measurement-tooltip'
        }).openTooltip();

        // Добавляем popup
        layer.bindPopup(`<strong>Радиус:</strong> ${radiusText}<br/><strong>Площадь:</strong> ${areaText}`);
        
        console.log(`Круг - Радиус: ${radiusText}, Площадь: ${areaText}`);
        
        // Проверяем маркеры внутри фигуры
        checkMarkersInShape(layer, e.shape);
      }
      else if (e.shape === 'Marker') {
        const latlng = layer.getLatLng();
        layer.bindPopup(`<strong>Координаты:</strong><br/>Широта: ${latlng.lat.toFixed(6)}<br/>Долгота: ${latlng.lng.toFixed(6)}`);
        console.log(`Маркер: ${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`);
      }
    });

    // Обработчик редактирования - обновляем измерения
    map.on('pm:edit', (e) => {
      console.log('Отредактирована фигура:', e);
      const layers = e.layers;
      
      layers.eachLayer((layer) => {
        if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
          // Обновляем расстояние для линии
          const latlngs = layer.getLatLngs();
          const distance = calculateDistance(latlngs);
          const distanceText = formatDistance(distance);
          
          // Проверяем, есть ли tooltip, если нет - создаем
          if (layer.getTooltip()) {
            layer.setTooltipContent(distanceText);
          } else {
            layer.bindTooltip(distanceText, {
              permanent: true,
              direction: 'center',
              className: 'measurement-tooltip'
            }).openTooltip();
          }
          
          // Обновляем popup
          if (layer.getPopup()) {
            layer.setPopupContent(`<strong>Расстояние:</strong> ${distanceText}`);
          } else {
            layer.bindPopup(`<strong>Расстояние:</strong> ${distanceText}`);
          }
        } 
        else if (layer instanceof L.Polygon) {
          // Обновляем площадь для полигона
          const latlngs = layer.getLatLngs()[0];
          const area = calculateArea(latlngs);
          const areaText = formatArea(area);
          
          // Проверяем, есть ли tooltip, если нет - создаем
          if (layer.getTooltip()) {
            layer.setTooltipContent(areaText);
          } else {
            layer.bindTooltip(areaText, {
              permanent: true,
              direction: 'center',
              className: 'measurement-tooltip'
            }).openTooltip();
          }
          
          // Обновляем popup
          if (layer.getPopup()) {
            layer.setPopupContent(`<strong>Площадь:</strong> ${areaText}`);
          } else {
            layer.bindPopup(`<strong>Площадь:</strong> ${areaText}`);
          }

          // Обновляем список маркеров внутри
          checkMarkersInShape(layer, 'Polygon');
        }
        else if (layer instanceof L.Circle) {
          // Обновляем для круга
          const radius = layer.getRadius();
          const area = Math.PI * radius * radius;
          const radiusText = formatDistance(radius);
          const areaText = formatArea(area);
          
          // Проверяем, есть ли tooltip, если нет - создаем
          if (layer.getTooltip()) {
            layer.setTooltipContent(`R: ${radiusText}<br/>S: ${areaText}`);
          } else {
            layer.bindTooltip(`R: ${radiusText}<br/>S: ${areaText}`, {
              permanent: true,
              direction: 'center',
              className: 'measurement-tooltip'
            }).openTooltip();
          }
          
          // Обновляем popup
          if (layer.getPopup()) {
            layer.setPopupContent(`<strong>Радиус:</strong> ${radiusText}<br/><strong>Площадь:</strong> ${areaText}`);
          } else {
            layer.bindPopup(`<strong>Радиус:</strong> ${radiusText}<br/><strong>Площадь:</strong> ${areaText}`);
          }

          // Обновляем список маркеров внутри
          checkMarkersInShape(layer, 'Circle');
        }
      });
    });

    map.on('pm:remove', (e) => {
      console.log('Удалена фигура:', e);
    });

    map.on('pm:cut', (e) => {
      console.log('Разрезана фигура:', e);
    });

    // Очистка при размонтировании
    return () => {
      map.pm.removeControls();
      map.off('pm:create');
      map.off('pm:remove');
      map.off('pm:edit');
      map.off('pm:cut');
    };
  }, [map]);

  return null;
}
