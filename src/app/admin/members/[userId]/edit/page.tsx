import { AdminPageLayout } from "@/components/layout/AdminPageLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { buildAdminNav } from "@/components/layout/adminNav";
import { getCurrentUser } from "@/lib/auth/dal";
import { isAdmin } from "@/lib/auth/permissions";
import { findUserById } from "@/lib/users";
import { getActiveYear, listYears } from "@/lib/years";
import { notFound } from "next/navigation";
import { MemberEditClient } from "./MemberEditClient";

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function MemberEditPage({ params }: PageProps) {
  const { userId } = await params;

  const [currentUser, user, years, activeYear] = await Promise.all([
    getCurrentUser(),
    findUserById(userId),
    listYears(),
    getActiveYear(),
  ]);
  const activeYearId = activeYear?.id ?? null;

  if (!user) notFound();

  const navItems = buildAdminNav(currentUser.role, "/admin/members");

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
      backLink={{ href: "/admin/members", label: "Team Members" }}
      title={`Edit: ${user.name || user.email}`}
      subtitle="Update this member's profile information and role."
    >
      <MemberEditClient
        userId={userId}
        name={user.name || user.email}
        email={user.email}
        picture={user.picture ?? ""}
        role={user.role}
        canEditEmail={isAdmin(currentUser.role)}
        defaultValues={{
          name: user.name ?? "",
          company: user.company ?? "",
          title: user.title ?? "",
          bio: user.bio ?? "",
          linkedin: user.linkedin ?? "",
          x: user.x ?? "",
          bluesky: user.bluesky ?? "",
          facebook: user.facebook ?? "",
          instagram: user.instagram ?? "",
          youtube: user.youtube ?? "",
          github: user.github ?? "",
          medium: user.medium ?? "",
          website: user.website ?? "",
        }}
      />
    </AdminPageLayout>
  );
}
