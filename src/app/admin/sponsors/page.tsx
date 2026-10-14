import { getCurrentUser } from "@/lib/auth/dal";
import { isAdmin } from "@/lib/auth/permissions";
import { listYears, getActiveYear } from "@/lib/years";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { buildAdminNav } from "@/components/layout/adminNav";
import { AdminPageLayout } from "@/components/layout/AdminPageLayout";
import { SponsorsClient } from "./SponsorsClient";

export default async function SponsorsPage() {
  const [user, years, activeYear] = await Promise.all([
    getCurrentUser(),
    listYears(),
    getActiveYear(),
  ]);

  const activeYearId = activeYear?.id ?? null;

  const navItems = buildAdminNav(user.role, "/admin/sponsors");

  const subtitle = activeYear
    ? `Managing sponsors for ${activeYear.name}.`
    : "No year is set up yet. Create a year using the selector in the sidebar.";

  return (
    <AdminPageLayout
      sidebar={<AdminSidebar navItems={navItems} years={years} activeYearId={activeYearId} canManageYears={isAdmin(user.role)} />}
      title="Sponsors"
      subtitle={subtitle}
      maxWidth="56rem"
    >
      {activeYear ? (
        <SponsorsClient yearId={activeYear.id} />
      ) : (
        <div />
      )}
    </AdminPageLayout>
  );
}
