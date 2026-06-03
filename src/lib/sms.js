export async function sendSMS(to, text) {
  const token = process.env.SPARROW_SMS_TOKEN;
  const from = process.env.SPARROW_SMS_SENDER || "EasyTasker";

  if (!token || token === "your_token_here") {
    console.log(`[MOCK SMS to ${to}]: ${text}`);
    return { success: true, mock: true };
  }

  try {
    const url = `http://api.sparrowsms.com/v2/sms/?token=${token}&from=${from}&to=${to}&text=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.response_code === 200) {
      return { success: true, data };
    } else {
      console.error("SMS Sending Failed:", data);
      return { success: false, error: data };
    }
  } catch (error) {
    console.error("SMS Error:", error);
    return { success: false, error };
  }
}

export function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
