"use client"

import { useState } from "react"
import { Customer } from "@/types/customer"
import CustomersTable from "./customers-table"
import CustomerDetailsPopup from "./customer-details-popup"

type CustomersClientProps = {
  customers: Customer[]
}

export function CustomersClient({ customers }: CustomersClientProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  return (
    <>
      <CustomersTable customers={customers} onSelectCustomer={setSelectedCustomer} />

      {selectedCustomer && 
        <CustomerDetailsPopup 
            customer={selectedCustomer} 
            onClose={() => setSelectedCustomer(null)} />
      } 
    </>
  )
}




