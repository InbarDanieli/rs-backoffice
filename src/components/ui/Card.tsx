import styles from "./Card.module.css";

type CardPadding = "default" | "lg";

interface CardProps {
  children: React.ReactNode;
  padding?: CardPadding;
  className?: string;
}

export function Card({ children, padding = "default", className }: CardProps) {
  const paddingClass = padding === "lg" ? styles["padded-lg"] : styles.padded;

  return (
    <div className={`${styles.root} ${paddingClass}${className ? ` ${className}` : ""}`}>
      {children}
    </div>
  );
}
