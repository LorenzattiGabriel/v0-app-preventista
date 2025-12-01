import { redirect } from 'next/navigation'

/**
 * Repartidor Orders Index Page
 * Redirects to the dashboard where orders/routes are listed
 */
export default function RepartidorOrdersPage() {
  redirect('/repartidor/dashboard')
}

