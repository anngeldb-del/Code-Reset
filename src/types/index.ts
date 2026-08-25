export type ProjectStatus = "cotizado" | "activo" | "pausado" | "completado" | "cancelado";

export type PaymentMethod = "efectivo" | "transferencia" | "tarjeta" | "otro";

export type DocStatus = "borrador" | "enviada" | "aceptada" | "rechazada";

export interface Client {
  id: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Project {
  id: string;
  clientId: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  startDate?: string;
  endDate?: string;
  budgetTotal: number;
  currency: string;
  createdAt: number;
  updatedAt: number;
}

export interface Payment {
  id: string;
  projectId: string;
  clientId: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  note?: string;
  receiptNumber: string;
  createdAt: number;
}

export interface QuotationItem {
  description: string;
  brand?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
}

export interface CommercialTerms {
  paymentTerms?: string;
  deliveryTime?: string;
  warranty?: string;
  installation?: string;
  transport?: string;
}

export interface Quotation extends CommercialTerms {
  id: string;
  folio: string;
  clientId: string;
  projectName: string;
  description?: string;
  attentionTo?: string;
  validUntil?: string;
  items: QuotationItem[];
  total: number;
  currency: string;
  ivaApplies: boolean;
  status: DocStatus;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface PurchaseOrderItem {
  description: string;
  brand?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
}

export interface PurchaseOrder extends CommercialTerms {
  id: string;
  folio: string;
  supplierName: string;
  supplierContact?: string;
  description?: string;
  validUntil?: string;
  items: PurchaseOrderItem[];
  total: number;
  currency: string;
  ivaApplies: boolean;
  status: DocStatus;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}
