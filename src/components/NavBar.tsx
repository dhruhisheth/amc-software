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
    ...(admin
      ? [
          { href: "/upload", label: "Upload" },
          { href: "/settings", label: "Settings" },
        ]
      : []),
  ];

  return (
    <header className="app-header">
      <Link href="/" className="app-title-link">
        <span className="app-title">Dhruvisha HVAC</span>
      </Link>
      <nav className="app-nav">
        {tabs.map((tab) => (
          <Link key={tab.href} href={tab.href} className="nav-tab">
            {tab.label}
          </Link>
        ))}
      </nav>
      <div className="header-menu">
        <span className="actor-badge">
          {session.user.name} <span className="actor-role">({ROLE_LABELS[session.user.role]})</span>
        </span>
        <SignOutButton />
      </div>
    </header>
  );
}
