import type { CustomerType, IvaCondition } from "@/lib/types/database";

export type Customer = {
    id: string;
    code: string;
    commercial_name: string;
    contact_name: string;
    phone: string;
    email?: string | null;

    street: string;
    street_number: string;
    floor_apt?: string | null;
    locality: string;
    province: string;
    postal_code?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    
    legal_name?: string | null;
    tax_id?: string | null;
    customer_type: CustomerType;
    iva_condition?: IvaCondition | null;
    
    credit_days: number;
    credit_limit: number;
    general_discount: number;
    
    zone_id?: string | null;
    created_by?: string | null;
    
    observations?: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;

    // Optional relations
    zones?: { name: string } | null;
};