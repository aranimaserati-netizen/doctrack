import Link from 'next/link'
import { signOut } from '@/lib/actions/auth'
import { SubmitButton } from '@/components/submit-button'
import { buttonVariants } from '@/components/ui/button'

type NavLink = { href: string; label: string }

export function AppShell({
  brand,
  homeHref,
  email,
  links,
  action,
  children,
}: {
  brand: string
  homeHref: string
  email: string
  links: NavLink[]
  action?: NavLink
  children: React.ReactNode
}) {
  return (
    <div className="relative isolate min-h-screen">
      {/* Landmark image + soft white wash so text stays readable */}
      <div
        aria-hidden
        className="fixed inset-0 -z-20 bg-slate-200 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/landmark.png')" }}
      />
      <div aria-hidden className="fixed inset-0 -z-10 bg-white/20" />

      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-white/70 px-6 py-3 backdrop-blur-sm">
        <nav className="flex items-center gap-6">
          <Link href={homeHref} className="text-xl font-extrabold tracking-tight hover:text-blue-700">
            {brand}
          </Link>
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm font-medium hover:underline">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {action && (
            <Link href={action.href} className={buttonVariants({ size: 'sm' })}>
              {action.label}
            </Link>
          )}
          <form action={signOut} className="flex items-center gap-3">
            {/* <span className="hidden text-sm text-muted-foreground md:inline">{email}</span> */}
            <SubmitButton variant="outline" size="sm" pendingText="Signing out…">
              Sign out
            </SubmitButton>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 md:p-6">
        <div className="rounded-xl bg-white/60 p-6 shadow-lg backdrop-blur-[2px]">{children}</div>
      </main>
    </div>
  )
}