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
  iconSize: [24, 24],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  // shadowSize: [41, 41],
});

export const warehouseIcon = new L.Icon({
  iconUrl: "/images/warehouse.png", // <--- Укажите путь к иконке склада
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});