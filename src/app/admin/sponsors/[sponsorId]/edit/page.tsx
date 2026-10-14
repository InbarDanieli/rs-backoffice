import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { isAdmin } from "@/lib/auth/permissions";
import { findSponsorById } from "@/lib/sponsors";
import { listYears, getActiveYear } from "@/lib/years";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { buildAdminNav } from "@/components/layout/adminNav";
import { AdminPageLayout } from "@/components/layout/AdminPageLayout";
import { SponsorEditClient } from "./SponsorEditClient";

interface PageProps {
  params: Promise<{ sponsorId: string }>;
}

export default async function SponsorEditPage({ params }: PageProps) {
  const { sponsorId } = await params;
  const [currentUser, sponsor, years, activeYear] = await Promise.all([
    getCurrentUser(),
    findSponsorById(sponsorId),
    listYears(),
    getActiveYear(),
  ]);

  if (!sponsor) notFound();

  const activeYearId = activeYear?.id ?? null;

  const navItems = buildAdminNav(currentUser.role, "/admin/sponsors");

  return (
    <AdminPageLayout
      sidebar={
        <AdminSidebar
          navItems={navItems}
          years={years}
          activeYearId={activeYearId}
          canManageYears={isAdmin(currentUser.role)}
        />
      }
      title={sponsor.name}
      subtitle="Edit sponsor profile"
      backLink={{ href: "/admin/sponsors", label: "Sponsors" }}
    >
      <SponsorEditClient
        sponsor={sponsor}
        saveEndpoint={`/api/sponsors/${sponsor.id}`}
      />
    </AdminPageLayout>
  );
}
