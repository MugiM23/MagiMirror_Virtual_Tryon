import styles from "./tryOn.module.css";

interface Props {
  disabled: boolean;
  loading: boolean;
  hint?: string | null;
  onClick: () => void;
}

export default function TryOnButton({ disabled, loading, hint, onClick }: Props) {
  return (
    <div className={styles.actions}>
      <button
        type="button"
        className={styles.primaryButton}
        disabled={disabled}
        aria-busy={loading}
        onClick={onClick}
      >
        {loading ? "Creating your look..." : "Try This Outfit"}
      </button>
      {hint && <p className={styles.hint}>{hint}</p>}
    </div>
  );
}
