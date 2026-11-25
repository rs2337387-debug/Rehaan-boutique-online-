export const DESIGN_CATEGORIES = [
  'Bridal Blouse',
  'Designer Blouse',
  'Suits',
  'Lehenga',
  'Embroidery',
  'New Collection',
] as const;

export type DesignCategory = (typeof DESIGN_CATEGORIES)[number];

export const ORDER_STATUSES = [
  'New Order',
  'Confirmed',
  'Stitching',
  'Ready',
  'Shipped',
  'Delivered',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const SIZE_OPTIONS = [
  'XS (32)',
  'S (34)',
  'M (36)',
  'L (38)',
  'XL (40)',
  'XXL (42)',
  'Custom Measurements',
] as const;

export interface DesignItem {
  id: string;
  name: string;
  category: DesignCategory;
  price: number | null;
  description: string;
  imageUrl: string;
  videoUrl: string | null;
  isFeatured: boolean;
  createdAt: string;
}

export interface MediaItem {
  id: string;
  title: string;
  mediaType: 'image' | 'video';
  url: string;
  category: DesignCategory;
  createdAt: string;
}

export interface OrderRecord {
  id: string;
  orderCode: string;
  customerName: string;
  phone: string;
  address: string;
  designId: string | null;
  designName: string;
  size: string;
  customInstructions: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OrderReceipt {
  orderCode: string;
  customerName: string;
  designName: string;
  size: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface AdminAuthStatus {
  configured: boolean;
  envOverride: boolean;
}
