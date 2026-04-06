import { BackgroundGrid } from "@/components/layout/BackgroundGrid";
import { Card } from "@/components/ui/Card";
import { GoogleSignInButton } from "@/components/ui/GoogleSignInButton";
import styles from "./unauthorized.module.css";

export default function UnauthorizedPage() {
  return (
    <div className={styles.page}>
      <BackgroundGrid />

      <main className={styles.main}>
        <Card className={styles.card}>
          <div className={styles.inner}>
            <div className={styles.iconWrap} aria-hidden="true">
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>

            <div className={styles.textGroup}>
              <h1 className={styles.title}>Not Authorized</h1>
              <p className={styles.body}>
                Your account does not have access to this admin panel.
                Contact a team member if you believe this is a mistake.
              </p>
            </div>

            <GoogleSignInButton href="/admin/login" label="Back to login" />
          </div>
        </Card>
      </main>
    </div>
  );
}
