import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY || "placeholder");
}

export async function sendMagicLink(email: string, token: string) {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify?token=${token}`;
  const company = process.env.NEXT_PUBLIC_COMPANY_NAME || "IA Corporativa";
  const from = process.env.RESEND_FROM || `${company} <onboarding@resend.dev>`;

  const resend = getResend();
  const { error } = await resend.emails.send({
    from,
    to: email,
    subject: `Tu enlace de acceso a ${company}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1e3a5f; font-size: 24px;">${company}</h1>
          </div>
          <p>Has solicitado acceso a la IA corporativa.</p>
          <p>Haz clic en el siguiente enlace para acceder. Este enlace es válido durante <strong>15 minutos</strong>.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${url}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
              Acceder a ${company}
            </a>
          </div>
          <p style="color: #666; font-size: 13px;">Si no has solicitado este acceso, ignora este correo. Por seguridad, no compartas este enlace.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            ${company} — Uso exclusivo corporativo<br>
            Este sistema cumple con el Reglamento General de Protección de Datos (RGPD).
          </p>
        </body>
      </html>
    `,
  });

  if (error) {
    console.error("Resend error:", JSON.stringify(error));
    throw new Error(`Resend: ${error.message}`);
  }
}
