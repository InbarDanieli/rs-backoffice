import Image from "next/image";
import styles from "./Logo.module.css";

type LogoSize = "sm" | "md" | "lg";
type LogoLayout = "vertical" | "horizontal";

interface LogoProps {
  size?: LogoSize;
  showTagline?: boolean;
  layout?: LogoLayout;
}

export function Logo({
  size = "md",
  showTagline = true,
  layout = "vertical",
}: LogoProps) {
  return (
    <div className={`${styles.root} ${styles[size]} ${styles[layout]}`}>
      <div className={styles.icon}>
        <Image
          src="/logo-icon.png"
          alt="Reversim Summit Backoffice"
          width={64}
          height={64}
          className={styles.iconImage}
          priority
        />
      </div>

      <div className={styles.wordmark}>
        <span className={styles.name}>Reversim Summit Backoffice</span>
        {showTagline && (
          <span className={styles.tagline}>
            Small place for us — the team to manage the conference information
          </span>
        )}
      </div>
    </div>
  );
}
