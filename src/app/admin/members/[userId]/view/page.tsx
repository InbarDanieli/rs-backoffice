import { AdminPageLayout } from "@/components/layout/AdminPageLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { buildAdminNav } from "@/components/layout/adminNav";
import { getCurrentUser } from "@/lib/auth/dal";
import { isAdmin } from "@/lib/auth/permissions";
import { USER_PROFILE_SECTIONS } from "@/lib/user-profile-fields";
import { findUserById } from "@/lib/users";
import { getActiveYear, listYears } from "@/lib/years";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "./view.module.css";

const ROLE_LABELS: Record<string, string> = {
  "team-member": "Team Member",
  admin: "Admin",
  "sponsor-manager": "Sponsor Manager",
};

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function MemberViewPage({ params }: PageProps) {
  const { userId } = await params;

  const [currentUser, user, years, activeYear] = await Promise.all([
    getCurrentUser(),
    findUserById(userId),
    listYears(),
    getActiveYear(),
  ]);

  if (!user) notFound();

  const activeYearId = activeYear?.id ?? null;

  const navItems = buildAdminNav(currentUser.role, "/admin/members");

  return (
    <AdminPageLayout
      sidebar={<AdminSidebar navItems={navItems} years={years} activeYearId={activeYearId} canManageYears={isAdmin(currentUser.role)} />}
      backLink={{ href: "/admin/members", label: "Team Members" }}
      actions={
        <Link href={`/admin/members/${userId}/edit`} className={styles.editLink}>
          Edit Profile
        </Link>
      }
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
