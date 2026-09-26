import styles from "./tryOn.module.css";

interface Props {
  disabled: boolean;
  loading: boolean;
  label: string;
  hint?: string | null;
  onClick: () => void;
}

export default function TryOnButton({ disabled, loading, label, hint, onClick }: Props) {
  return (
    <div className={styles.actions}>
      <button
        type="button"
        className={styles.primaryButton}
        disabled={disabled}
        aria-busy={loading}
        onClick={onClick}
      >
        {loading ? "Creating your look..." : label}
      </button>
      {hint && <p className={styles.hint}>{hint}</p>}
    </div>
  );
}
