import FileUploadForm from '@/components/Admin/FileUploadForm';
import styles from './UploadPage.module.css';

export default function UploadPage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Загрузка данных</h1>
      <FileUploadForm />
    </div>
  );
}
