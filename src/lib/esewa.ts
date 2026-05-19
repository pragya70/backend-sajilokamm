import crypto from "crypto";

export function generateEsewaSignature(data: string, secret: string) {
  const hash = crypto.createHmac("sha256", secret).update(data).digest("base64");
  return hash;
}

export function buildEsewaPayload(amount: number, taskId: string) {
  const productCode = process.env.ESEWA_PRODUCT_CODE || "EPAYTEST";
  const secret = process.env.ESEWA_SECRET_KEY || "8gBm/:&EnhH.1/q";
  const gatewayUrl = process.env.ESEWA_GATEWAY_URL || "https://rc-epay.esewa.com.np/api/epay/main/v2/form";

  // Generate a unique transaction_uuid per attempt to avoid eSewa "Duplicate transaction UUID" errors.
  // Format: first 8 chars of taskId + current timestamp (alphanumeric+hyphen only)
  const timestamp = Date.now();
  const txUuid = `${taskId.replace(/-/g, "").slice(0, 8)}-${timestamp}`;

  const dataStr = `total_amount=${amount},transaction_uuid=${txUuid},product_code=${productCode}`;
  const signature = generateEsewaSignature(dataStr, secret);

  // Pass taskId via success/failure URLs so the callback knows which task to update
  const successUrl = `${process.env.NEXTAUTH_URL}/api/payments/esewa/success?taskId=${taskId}`;
  const failureUrl = `${process.env.NEXTAUTH_URL}/api/payments/esewa/failure?taskId=${taskId}`;

  const payload = {
    amount: String(amount),
    tax_amount: "0",
    total_amount: String(amount),
    transaction_uuid: txUuid,
    product_code: productCode,
    product_service_charge: "0",
    product_delivery_charge: "0",
    success_url: successUrl,
    failure_url: failureUrl,
    signed_field_names: "total_amount,transaction_uuid,product_code",
    signature,
  };

  return { gatewayUrl, payload };
}

export function verifyEsewaResponse(data: Record<string, string>): boolean {
  const secret = process.env.ESEWA_SECRET_KEY || "8gBm/:&EnhH.1/q";

  // signed_field_names tells us which fields to verify
  const signedFields = data.signed_field_names?.split(",") ?? [];
  const dataStr = signedFields.map((f) => `${f}=${data[f]}`).join(",");
  const expected = generateEsewaSignature(dataStr, secret);

  return data.signature === expected;
}
