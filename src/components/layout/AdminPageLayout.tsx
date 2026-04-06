import Link from "next/link";
import styles from "./AdminPageLayout.module.css";

interface AdminPageLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  backLink?: { href: string; label: string };
  actions?: React.ReactNode;
  maxWidth?: string;
}

export function AdminPageLayout({
  sidebar,
  children,
  title,
  subtitle,
  backLink,
  actions,
  maxWidth = "60rem",
}: AdminPageLayoutProps) {
  return (
    <div className={styles.page}>
      {sidebar}
      <main className={styles.main}>
        <div className={styles.content} style={{ maxWidth }}>
          {(backLink || actions) && (
            <div className={styles.topBar}>
              {backLink && (
                <Link href={backLink.href} className={styles.backLink}>
                  <BackIcon />
                  {backLink.label}
                </Link>
              )}
              {actions && <div className={styles.actions}>{actions}</div>}
            </div>
          )}

          {(title || subtitle) && (
            <div className={styles.header}>
              {title && <h1 className={styles.title}>{title}</h1>}
              {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
            </div>
          )}

          {children}
        </div>
      </main>
    </div>
  );
}

function BackIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
