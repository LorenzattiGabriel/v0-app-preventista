import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-muted/40">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Error de Autenticación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {params?.error ? (
              <p className="text-sm text-muted-foreground">Código de error: {params.error}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Ocurrió un error no especificado.</p>
            )}
            <Button asChild className="w-full">
              <Link href="/auth/login">Volver al inicio de sesión</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
