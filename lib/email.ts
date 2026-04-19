import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendSheetEmail({
  to,
  subject,
  html,
  pdfBuffer,
}: {
  to: string;
  subject: string;
  html: string;
  pdfBuffer?: Buffer;
}) {
  const attachments = pdfBuffer
    ? [{ filename: 'expense-sheet.pdf', content: pdfBuffer, contentType: 'application/pdf' }]
    : [];

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject,
    html,
    attachments,
  });
}
