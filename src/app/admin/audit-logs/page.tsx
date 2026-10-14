import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth/dal";
import { isAdmin } from "@/lib/auth/permissions";
import { listAuditActors } from "@/lib/audit";
import { listYears, getActiveYear } from "@/lib/years";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { buildAdminNav } from "@/components/layout/adminNav";
import { AdminPageLayout } from "@/components/layout/AdminPageLayout";
import { AuditLogsClient } from "./AuditLogsClient";

export default async function AuditLogsPage() {
  const [user, years, activeYear, actors] = await Promise.all([
    getCurrentUser(),
    listYears(),
    getActiveYear(),
    listAuditActors(),
  ]);

  const navItems = buildAdminNav(user.role, "/admin/audit-logs");

  return (
    <AdminPageLayout
      sidebar={<AdminSidebar navItems={navItems} years={years} activeYearId={activeYear?.id ?? null} canManageYears={isAdmin(user.role)} />}
      title="Audit Logs"
      subtitle="Every change and sign-in across the backoffice: who did it, what changed, and when. Entries are kept for one year."
      maxWidth="72rem"
    >
      {/* useSearchParams needs a Suspense boundary for production builds. */}
      <Suspense fallback={null}>
        <AuditLogsClient actors={actors} />
      </Suspense>
    </AdminPageLayout>
  );
}
