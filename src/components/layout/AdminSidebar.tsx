import { Logo } from "@/components/ui/Logo";
import { YearSelector, type YearOption } from "@/components/ui/YearSelector";
import styles from "./AdminSidebar.module.css";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  active?: boolean;
}

interface AdminSidebarProps {
  navItems: NavItem[];
  years: YearOption[];
  activeYearId: string | null;
  signOutHref?: string;
}

export function AdminSidebar({
  navItems,
  years,
  activeYearId,
  signOutHref = "/api/auth/logout",
}: AdminSidebarProps) {
  return (
    <aside className={styles.root}>
      <div className={styles.header}>
        <Logo size="sm" layout="horizontal" showTagline={false} />
        <span className={styles.consoleBadge}>Admin Console</span>
      </div>

      <div className={styles.yearSection}>
        <YearSelector years={years} activeYearId={activeYearId} />
      </div>

      <nav className={styles.nav} aria-label="Main navigation">
        {navItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={`${styles.navItem} ${item.active ? styles.active : ""}`}
            aria-current={item.active ? "page" : undefined}
          >
            <span className={styles.navIcon} aria-hidden="true">
              {item.icon}
            </span>
            <span className={styles.navLabel}>{item.label}</span>
          </a>
        ))}
      </nav>

      <div className={styles.footer}>
        <a href={signOutHref} className={styles.logout}>
          <LogoutIcon />
          <span>Logout</span>
        </a>
      </div>
    </aside>
  );
}

function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
