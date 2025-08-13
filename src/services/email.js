import nodemailer from 'nodemailer';
import pino from 'pino';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import handlebars from 'handlebars';
import createError from 'http-errors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log('Current .env path:', path.join(__dirname, '.env'));

const logger = pino();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2',
  },
  logger: true,
  debug: true,
});

console.log('Full SMTP config:', {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASSWORD ? '***' : 'NOT SET', // Не показуємо пароль
  from: process.env.SMTP_FROM,
});

// Verify connection configuration
transporter.verify((error, success) => {
  if (error) {
    logger.error('SMTP Connection Error:', error);
  } else {
    logger.info('SMTP Server is ready to send messages');
  }
});

export const sendPasswordResetEmailMessage = async (email, resetLink) => {
  try {
    const templatePath = path.join(
      __dirname,
      '../templates/reset-password.html',
    );
    const templateContent = await fs.readFile(templatePath, 'utf-8');
    const template = handlebars.compile(templateContent);

    const html = template({
      resetLink,
      appDomain: process.env.APP_DOMAIN,
    });

    const mailOptions = {
      from: `"Password Reset" <${process.env.SMTP_FROM}>`,
      to: email,
      subject: 'Password Reset Request',
      html,
    };

    logger.info('Sending email with options:', mailOptions);

    const info = await transporter.sendMail(mailOptions);
    logger.info('Email sent:', info.response);

    logger.info(`Password reset email sent to ${email}`);
  } catch (error) {
    logger.error(`Failed to send email to ${email}:`, error);
    throw createError(500, 'Failed to send the email, please try again later.');
  }
};
