import { getCurrentUser } from "@/lib/auth/dal";
import { isAdmin } from "@/lib/auth/permissions";
import { listYears, getActiveYear } from "@/lib/years";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { buildAdminNav } from "@/components/layout/adminNav";
import { AdminPageLayout } from "@/components/layout/AdminPageLayout";
import { MembersClient } from "./MembersClient";
import styles from "./members.module.css";

export default async function MembersPage() {
  const [user, years, activeYear] = await Promise.all([
    getCurrentUser(),
    listYears(),
    getActiveYear(),
  ]);

  const activeYearId = activeYear?.id ?? null;

  const navItems = buildAdminNav(user.role, "/admin/members");

  const subtitle = activeYear
    ? `Managing members for ${activeYear.name}${activeYear.isDefault ? " (default year)" : ""}. Only members listed here can log into the backoffice when this year is set as default.`
    : "No year is set up yet. Create a year using the selector in the sidebar to start managing team members.";

  return (
    <AdminPageLayout
      sidebar={<AdminSidebar navItems={navItems} years={years} activeYearId={activeYearId} canManageYears={isAdmin(user.role)} />}
      title="Team Members"
      subtitle={subtitle}
      maxWidth="48rem"
    >
      {activeYear ? (
        <MembersClient yearId={activeYear.id} currentUserId={user.id} />
      ) : (
        <div className={styles.emptyState} />
      )}
    </AdminPageLayout>
  );
}
