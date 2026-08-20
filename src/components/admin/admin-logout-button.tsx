"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminLogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      /* continua mesmo se a rede falhar */
    }
    router.push("/login");
    router.refresh();
    setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={() => void handleLogout()}
      disabled={loading}
      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
    >
      {loading ? "Saindo…" : "Sair"}
    </button>
  );
}
