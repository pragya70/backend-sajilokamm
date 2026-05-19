const KHALTI_BASE = process.env.KHALTI_GATEWAY_URL || "https://dev.khalti.com/api/v2";
// Key should be just the secret value — we prepend "Key " in the header
const KHALTI_KEY = (process.env.KHALTI_SECRET_KEY || "").replace(/^Key\s+/i, "");

export async function initiateKhaltiPayment({
  taskId,
  taskTitle,
  amountNPR,
  customerName,
  customerEmail,
  customerPhone,
  returnUrlPath,
}: {
  taskId: string;
  taskTitle: string;
  amountNPR: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  returnUrlPath?: string; // Optional custom return URL path
}) {
  const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
  // Khalti sandbox rejects localhost return_url — use a publicly accessible URL
  // In production set NEXTAUTH_URL to your real domain
  // For local dev, use a tunnel like ngrok or set KHALTI_RETURN_URL override
  const returnBase = process.env.KHALTI_RETURN_URL || base;
  
  // Use custom return URL path if provided, otherwise use default callback
  const returnUrl = returnUrlPath 
    ? `${returnBase}${returnUrlPath}`
    : `${returnBase}/api/payments/khalti/callback?taskId=${taskId}`;

  const body = {
    return_url: returnUrl,
    website_url: returnBase,
    amount: Math.round(amountNPR * 100), // paisa
    purchase_order_id: taskId,
    purchase_order_name: taskTitle.slice(0, 100),
    customer_info: {
      name: customerName,
      email: customerEmail,
      phone: customerPhone || "9800000000",
    },
  };

  console.log("Khalti initiate request:", JSON.stringify({ ...body, key: KHALTI_KEY.slice(0, 8) + "..." }));

  const res = await fetch(`${KHALTI_BASE}/epayment/initiate/`, {
    method: "POST",
    headers: {
      Authorization: `Key ${KHALTI_KEY}`,
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true", // Skip ngrok warning page
    },
    body: JSON.stringify(body),
  });

  const responseText = await res.text();
  console.log("Khalti initiate response:", res.status, responseText);

  if (!res.ok) {
    let errMsg = responseText;
    try { errMsg = JSON.stringify(JSON.parse(responseText)); } catch {}
    throw new Error(errMsg);
  }

  return JSON.parse(responseText) as { pidx: string; payment_url: string; expires_at: string };
}

export async function lookupKhaltiPayment(pidx: string) {
  const res = await fetch(`${KHALTI_BASE}/epayment/lookup/`, {
    method: "POST",
    headers: {
      Authorization: `Key ${KHALTI_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ pidx }),
  });

  const responseText = await res.text();
  console.log("Khalti lookup response:", res.status, responseText);

  if (!res.ok) {
    throw new Error(responseText);
  }

  return JSON.parse(responseText) as {
    pidx: string;
    total_amount: number;
    status: string;
    transaction_id: string | null;
    fee: number;
    refunded: boolean;
  };
}

/**
 * Initiate a Khalti transfer/payout to a tasker
 * Note: This is a placeholder. Khalti's standard API doesn't include public payout endpoints.
 * You would need to:
 * 1. Contact Khalti to get access to their merchant transfer API
 * 2. Or use Khalti's bulk transfer feature via their merchant dashboard
 * 3. Or implement manual processing through admin panel
 */
export async function initiateKhaltiTransfer({
  phone,
  amountNPR,
  remarks,
}: {
  phone: string;
  amountNPR: number;
  remarks: string;
}) {
  // TODO: Implement when Khalti provides transfer API access
  // This would typically require:
  // - Merchant account with transfer privileges
  // - Different API endpoint (e.g., /api/v2/transfer/)
  // - Additional authentication/verification
  
  console.log("[KHALTI TRANSFER] Placeholder - would transfer:", {
    phone,
    amountNPR,
    remarks,
  });

  throw new Error(
    "Khalti transfer API not yet implemented. Please process payouts manually through Khalti merchant dashboard or contact Khalti for API access."
  );

  // Example implementation when API is available:
  // const res = await fetch(`${KHALTI_BASE}/transfer/`, {
  //   method: "POST",
  //   headers: {
  //     Authorization: `Key ${KHALTI_KEY}`,
  //     "Content-Type": "application/json",
  //   },
  //   body: JSON.stringify({
  //     phone,
  //     amount: Math.round(amountNPR * 100), // paisa
  //     remarks,
  //   }),
  // });
  //
  // const responseText = await res.text();
  // if (!res.ok) throw new Error(responseText);
  //
  // return JSON.parse(responseText) as {
  //   transaction_id: string;
  //   status: string;
  // };
}
