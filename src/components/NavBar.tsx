import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { ROLE_LABELS, isAdmin } from "@/lib/auth/permissions";
import SignOutButton from "./SignOutButton";

export default async function NavBar() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const admin = isAdmin(session.user.role);

  // Every signed-in role can reach these; what they can *do* inside is decided per page by the
  // permission helpers, not by hiding tabs.
  const tabs = [
    { href: "/", label: "Dashboard" },
    { href: "/projects", label: "Projects" },
    { href: "/complaints", label: "Complaints" },
    { href: "/offers", label: "AMC Offers" },
    { href: "/history", label: "Service History" },
  ];

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-6">
          <Link href="/" className="font-semibold text-slate-900">
            AMC Tracker
          </Link>
          <nav className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
            {tabs.map((tab) => (
              <Link key={tab.href} href={tab.href} className="hover:text-slate-900">
                {tab.label}
              </Link>
            ))}
            {admin && (
              <Link href="/upload" className="hover:text-slate-900">
                Upload
              </Link>
            )}
            {admin && (
              <Link href="/settings" className="hover:text-slate-900">
                Settings
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span>
            {session.user.name}
            <span className="ml-1 text-xs text-slate-400">({ROLE_LABELS[session.user.role]})</span>
          </span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
