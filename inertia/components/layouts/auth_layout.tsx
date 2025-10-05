import { ReactNode } from 'react'
import { Head } from '@inertiajs/react'
import { ThemeToggle } from '~/components/theme_toggle'

interface AuthLayoutProps {
  children: ReactNode
  title: string
}

export default function AuthLayout({ children, title }: AuthLayoutProps) {
  return (
    <>
      <Head title={title} />
      <div className="min-h-screen flex items-center justify-center">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md">{children}</div>
      </div>
    </>
  )
}
