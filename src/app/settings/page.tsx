import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";
import { IntervalSettingsForm, ProjectIntervalRow, AddUserForm, UserRoleToggle } from "./SettingsForms";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  const [appSettings, projects, users] = await Promise.all([
    prisma.appSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } }),
    prisma.project.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Service intervals, renewal alerts, and team accounts.</p>
      </div>

      <IntervalSettingsForm
        defaultServiceIntervalDays={appSettings.defaultServiceIntervalDays}
        renewalAlertLeadDays={appSettings.renewalAlertLeadDays}
      />

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-900">Per-project interval overrides</h2>
        <p className="mt-1 text-sm text-slate-500">
          Leave blank to use the default ({appSettings.defaultServiceIntervalDays} days).
        </p>
        <table className="mt-3 w-full text-left text-sm">
          <thead>
            <tr className="text-slate-500">
              <th className="pb-2">Project</th>
              <th className="pb-2">Interval (days)</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <ProjectIntervalRow key={p.id} id={p.id} name={p.name} override={p.serviceIntervalDaysOverride} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-900">Team accounts</h2>
        <table className="mt-3 w-full text-left text-sm">
          <thead>
            <tr className="text-slate-500">
              <th className="pb-2">Name</th>
              <th className="pb-2">Email</th>
              <th className="pb-2">Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="py-2 pr-4">{u.name}</td>
                <td className="py-2 pr-4 text-slate-500">{u.email}</td>
                <td className="py-2">
                  <UserRoleToggle userId={u.id} role={u.role} isSelf={u.id === session?.user.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <AddUserForm />
      </div>
    </div>
  );
}
