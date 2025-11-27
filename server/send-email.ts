import nodemailer from 'nodemailer';

interface EmailRequest {
  gmailUser: string;
  gmailPassword: string;
  to: string[];
  subject: string;
  html: string;
}

export async function sendEmail(req: EmailRequest) {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: req.gmailUser,
        pass: req.gmailPassword,
      },
    });

    const mailOptions = {
      from: req.gmailUser,
      to: req.to.join(','),
      subject: req.subject,
      html: req.html,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
}
