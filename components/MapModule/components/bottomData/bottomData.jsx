import { useDisplayAddressStore } from "../../store/displayAddress";
import { useGeocodeStore } from "../../store/geocodData";
import { useUploadFilesStore } from "../../store/uploadFilesStore";

import css from "./bottomData.module.css";

export default function BottomData() {
  const { setAddressData } = useDisplayAddressStore();
  const { geocodeData } = useGeocodeStore();
  const { files, rawFiles } = useUploadFilesStore();
  
  if (!geocodeData || geocodeData.length === 0) return null;

  return (
    <div className={css.container}>
      <h2 className={css.title}>Дані з геокодування:</h2>
      <ul className={css.list}>
        {geocodeData.map((item, index) => (
          <li key={index} className={css.listItem}>
            <p
              className={css.addressText}
              onClick={() => {
                console.log(item);
                setAddressData(item);
              }}
            >
              Address: {item.display_name}
            </p>
            <p className={css.infoText}>Latitude: {item.lat}</p>
            <p className={css.infoText}>Longitude: {item.lon}</p>
            {/* <button
              className={css.button}
              onClick={() => {
                console.log(item);
                console.log("Оброблені файли", files);
                console.log("Не оброблені файли", rawFiles);
              }}
            >
              Select
            </button> */}
          </li>
        ))}
      </ul>
    </div>
  );
}
