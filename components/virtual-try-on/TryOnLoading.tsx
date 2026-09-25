import styles from "./tryOn.module.css";

export default function TryOnLoading() {
  return (
    <div className={styles.loading} role="status">
      <div className={styles.sheen} aria-hidden="true" />
      <p className={styles.loadingTitle}>Creating your look...</p>
      <p className={styles.loadingSub}>Please wait.</p>
    </div>
  );
}
