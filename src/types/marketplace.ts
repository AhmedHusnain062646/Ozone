export type UserRole = 'buyer' | 'seller' | 'admin';

export type OrderStatus =
  | 'PLACED'
  | 'PAID'
  | 'PACKED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'RETURN_REQUESTED'
  | 'RETURNED'
  | 'REFUNDED'
  | 'CANCELLED';

export interface AtelierSeller {
  id: string;
  name: string;
  tagline: string;
  location: string;
  commissionRate: number; // e.g. 0.12 (12%)
  status: 'active' | 'pending_approval' | 'suspended';
  rating: number;
  totalSalesCount: number;
  joinedDate: string;
  bannerDescription: string;
  verifiedAtelier: boolean;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  priceDelta: number;
  stock: number;
  reservedStock: number; // temporarily reserved under 10-min hold
}

export interface ProductReview {
  id: string;
  buyerName: string;
  rating: number;
  date: string;
  title: string;
  comment: string;
  verifiedPurchase: boolean;
}

export interface Product {
  id: string;
  title: string;
  sellerId: string;
  category: 'Timepieces' | 'Interiors' | 'Fragrance' | 'Fashion' | 'Art & Objects' | 'Audio';
  basePrice: number;
  shortDescription: string;
  description: string;
  material: string;
  origin: string;
  images: string[];
  variants: ProductVariant[];
  rating: number;
  reviewCount: number;
  reviews: ProductReview[];
  limitedEdition?: boolean;
  lowStockThreshold: number;
  isPublished: boolean;
}

export interface CartItem {
  productId: string;
  variantId: string;
  quantity: number;
  reservationId?: string;
  reservedUntil?: number; // timestamp
}

export interface InventoryReservation {
  id: string;
  productId: string;
  variantId: string;
  quantity: number;
  buyerSessionId: string;
  expiresAt: number; // timestamp (10 mins TTL)
  status: 'active' | 'converted' | 'expired';
}

export interface OrderTimelineEvent {
  status: OrderStatus;
  timestamp: string;
  actor: string;
  actorRole: UserRole;
  note?: string;
}

export interface SubOrder {
  id: string; // e.g. OZ-8849-VSP
  sellerId: string;
  sellerName: string;
  items: {
    productId: string;
    productTitle: string;
    variantId: string;
    variantName: string;
    sku: string;
    unitPrice: number;
    quantity: number;
    subtotal: number;
  }[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  commissionRate: number;
  commissionAmount: number;
  sellerPayoutAmount: number;
  status: OrderStatus;
  statusHistory: OrderTimelineEvent[];
  trackingNumber?: string;
  returnReason?: string;
  refundApprovedByAdmin?: boolean;
}

export interface ParentOrder {
  id: string; // e.g. OZ-8849-MULTI
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  createdAt: string;
  subOrders: SubOrder[];
  totalAmount: number;
  paymentMethod: 'sandbox_card' | 'ozone_escrow' | 'cod';
  paymentStatus: 'PAID' | 'PENDING_COD' | 'REFUNDED';
  idempotencyKey: string;
  shippingAddress: {
    fullName: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

export interface LedgerEntry {
  id: string;
  timestamp: string;
  orderId: string;
  subOrderId: string;
  sellerId: string;
  sellerName: string;
  type: 'sale_credit' | 'platform_commission' | 'payout_disbursement' | 'refund_debit';
  grossAmount: number;
  commissionAmount: number;
  netSellerAmount: number;
  status: 'settled' | 'pending' | 'disbursed';
}

export interface CategoryDefinition {
  id: string;
  name: string;
  description: string;
  itemCount: number;
}
