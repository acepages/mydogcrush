const nodemailer = require('nodemailer');
require('dotenv').config();

async function sendVerificationCode(email, code) {
  require('dotenv').config();

  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpService = process.env.SMTP_SERVICE || 'gmail';
  const smtpFrom = process.env.SMTP_FROM || smtpUser;

  if (!smtpUser || !smtpPass) {
    const error = new Error('Faltan las credenciales SMTP. Edita el archivo .env con SMTP_USER y SMTP_PASS.');
    error.code = 'SMTP_CONFIG_MISSING';
    throw error;
  }

  const transporter = nodemailer.createTransport({
    service: smtpService,
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  try {
    await transporter.sendMail({
      from: smtpFrom,
      to: email,
      subject: 'MyDogCrush - Código de verificación',
      text: `Tu código de verificación es: ${code}`,
      html: `<p>Tu código de verificación es: <strong>${code}</strong></p>`,
    });
  } catch (error) {
    const message = String(error?.message || '');
    if (error?.code === 'EAUTH' || error?.responseCode === 535 || message.includes('Username and Password not accepted')) {
      const authError = new Error('Gmail rechazó las credenciales SMTP. Usa la contraseña de aplicación exacta que Google generó para esta cuenta y asegúrate de que SMTP_USER sea tu dirección de Gmail.');
      authError.code = 'SMTP_AUTH_FAILED';
      throw authError;
    }

    throw error;
  }
}

module.exports = { sendVerificationCode };
