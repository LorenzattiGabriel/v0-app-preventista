import { PageLoading } from "@/components/shared/page-loading"

// Cascadea a todas las rutas anidadas de este rol que no tengan su propio loading.tsx
export default function Loading() {
  return <PageLoading />
}
