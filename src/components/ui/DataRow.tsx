import styles from "./DataRow.module.css";

interface DataRowProps {
  label: string;
  value: string;
  isUrl?: boolean;
}

export function DataRow({ label, value, isUrl = false }: DataRowProps) {
  return (
    <div className={styles.root}>
      <span className={styles.label}>{label}</span>
      {isUrl ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.link}
        >
          {value}
        </a>
      ) : (
        <span className={styles.value}>{value}</span>
      )}
    </div>
  );
}
