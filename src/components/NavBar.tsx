import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import SignOutButton from "./SignOutButton";

export default async function NavBar() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const isAdmin = session.user.role === "ADMIN";

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold text-slate-900">
            AMC Tracker
          </Link>
          <nav className="flex items-center gap-4 text-sm text-slate-600">
            <Link href="/" className="hover:text-slate-900">
              Dashboard
            </Link>
            <Link href="/projects" className="hover:text-slate-900">
              Projects
            </Link>
            {isAdmin && (
              <Link href="/upload" className="hover:text-slate-900">
                Upload
              </Link>
            )}
            {isAdmin && (
              <Link href="/settings" className="hover:text-slate-900">
                Settings
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span>{session.user.name}</span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
