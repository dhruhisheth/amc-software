import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, ROLES } from "@/lib/auth/permissions";
import { isRootAdminEmail } from "@/lib/auth/root-admin";
import {
  IntervalSettingsForm,
  ProjectIntervalRow,
  AddUserForm,
  UserRoleToggle,
  DeleteUserButton,
  CompanySettingsForm,
} from "./SettingsForms";

export default async function SettingsPage() {
  const session = await requireAdmin();

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

      <CompanySettingsForm
        initial={{
          companyName: appSettings.companyName,
          companyAddress: appSettings.companyAddress,
          companyPhone: appSettings.companyPhone,
          companyEmail: appSettings.companyEmail,
          offerTaxPercent: String(appSettings.offerTaxPercent),
          offerTermsText: appSettings.offerTermsText,
        }}
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
        <dl className="mt-2 space-y-1 text-xs text-slate-500">
          {ROLES.map((role) => (
            <div key={role} className="flex gap-2">
              <dt className="w-24 shrink-0 font-medium text-slate-700">{ROLE_LABELS[role]}</dt>
              <dd>{ROLE_DESCRIPTIONS[role]}</dd>
            </div>
          ))}
        </dl>
        <table className="mt-4 w-full text-left text-sm">
          <thead>
            <tr className="text-slate-500">
              <th className="pb-2">Name</th>
              <th className="pb-2">Email</th>
              <th className="pb-2">Role</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isOwner = isRootAdminEmail(u.email);
              const isSelf = u.id === session.user.id;
              return (
                <tr key={u.id} className="border-t border-slate-100">
                  <td className="py-2 pr-4">{u.name}</td>
                  <td className="py-2 pr-4 text-slate-500">{u.email}</td>
                  <td className="py-2 pr-4">
                    <UserRoleToggle userId={u.id} role={u.role} isSelf={isSelf} isOwner={isOwner} />
                  </td>
                  <td className="py-2 text-right">
                    <DeleteUserButton userId={u.id} name={u.name} isSelf={isSelf} isOwner={isOwner} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <AddUserForm />
      </div>
    </div>
  );
}
