'use client'
import { PaymentGatewaysTab } from '@/components/admin/payment-gateways-tab'
export default function PlatformBillingPage() {
  return <div className="space-y-4"><h1 className="text-2xl font-bold">Billing & Payments</h1><PaymentGatewaysTab /></div>
}
