import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/layout-components/header/Header"


export default async function PreventistaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile || profile.role !== "preventista") {
    redirect("/auth/login")
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header profile={profile} />
      <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
        {children}
      </main>
    </div>
  )
}
