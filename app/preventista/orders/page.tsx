import { redirect } from 'next/navigation'

/**
 * Preventista Orders Index Page
 * Redirects to the orders list
 */
export default function PreventistaOrdersPage() {
  redirect('/preventista/orders/list')
}

