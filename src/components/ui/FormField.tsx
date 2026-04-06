import styles from "./FormField.module.css";

interface FormFieldProps {
  label: string;
  name: string;
  type?: "text" | "textarea";
  defaultValue?: string;
  placeholder?: string;
  hint?: string;
  rows?: number;
}

export function FormField({
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
  hint,
  rows = 5,
}: FormFieldProps) {
  return (
    <div className={styles.root}>
      <label htmlFor={name} className={styles.label}>
        {label}
      </label>
      {type === "textarea" ? (
        <textarea
          id={name}
          name={name}
          className={styles.textarea}
          defaultValue={defaultValue}
          placeholder={placeholder}
          rows={rows}
        />
      ) : (
        <input
          id={name}
          name={name}
          type="text"
          className={styles.input}
          defaultValue={defaultValue}
          placeholder={placeholder}
        />
      )}
      {hint && <p className={styles.hint}>{hint}</p>}
    </div>
  );
}
