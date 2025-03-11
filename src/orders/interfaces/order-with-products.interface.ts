import { $Enums } from "@prisma/client";

export interface OrderWithProducts {
 OrderItem: {
  name: any;
  productId: number;
  quantity: number;
  price: number;
 }[];
 id: string;
 totalAmount: number;
 totalItems: number;
 status: $Enums.OrderStatus;
 paid: boolean;
 paidAt: Date | null;
 createdAt: Date;
 updatedAt: Date;
}