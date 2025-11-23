import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";

export interface Discount {
  id: string;
  productId: string;
  discountPercentage: string | number;
  startDate: string | Date;
  endDate: string | Date;
  createdAt?: string | Date;
}

export async function getProductDiscount(productId: string): Promise<Discount | null> {
  try {
    const db = getFirestore();
    const discountsRef = collection(db, "discounts");
    const q = query(discountsRef, where("productId", "==", productId));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.docs.length > 0) {
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as Discount;
    }
  } catch (error) {
    console.error("Error fetching discount:", error);
  }
  return null;
}

export async function getAllDiscounts(): Promise<Discount[]> {
  try {
    const db = getFirestore();
    const discountsRef = collection(db, "discounts");
    const querySnapshot = await getDocs(discountsRef);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Discount[];
  } catch (error) {
    console.error("Error fetching all discounts:", error);
  }
  return [];
}

export function calculateDiscountedPrice(originalPrice: number, discountPercentage: number | string): number {
  const discount = parseFloat(String(discountPercentage));
  return originalPrice * (1 - discount / 100);
}

export function getDiscountAmount(originalPrice: number, discountPercentage: number | string): number {
  const discount = parseFloat(String(discountPercentage));
  return originalPrice * (discount / 100);
}

export function isDiscountActive(discount: Discount | null): boolean {
  if (!discount) return false;
  const now = new Date();
  
  // Convert to Date, handling Firestore Timestamp objects
  let start: Date;
  let end: Date;
  
  if (discount.startDate instanceof Date) {
    start = discount.startDate;
  } else if (typeof discount.startDate === 'string') {
    start = new Date(discount.startDate);
  } else if (discount.startDate && typeof discount.startDate === 'object' && 'toDate' in discount.startDate) {
    // Firestore Timestamp
    start = (discount.startDate as any).toDate();
  } else {
    start = new Date(String(discount.startDate));
  }
  
  if (discount.endDate instanceof Date) {
    end = discount.endDate;
  } else if (typeof discount.endDate === 'string') {
    end = new Date(discount.endDate);
  } else if (discount.endDate && typeof discount.endDate === 'object' && 'toDate' in discount.endDate) {
    // Firestore Timestamp
    end = (discount.endDate as any).toDate();
  } else {
    end = new Date(String(discount.endDate));
  }
  
  console.log("🔍 Discount check:", {
    productId: discount.productId,
    now: now.toISOString(),
    start: start.toISOString(),
    end: end.toISOString(),
    isActive: now >= start && now <= end
  });
  
  return now >= start && now <= end;
}

export function getActiveDiscount(productId: string, discounts: Discount[]): Discount | null {
  const discount = discounts.find((d) => String(d.productId) === String(productId));
  if (!discount || !isDiscountActive(discount)) return null;
  return discount;
}
