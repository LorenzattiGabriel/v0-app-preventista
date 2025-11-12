import { Customer } from "@/types/customer";
import { Button } from "../ui/button";
import { Building, Calendar, CircleDollarSign, Info, Mail, MapPin, Phone, UserCircle, X } from "lucide-react";
import Link from "next/link";

type CustomerDetailsPopupProps = {
  customer: Customer
  onClose: () => void
}

export default function CustomerDetailsPopup({ customer, onClose }: CustomerDetailsPopupProps) {
    
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] bg-card text-card-foreground rounded-lg shadow-xl m-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b rounded-t">
          <div>
            <h3 className="text-xl font-semibold" id="modal-title">
              {customer.commercial_name}
            </h3>
            <p className="text-sm text-muted-foreground">{customer.code}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
            <span className="sr-only">Cerrar</span>
          </Button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Contact Info */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <UserCircle className="h-5 w-5 text-primary" />
              Información de Contacto
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm border p-4 rounded-md">
              <div>
                <p className="font-semibold">Nombre de Contacto:</p>
                <p className="text-muted-foreground">{customer.contact_name}</p>
              </div>
              <div>
                <p className="font-semibold">Teléfono:</p>
                <p className="text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {customer.phone}
                </p>
              </div>
              <div>
                <p className="font-semibold">Email:</p>
                <p className="text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {customer.email || "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Address Info */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" />Dirección</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm border p-4 rounded-md">
              <div><p className="font-semibold">Calle y Número:</p><p className="text-muted-foreground">{customer.street} {customer.street_number}</p></div>
              <div><p className="font-semibold">Piso/Dpto:</p><p className="text-muted-foreground">{customer.floor_apt || 'N/A'}</p></div>
              <div><p className="font-semibold">Localidad:</p><p className="text-muted-foreground">{customer.locality}</p></div>
              <div><p className="font-semibold">Provincia:</p><p className="text-muted-foreground">{customer.province}</p></div>
              <div><p className="font-semibold">Código Postal:</p><p className="text-muted-foreground">{customer.postal_code || 'N/A'}</p></div>
              <div><p className="font-semibold">Zona:</p><p className="text-muted-foreground">{customer.zone_name || 'N/A'}</p></div>
            </div>
          </div>

          {/* Business Info */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2"><Building className="h-5 w-5 text-primary" />Información Fiscal</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm border p-4 rounded-md">
              <div><p className="font-semibold">Razón Social:</p><p className="text-muted-foreground">{customer.legal_name || 'N/A'}</p></div>
              <div><p className="font-semibold">CUIT/CUIL:</p><p className="text-muted-foreground">{customer.tax_id || 'N/A'}</p></div>
              <div><p className="font-semibold">Tipo de Cliente:</p><p className="text-muted-foreground capitalize">{customer.customer_type}</p></div>
              <div><p className="font-semibold">Condición IVA:</p><p className="text-muted-foreground capitalize">{customer.iva_condition?.replace(/_/g, ' ') || 'N/A'}</p></div>
            </div>
          </div>

          {/* Credit Info */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2"><CircleDollarSign className="h-5 w-5 text-primary" />Información Crediticia</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm border p-4 rounded-md">
              <div><p className="font-semibold">Días de Crédito:</p><p className="text-muted-foreground">{customer.credit_days}</p></div>
              <div><p className="font-semibold">Límite de Crédito:</p><p className="text-muted-foreground">${customer.credit_limit.toLocaleString('es-AR')}</p></div>
              <div><p className="font-semibold">Descuento General:</p><p className="text-muted-foreground">{customer.general_discount}%</p></div>
            </div>
          </div>

          {/* Other Info */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2"><Info className="h-5 w-5 text-primary" />Otros Datos</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm border p-4 rounded-md">
              <div>
                <p className="font-semibold">Estado:</p>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${customer.is_active ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400" : "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400"}`}
                >
                  {customer.is_active ? "Activo" : "Inactivo"}
                </span>
              </div>
              <div>
                <p className="font-semibold flex items-center gap-1"><Calendar className="h-3 w-3"/>Fecha de Alta:</p>
                <p className="text-muted-foreground">{new Date(customer.created_at).toLocaleDateString('es-AR')}</p>
              </div>
              {customer.observations && (
                <div className="md:col-span-2">
                  <p className="font-semibold">Observaciones:</p>
                  <p className="text-muted-foreground whitespace-pre-wrap">{customer.observations}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-4 border-t rounded-b space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          <Button asChild>
            <Link href={`/preventista/customers/${customer.id}/edit`}>Editar Cliente</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}