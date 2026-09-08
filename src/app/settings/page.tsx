import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, ROLES } from "@/lib/auth/permissions";
import { isRootAdminEmail } from "@/lib/auth/root-admin";
import { emailConfigured, smsConfigured } from "@/lib/notify";
import {
  IntervalSettingsForm,
  ProjectIntervalRow,
  AddUserForm,
  UserRoleToggle,
  DeleteUserButton,
  CompanySettingsForm,
  ReminderSettingsForm,
} from "./SettingsForms";

export default async function SettingsPage() {
  const session = await requireAdmin();

  const [appSettings, projects, users] = await Promise.all([
    prisma.appSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } }),
    prisma.project.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="app-content narrow">
      <div>
        <h1>Settings</h1>
        <p className="muted">Service intervals, renewal alerts, and team accounts.</p>
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
          offerHsnCode: appSettings.offerHsnCode,
          offerSignatory: appSettings.offerSignatory,
          offerCityLine: appSettings.offerCityLine,
          offerStateLine: appSettings.offerStateLine,
          offerIntroText: appSettings.offerIntroText,
          offerContractTerm: appSettings.offerContractTerm,
          offerFooterNote: appSettings.offerFooterNote,
        }}
      />

      <ReminderSettingsForm
        emailReady={emailConfigured()}
        smsReady={smsConfigured()}
        initial={{
          reminderEmail: appSettings.reminderEmail,
          reminderPhone: appSettings.reminderPhone,
          reminderLeadDays: String(appSettings.reminderLeadDays),
        }}
      />

      <div className="card">
        <h2>Per-project interval overrides</h2>
        <p className="muted">
          Leave blank to use the default ({appSettings.defaultServiceIntervalDays} days).
        </p>
        <table>
          <thead>
            <tr className="muted">
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

      <div className="card">
        <h2>Team accounts</h2>
        <dl className="role-legend">
          {ROLES.map((role) => (
            <div key={role} className="form-actions">
              <dt className="field-label role-name">{ROLE_LABELS[role]}</dt>
              <dd>{ROLE_DESCRIPTIONS[role]}</dd>
            </div>
          ))}
        </dl>
        <table>
          <thead>
            <tr className="muted">
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
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td className="muted">{u.email}</td>
                  <td>
                    <UserRoleToggle userId={u.id} role={u.role} isSelf={isSelf} isOwner={isOwner} />
                  </td>
                  <td className="numeric">
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
