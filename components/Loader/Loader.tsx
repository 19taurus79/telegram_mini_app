import React from "react";
import { HashLoader } from "react-spinners";

interface LoaderProps {
  size?: number;
  color?: string;
}

const Loader: React.FC<LoaderProps> = ({ size = 50, color = "#36d7b7" }) => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
        minHeight: "200px", // Ensure it takes up some space
        width: "100%",
      }}
    >
      <HashLoader color={color} size={size} />
    </div>
  );
};

export default Loader;
