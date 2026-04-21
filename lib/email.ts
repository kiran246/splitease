import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendInvitationEmail({
  to,
  inviteeName,
  sheetTitle,
  ownerName,
  inviteUrl,
}: {
  to: string;
  inviteeName: string;
  sheetTitle: string;
  ownerName: string;
  inviteUrl: string;
}) {
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject: `You're invited to join "${sheetTitle}" on SplitEase`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
        <h2 style="color:#4f46e5;">SplitEase Invitation</h2>
        <p>Hi ${inviteeName},</p>
        <p><strong>${ownerName}</strong> has invited you to collaborate on the expense sheet <strong>"${sheetTitle}"</strong>.</p>
        <p>Click the button below to accept the invitation (you'll need to log in or register first):</p>
        <a href="${inviteUrl}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Accept Invitation</a>
        <p style="margin-top:16px;color:#6b7280;font-size:13px;">This invitation expires in 7 days. If you didn't expect this, you can safely ignore it.</p>
      </div>
    `,
  });
}

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
