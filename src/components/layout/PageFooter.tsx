import styles from "./PageFooter.module.css";

interface FooterLink {
  label: string;
  href: string;
}

interface PageFooterProps {
  copyright?: string;
  links?: FooterLink[];
}

export function PageFooter({ copyright, links }: PageFooterProps) {
  if (copyright && !links) {
    return (
      <footer className={styles.root}>
        <span className={styles.copyright}>{copyright}</span>
      </footer>
    );
  }

  return (
    <footer className={styles.root}>
      {links?.map((link, i) => (
        <>
          {i > 0 && <span key={`dot-${i}`} className={styles.dot} aria-hidden="true" />}
          <a key={link.href + link.label} href={link.href} className={styles.link}>
            {link.label}
          </a>
        </>
      ))}
      {copyright && <span className={styles.copyright}>{copyright}</span>}
    </footer>
  );
}
