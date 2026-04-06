import { BackgroundGrid } from "@/components/layout/BackgroundGrid";
import { PageFooter } from "@/components/layout/PageFooter";
import { Card } from "@/components/ui/Card";
import { GoogleSignInButton } from "@/components/ui/GoogleSignInButton";
import { Logo } from "@/components/ui/Logo";
import styles from "./login.module.css";

export default function AdminLoginPage() {
  return (
    <div className={styles.page}>
      <BackgroundGrid />

      <main className={styles.main}>
        <div className={styles.inner}>
          <Logo size="lg" showTagline />

          <Card className={styles.card}>
            <div className={styles.cardInner}>
              <div className={styles.cardHeader}>
                <h1 className={styles.cardTitle}>Welcome back</h1>
                <p className={styles.cardSubtitle}>
                  Access your administrative console
                </p>
              </div>
              <GoogleSignInButton href="/api/auth/google" />
            </div>
          </Card>
        </div>
      </main>

      <PageFooter copyright="All rights reserved Reversim" />
    </div>
  );
}
