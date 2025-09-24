"use client";
import { useRouter } from "next/navigation";
import css from "./BackBtn.module.css";

interface BackBtnProps {
  onBack?: () => void; // необязательный пропс - функция обратного вызова
}

const BackBtn: React.FC<BackBtnProps> = ({ onBack }) => {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <button className={css.backButton} onClick={handleBack}>
      Назад
    </button>
  );
};

export default BackBtn;
