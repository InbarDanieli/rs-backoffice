import { AvatarEditor } from "./AvatarEditor";
import styles from "./ProfileCard.module.css";

interface ProfileCardProps {
  name: string;
  email: string;
  picture?: string;
  role?: string;
  onImageChange?: (dataUrl: string) => void;
}

export function ProfileCard({
  name,
  email,
  picture,
  role = "Admin",
  onImageChange,
}: ProfileCardProps) {
  return (
    <div className={styles.root}>
      <AvatarEditor src={picture ?? ""} alt={name || email} onImageChange={onImageChange} />
      <div className={styles.info}>
        <p className={styles.name}>{name}</p>
        <p className={styles.email}>{email}</p>
      </div>
      <div className={styles.badge}>
        <span className={styles.badgeDot} aria-hidden="true" />
        {role} Role
      </div>
    </div>
  );
}
