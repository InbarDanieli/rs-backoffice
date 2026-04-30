import { AdminPageLayout } from "@/components/layout/AdminPageLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { ProfileSection } from "@/components/ui/ProfileSection";
import { getCurrentUser } from "@/lib/auth/dal";
import { canAccessRoute, isAdmin } from "@/lib/auth/permissions";
import { getActiveYear, listYears } from "@/lib/years";

const ProfileIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
  </svg>
);

const UsersIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const BriefcaseIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);

export default async function AdminDashboardPage() {
  const [user, years, activeYear] = await Promise.all([
    getCurrentUser(),
    listYears(),
    getActiveYear(),
  ]);

  const activeYearId = activeYear?.id ?? null;

  const navItems = [
    {
      label: "My Profile",
      href: "/admin/dashboard",
      icon: <ProfileIcon />,
      active: true,
    },
    ...(canAccessRoute("/admin/members", user.role)
      ? [{ label: "Team Members", href: "/admin/members", icon: <UsersIcon /> } as const]
      : []),
    ...(canAccessRoute("/admin/sponsors", user.role)
      ? [{ label: "Sponsors", href: "/admin/sponsors", icon: <BriefcaseIcon /> } as const]
      : []),
  ];

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
