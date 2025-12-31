import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'
import { AppShell } from '@/components/AppShell'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <AppShell>
      {children}
    </AppShell>
  )
}

