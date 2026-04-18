import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSession } from "@/lib/session";
import {
  assertAdminPageAccess,
  isAdmin,
  shouldShowMembersNav,
} from "@/lib/admin-authorization";
import { findSponsorById } from "@/lib/sponsors";
import { findUserById } from "@/lib/users";
import { listYears, getActiveYear } from "@/lib/years";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { AdminPageLayout } from "@/components/layout/AdminPageLayout";
import { SponsorEditClient } from "./SponsorEditClient";

interface PageProps {
  params: Promise<{ sponsorId: string }>;
}

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

export default async function SponsorEditPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const { sponsorId } = await params;
  const [currentUser, sponsor, years, activeYear] = await Promise.all([
    findUserById(session.userId),
    findSponsorById(sponsorId),
    listYears(),
    getActiveYear(),
  ]);

  if (!currentUser) notFound();
  assertAdminPageAccess("/admin/sponsors", currentUser.role);

  if (!sponsor) notFound();

  const activeYearId = activeYear?.id ?? null;

  const navItems = [
    { label: "My Profile", href: "/admin/dashboard", icon: <ProfileIcon /> },
    ...(shouldShowMembersNav(currentUser.role)
      ? [{ label: "Team Members", href: "/admin/members", icon: <UsersIcon /> } as const]
      : []),
    {
      label: "Sponsors",
      href: "/admin/sponsors",
      icon: <BriefcaseIcon />,
      active: true,
    },
  ];

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
      maxWidth="64rem"
    >
      <SponsorEditClient
        sponsor={sponsor}
        saveEndpoint={`/api/sponsors/${sponsor.id}`}
      />
    </AdminPageLayout>
  );
}
