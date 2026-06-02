import { prisma } from './prisma';
import nodemailer from 'nodemailer';

export async function sendEmail({
  to,
  templateType,
  variables = {}
}: {
  to: string | string[];
  templateType: string;
  variables?: Record<string, string>;
}) {
  try {
    // Override destination for testing as requested
    const destination = 'gbessone.hdb@gmail.com';

    // Get SMTP configuration
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM_NAME', 'SMTP_FROM_EMAIL', 'SMTP_SECURE']
        }
      }
    });

    const smtpConfig = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>);

    if (!smtpConfig.SMTP_HOST || !smtpConfig.SMTP_USER || !smtpConfig.SMTP_PASS) {
      console.warn('Configuración SMTP incompleta. No se enviará el correo.');
      return false;
    }

    // Get template
    const template = await prisma.emailTemplate.findUnique({
      where: { type: templateType }
    });

    if (!template) {
      console.warn(`Plantilla de correo no encontrada para el tipo: ${templateType}`);
      return false;
    }

    // Replace variables
    let htmlBody = template.body;
    let subject = template.subject;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{${key}}`, 'g');
      htmlBody = htmlBody.replace(regex, value || '');
      subject = subject.replace(regex, value || '');
    }

    // Convert newlines to HTML breaks if they exist
    htmlBody = htmlBody.replace(/\n/g, '<br />');

    const port = parseInt(smtpConfig.SMTP_PORT || '587');
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: smtpConfig.SMTP_HOST,
      port: port,
      secure: port === 465, // true for 465, false for other ports (STARTTLS)
      auth: {
        user: smtpConfig.SMTP_USER,
        pass: smtpConfig.SMTP_PASS,
      },
      tls: {
        // do not fail on invalid certs if any
        rejectUnauthorized: false
      },
      // Force IPv4
      family: 4
    } as any);

    // Send email
    const info = await transporter.sendMail({
      from: `"${smtpConfig.SMTP_FROM_NAME || 'HDB Service'}" <${smtpConfig.SMTP_FROM_EMAIL || smtpConfig.SMTP_USER}>`,
      to: destination,
      subject: subject,
      html: htmlBody,
    });

    console.log(`[Email] Enviado a ${destination} (Original to: ${to}). Plantilla: ${templateType}`);
    return true;
  } catch (error) {
    console.error('[Email] Error al enviar email:', error);
    return false;
  }
}
