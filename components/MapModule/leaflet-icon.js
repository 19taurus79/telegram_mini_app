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

export const deliveryIcon = (color = "#ff5722", count = 1) => L.divIcon({
  className: "custom-delivery-icon",
  html: `<div style="position: relative; background-color: ${color}; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="1" y="3" width="15" height="13"></rect>
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
      <circle cx="5.5" cy="18.5" r="2.5"></circle>
      <circle cx="18.5" cy="18.5" r="2.5"></circle>
    </svg>
    ${count > 1 ? `
      <div style="
        position: absolute;
        top: -8px;
        right: -8px;
        background: #ef4444;
        color: white;
        border-radius: 10px;
        padding: 2px 6px;
        font-size: 10px;
        font-weight: bold;
        border: 2px solid white;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        z-index: 1000;
      ">
        ${count}
      </div>
    ` : ''}
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [1, -16],
});