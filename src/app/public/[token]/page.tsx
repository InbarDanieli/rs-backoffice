import { Logo } from "@/components/ui/Logo";
import { findSponsorByToken } from "@/lib/sponsors";
import { SponsorEditClient } from "@/app/admin/sponsors/[sponsorId]/edit/SponsorEditClient";
import styles from "./public.module.css";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function PublicSponsorPage({ params }: PageProps) {
  const { token } = await params;
  const sponsor = await findSponsorByToken(token);

  const isExpired =
    !sponsor ||
    (sponsor.publicTokenExpiresAt != null &&
      new Date(sponsor.publicTokenExpiresAt) < new Date());

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        {isExpired ? (
          <div className={styles.expiredCard}>
            <div className={styles.expiredIcon} aria-hidden="true">🔗</div>
            <h1 className={styles.expiredTitle}>Link expired or not found</h1>
            <p className={styles.expiredDesc}>
              This link is no longer valid. Please contact the event organizers to request a new link.
            </p>
          </div>
        ) : (
          <>
            <div className={styles.intro}>
              <h1 className={styles.title}>Edit your sponsor profile</h1>
              <p className={styles.subtitle}>
                Fill in your company information for <strong>{sponsor!.name}</strong>. Your changes are saved automatically when you click Save.
              </p>
            </div>
            <SponsorEditClient
              sponsor={sponsor!}
              isPublic
              saveEndpoint={`/api/public/${token}`}
            />
          </>
        )}
      </main>
    </div>
  );
}
