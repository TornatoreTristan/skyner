import { Head } from '@inertiajs/react'
import AppLayout from '~/components/layouts/app_layout'

interface HomeProps {
  user: {
    id: string
    email: string
    fullName: string | null
  }
}

export default function Home({ user }: HomeProps) {
  return (
    <AppLayout>
      <Head title="Homepage" />
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Welcome back!</h1>
          <p className="text-muted-foreground mt-2">
            Hello, <span className="font-semibold">{user.fullName || user.email}</span>
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border bg-card p-6">
            <h3 className="font-semibold mb-2">Quick Stats</h3>
            <p className="text-sm text-muted-foreground">
              Your dashboard statistics will appear here
            </p>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <h3 className="font-semibold mb-2">Recent Activity</h3>
            <p className="text-sm text-muted-foreground">
              Your recent activities will appear here
            </p>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <h3 className="font-semibold mb-2">Notifications</h3>
            <p className="text-sm text-muted-foreground">
              Your notifications will appear here
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
