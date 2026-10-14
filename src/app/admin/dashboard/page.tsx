import { AdminPageLayout } from "@/components/layout/AdminPageLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { buildAdminNav } from "@/components/layout/adminNav";
import { ProfileSection } from "@/components/ui/ProfileSection";
import { getCurrentUser } from "@/lib/auth/dal";
import { isAdmin } from "@/lib/auth/permissions";
import { getActiveYear, listYears } from "@/lib/years";

export default async function AdminDashboardPage() {
  const [user, years, activeYear] = await Promise.all([
    getCurrentUser(),
    listYears(),
    getActiveYear(),
  ]);

  const activeYearId = activeYear?.id ?? null;

  const navItems = buildAdminNav(user.role, "/admin/dashboard");

  return (
    <AdminPageLayout
      sidebar={
        <AdminSidebar
          navItems={navItems}
          years={years}
          activeYearId={activeYearId}
          canManageYears={isAdmin(user.role)}
        />
      }
      title="My Info"
      subtitle="Update your professional credentials and personal biography to maintain accurate records across the administrative ledger."
    >
      <ProfileSection
        userId={user.id}
        name={user.name}
        email={user.email}
        picture={user.picture}
        role={user.role}
        defaultValues={{
          name: user.name,
          company: user.company,
          title: user.title,
          bio: user.bio,
          linkedin: user.linkedin,
          x: user.x,
          bluesky: user.bluesky,
          facebook: user.facebook,
          instagram: user.instagram,
          youtube: user.youtube,
          github: user.github,
          medium: user.medium,
          website: user.website,
        }}
      />
    </AdminPageLayout>
  );
}
