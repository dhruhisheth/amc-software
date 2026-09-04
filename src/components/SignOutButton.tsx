"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button className="small" onClick={() => signOut({ callbackUrl: "/login" })}>
      Sign out
    </button>
  );
}
