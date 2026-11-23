import { login } from './actions'
import { SubmitButton } from '@/components/submit-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  return (
    <main
      className="relative flex min-h-screen items-center justify-start bg-slate-900 bg-cover bg-center px-4 md:px-[8%]"
      style={{ backgroundImage: "url('/images/login-cover.png')" }}
    >
      <div aria-hidden className="absolute inset-0 bg-black/20" />
      <Card className="relative w-full max-w-lg shrink-0 self-center border border-white/30 bg-white/20 py-10 text-white shadow-2xl backdrop-blur-sm">
        <CardHeader className="px-10">
          {/* <p className="text-sm font-semibold uppercase tracking-widest text-blue-300">DocFlow</p> */}
          <CardTitle className="text-3xl font-bold text-white">Sign in to your account</CardTitle>
          {/* <p className="text-white/80">Review, comment on and approve your documents.</p> */}
        </CardHeader>
        <CardContent className="px-10">
          <form action={login} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-base text-white">Email</Label>
              <Input id="email" name="email" type="email" required className="h-12 bg-white/80 text-base text-slate-900" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-base text-white">Password</Label>
              <Input id="password" name="password" type="password" required className="h-12 bg-white/80 text-base text-slate-900" />
            </div>
            {error && <p className="text-sm font-medium text-red-300">{error}</p>}
            <SubmitButton className="h-12 w-full text-base" pendingText="Signing in…">
              Sign in
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}