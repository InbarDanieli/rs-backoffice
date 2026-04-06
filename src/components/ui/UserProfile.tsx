import Image from "next/image";
import styles from "./UserProfile.module.css";

type UserProfileVariant = "row" | "card";

interface UserProfileProps {
  name: string;
  email: string;
  picture?: string;
  variant?: UserProfileVariant;
}

export function UserProfile({
  name,
  email,
  picture,
  variant = "row",
}: UserProfileProps) {
  return (
    <div className={`${styles.root} ${styles[variant]}`}>
      {picture && (
        <div className={styles.avatarWrap}>
          <Image
            src={picture}
            alt={name}
            width={80}
            height={80}
            className={styles.avatar}
          />
        </div>
      )}
      <div className={styles.info}>
        <p className={styles.name}>{name}</p>
        <p className={styles.email}>{email}</p>
      </div>
    </div>
  );
}
