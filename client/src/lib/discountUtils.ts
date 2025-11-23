export async function getProductDiscount(productId: string) {
  try {
    const response = await fetch(`/api/discounts/${productId}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error("Error fetching discount:", error);
  }
  return null;
}

export function calculateDiscountedPrice(originalPrice: number, discountPercentage: number | string): number {
  const discount = parseFloat(String(discountPercentage));
  return originalPrice * (1 - discount / 100);
}

export function getDiscountAmount(originalPrice: number, discountPercentage: number | string): number {
  const discount = parseFloat(String(discountPercentage));
  return originalPrice * (discount / 100);
}
