import L from "leaflet";

export const customIcon = new L.Icon({
  iconUrl: "/images/marker-icon.png",
  iconRetinaUrl: "/images/marker-icon-2x.png",
  shadowUrl: "/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export const clientIcon = new L.Icon({
  iconUrl: "/images/client.png",
  // iconRetinaUrl: "/images/marker-icon-2x.png",
  // shadowUrl: "/images/marker-shadow.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [1, -34],
  // shadowSize: [41, 41],
});

export const warehouseIcon = new L.Icon({
  iconUrl: "/images/warehouse.png", // <--- Укажите путь к иконке склада
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});