import { Head } from '@inertiajs/react'

interface HomeProps {
  user: {
    id: string
    email: string
    fullName: string | null
  }
}

export default function Home({ user }: HomeProps) {
  return (
    <>
      <Head title="Homepage" />
      <div className="flex flex-col justify-center items-center p-8 space-y-4">
        <h1 className="text-3xl font-bold">Welcome to Boilerplate</h1>
        <div className="text-center">
          <p className="text-lg">
            Hello, <span className="font-semibold">{user.fullName || user.email}</span>!
          </p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>
    </>
  )
}
