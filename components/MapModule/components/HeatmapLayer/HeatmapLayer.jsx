import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

export default function HeatmapLayer({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length === 0) return;

    // Find max intensity to scale colors properly
    const maxWeight = Math.max(...points.map(p => p[2] || 0));
    const intensityMax = maxWeight > 0 ? maxWeight : 1.5;

    // Create heatmap layer
    const heatLayer = L.heatLayer(points, {
      radius: 35, 
      blur: 20, 
      maxZoom: 17, 
      max: intensityMax, 
      gradient: {
        0.0: '#0000ff',    // Ярко-синий
        0.2: '#00ffff',    // Циан
        0.4: '#00ff00',    // Зеленый
        0.6: '#ffff00',    // Желтый
        0.8: '#ff8000',    // Оранжевый
        1.0: '#ff0000'     // Красный
      },
      minOpacity: 0.5 
    });

    // Add to map
    heatLayer.addTo(map);

    // Cleanup on unmount
    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points]);

  return null;
}
