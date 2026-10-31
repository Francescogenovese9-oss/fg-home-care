import Image from "next/image";
import Link from "next/link";
import LogoutButton from "@/components/auth/LogoutButton";
import NotificationBell, { type NotificationPreview } from "@/components/notifications/NotificationBell";
import { createClient } from "@/lib/supabase/server";

const publicLinks = [
  { href: "/chi-siamo", label: "Chi siamo" },
  { href: "/servizi", label: "Servizi" },
  { href: "/professionisti", label: "Professionisti" },
  { href: "/videoconsulti", label: "Videoconsulti" },
  { href: "/contatti", label: "Contatti" },
];

const roleLinks = {
  PROFESSIONAL: [
    { href: "/dashboard/professional", label: "Dashboard" },
    { href: "/professionisti", label: "Marketplace" },
    { href: "/dashboard/professional/calendar", label: "Agenda" },
    { href: "/dashboard/professional/earnings", label: "Incassi" },
    { href: "/dashboard/professional/reviews", label: "Recensioni" },
    { href: "/dashboard/professional/payments", label: "Pagamenti" },
  ],
  PATIENT: [
    { href: "/dashboard/patient", label: "Dashboard" },
    { href: "/professionisti", label: "Cerca professionisti" },
    { href: "/dashboard/patient/appointments", label: "Prenotazioni" },
  ],
  ADMIN: [
    { href: "/dashboard/admin", label: "Dashboard" },
    { href: "/dashboard/admin/finance", label: "Finanza" },
    { href: "/dashboard/admin/reviews", label: "Moderazione" },
    { href: "/professionisti", label: "Marketplace" },
  ],
} as const;

export default async function Header() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let role: keyof typeof roleLinks | null = null;
  let unreadCount = 0;
  let notifications: NotificationPreview[] = [];

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.role === "PROFESSIONAL" || profile?.role === "PATIENT" || profile?.role === "ADMIN") {
      role = profile.role;
    }
    const [{ count }, { data }] = await Promise.all([
      supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("read", false),
      supabase.from("notifications").select("id, type, title, message, link, read, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
    ]);
    unreadCount = count ?? 0;
    notifications = (data ?? []) as NotificationPreview[];
  }

  const links = role ? roleLinks[role] : publicLinks;
  return (
    <header className="relative z-50 border-b border-slate-100 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3 sm:px-6 lg:min-h-[104px] lg:flex-nowrap lg:justify-between">
        <Link href="/" className="flex shrink-0 items-center" aria-label="FG Home Care - Home">
          <Image src="/images/logo.png" alt="FG Home Care" width={300} height={110} priority className="h-auto w-[175px] object-contain sm:w-[205px] xl:w-[235px]" />
        </Link>
        <nav className="order-3 flex w-full items-center gap-x-4 gap-y-2 overflow-x-auto py-2 text-sm font-semibold text-slate-700 lg:order-2 lg:w-auto lg:min-w-0 lg:flex-1 lg:justify-center lg:gap-x-4 xl:gap-x-5" aria-label={role ? "Navigazione account" : "Navigazione principale"}>
          {links.map(({ href, label }) => (
            <Link key={href} href={href} className="shrink-0 whitespace-nowrap rounded-lg px-1 py-2 transition hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
              {label}
            </Link>
          ))}
        </nav>
        <div className="order-2 ml-auto flex shrink-0 items-center gap-2 lg:order-3">
          {user && role ? (
            <>
              <NotificationBell userId={user.id} initialUnreadCount={unreadCount} initialNotifications={notifications} />
              <Link href="/dashboard/change-password" className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 transition hover:bg-blue-100 sm:text-sm">Modifica password</Link>
              <LogoutButton />
            </>
          ) : user ? (
            <LogoutButton />
          ) : (
            <>
              <Link href="/login" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 sm:px-4">Accedi</Link>
              <Link href="/register" className="rounded-xl bg-blue-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 sm:px-4">Registrati</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
