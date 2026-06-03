const KHALTI_BASE = process.env.KHALTI_GATEWAY_URL || "https://dev.khalti.com/api/v2";
const KHALTI_KEY = (process.env.KHALTI_SECRET_KEY || "").replace(/^Key\s+/i, "");

export async function initiateKhaltiPayment({
  taskId,
  taskTitle,
  amountNPR,
  customerName,
  customerEmail,
  customerPhone,
  returnUrlPath,
}) {
  const base = process.env.NEXTAUTH_URL || "http://localhost:4000";
  const returnBase = process.env.KHALTI_RETURN_URL || base;
  const returnUrl = returnUrlPath
    ? `${returnBase}${returnUrlPath}`
    : `${returnBase}/api/payments/khalti/callback?taskId=${taskId}`;

  const body = {
    return_url: returnUrl,
    website_url: returnBase,
    amount: Math.round(amountNPR * 100),
    purchase_order_id: taskId,
    purchase_order_name: taskTitle.slice(0, 100),
    customer_info: {
      name: customerName,
      email: customerEmail,
      phone: customerPhone || "9800000000",
    },
  };

  const res = await fetch(`${KHALTI_BASE}/epayment/initiate/`, {
    method: "POST",
    headers: {
      Authorization: `Key ${KHALTI_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const responseText = await res.text();
  if (!res.ok) throw new Error(responseText);
  return JSON.parse(responseText);
}

export async function lookupKhaltiPayment(pidx) {
  const res = await fetch(`${KHALTI_BASE}/epayment/lookup/`, {
    method: "POST",
    headers: {
      Authorization: `Key ${KHALTI_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ pidx }),
  });

  const responseText = await res.text();
  if (!res.ok) throw new Error(responseText);
  return JSON.parse(responseText);
}
