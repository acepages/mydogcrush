const nodemailer = require('nodemailer');

async function sendMassiveEmail(recipients, code) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  for (const email of recipients) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: email,
        subject: 'Tu código de verificación de MyDogCrush',
        text: `Tu código de verificación es: ${code}`,
        html: `<p>Tu código de verificación es: <strong>${code}</strong></p>`,
      });
      console.log('Enviado a:', email);
    } catch (error) {
      console.error('Error en', email, error.message);
    }
  }
}

module.exports = { sendMassiveEmail };
