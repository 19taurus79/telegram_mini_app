import readExcelFile from "../../readFile";
import FileUpload from "../FileUpload/FileUpload";
// import css from "./topData.module.css";
import { useUploadFilesStore } from "../../store/uploadFilesStore";
import fetchGeocode from "../../geocode";
import css from "./topData.module.css";
// import { useDisplayAddressStore } from "../../store/displayAddress";
import { useGeocodeStore } from "../../store/geocodData";
import { useState } from "react";
export default function TopData() {
  const { files, rawFiles } = useUploadFilesStore();
  const { setGeocodeData } = useGeocodeStore();
  const [activeIndex, setActiveIndex] = useState(null);
  console.log("rawFiles", rawFiles);
  console.log("files", files);
  const handleAddressClick = async (item, index) => {
    const data = await fetchGeocode(item.address);
    console.log(data);
    setGeocodeData(data);
    setActiveIndex(index);
  };
  return (
    <div>
      <FileUpload onFileSelected={readExcelFile} />

      {files.length > 0 && (
        <div className={css.container}>
          <h2 className={css.title}>Завантажені адреси:</h2>
          <ul className={css.list}>
            {files.map((file, index) => (
              <li
                className={`${css.listItem} ${
                  index === activeIndex ? css.listItemActive : ""
                }`}
                key={index}
                onClick={() => handleAddressClick(file, index)}
              >
                {file.address}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
