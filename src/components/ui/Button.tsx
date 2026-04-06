import styles from "./Button.module.css";

type ButtonVariant = "solid" | "ghost";

interface ButtonProps {
  variant?: ButtonVariant;
  children: React.ReactNode;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  onClick?: () => void;
}

export function Button({
  variant = "solid",
  children,
  type = "button",
  disabled,
  onClick,
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${styles.root} ${styles[variant]}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
