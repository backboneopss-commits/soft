import { getCurrentUser } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import OnboardingNotice from "@/components/OnboardingNotice";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, organization, email } = await getCurrentUser();

  // Usuario registrado pero todavía sin cliente asignado.
  if (!organization) {
    return <OnboardingNotice email={email ?? ""} userId={profile.id} />;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        role={profile.role}
        orgName={organization.name}
        fullName={profile.full_name ?? email ?? "Usuario"}
      />
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
