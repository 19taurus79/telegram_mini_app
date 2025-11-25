import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

export default function HeatmapLayer({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length === 0) return;

    // Create heatmap layer
    const heatLayer = L.heatLayer(points, {
      radius: 25,
      blur: 15,
      maxZoom: 13,
      gradient: {
        0.0: 'blue',
        0.5: 'lime',
        0.7: 'yellow',
        1.0: 'red'
      }
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
