import styles from "./DataTable.module.css";

interface DataTableProps {
  title: string;
  children: React.ReactNode;
}

export function DataTable({ title, children }: DataTableProps) {
  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <span className={styles.title}>{title}</span>
      </div>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
