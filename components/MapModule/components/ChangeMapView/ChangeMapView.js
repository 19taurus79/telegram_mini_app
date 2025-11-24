import { useMap } from "react-leaflet";
import { useEffect } from "react";

function ChangeMapView({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center);
    }
  }, [center, map]);
  return null;
}
export default ChangeMapView;
