import { Navbar } from '@/components/layout/navbar'

export default function DashboardPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">Welcome to your dashboard.</p>
      </main>
    </>
  )
}
