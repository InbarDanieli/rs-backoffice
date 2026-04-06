import { AdminPageLayout } from "@/components/layout/AdminPageLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { getSession } from "@/lib/session";
import { USER_PROFILE_SECTIONS } from "@/lib/user-profile-fields";
import { findUserById } from "@/lib/users";
import { getActiveYear, listYears } from "@/lib/years";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import styles from "./view.module.css";

const ROLE_LABELS: Record<string, string> = {
  "team-member": "Team Member",
  admin: "Admin",
  "sponsor-manager": "Sponsor Manager",
};

const ProfileIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
  </svg>
);

const UsersIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const BriefcaseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function MemberViewPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const { userId } = await params;
  
  const [user, years, activeYear] = await Promise.all([
    findUserById(userId),
    listYears(),
    getActiveYear(),
  ]);
  
  const activeYearId = activeYear?.id ?? null;

  if (!user) notFound();

  const navItems = [
    { label: "My Profile", href: "/admin/dashboard", icon: <ProfileIcon /> },
    { label: "Team Members", href: "/admin/members", icon: <UsersIcon />, active: true },
    { label: "Sponsors", href: "/admin/sponsors", icon: <BriefcaseIcon /> },
  ];

  return (
    <AdminPageLayout
      sidebar={<AdminSidebar navItems={navItems} years={years} activeYearId={activeYearId} />}
      backLink={{ href: "/admin/members", label: "Team Members" }}
      actions={
        <Link href={`/admin/members/${userId}/edit`} className={styles.editLink}>
          Edit Profile
        </Link>
      }
      maxWidth="64rem"
    >
          <div className={styles.grid}>
            {/* ── Profile card ── */}
            <div className={styles.profileCard}>
              <div className={styles.avatarWrap}>
                {user.picture ? (
                  <Image
                    src={user.picture}
                    alt={user.name || user.email}
                    width={80}
                    height={80}
                    className={styles.avatar}
                    unoptimized={!user.picture.startsWith("http")}
                  />
                ) : (
                  <div className={styles.avatarFallback}>
                    {(user.name || user.email)[0].toUpperCase()}
                  </div>
                )}
              </div>
              <p className={styles.cardName}>{user.name || "—"}</p>
              <p className={styles.cardEmail}>{user.email}</p>
              <span className={styles.rolePill}>
                {ROLE_LABELS[user.role] ?? user.role}
              </span>
            </div>

            {/* ── Fields ── */}
            <div className={styles.fieldsCard}>
              {USER_PROFILE_SECTIONS.map((section) => (
                <div key={section.id} className={styles.section}>
                  {section.label && (
                    <div className={styles.sectionHeader}>
                      <span className={styles.sectionLabel}>{section.label}</span>
                    </div>
                  )}
                  <div className={styles.fieldGrid}>
                    {section.fields.map((field) => {
                      const value = user[field.name as keyof typeof user];
                      const text = typeof value === "string" ? value : "";
                      return (
                        <div
                          key={field.name}
                          className={`${styles.fieldItem} ${field.half ? "" : styles.fieldFull}`}
                        >
                          <span className={styles.fieldLabel}>{field.label}</span>
                          <span className={`${styles.fieldValue} ${!text ? styles.fieldEmpty : ""}`}>
                            {text || "—"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
    </AdminPageLayout>
  );
}
