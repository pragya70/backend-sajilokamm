// Platform fee configuration
export const PLATFORM_FEE_PERCENT = 10; // 10%

export function calculateFees(amount) {
  const platformFee = Math.round(amount * PLATFORM_FEE_PERCENT) / 100;
  const taskerPayout = Math.round((amount - platformFee) * 100) / 100;
  return { platformFee, taskerPayout };
}
