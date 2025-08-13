import nodemailer from 'nodemailer';
import pino from 'pino';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import handlebars from 'handlebars';
import createError from 'http-errors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logger = pino();

// SMTP configuration - все через process.env
const smtpConfig = {
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD, // Ключ береться тільки з змінних оточення
  },
};

// Логуємо конфіг без пароля
logger.info('Initializing SMTP transporter with config: %j', {
  ...smtpConfig,
  auth: { ...smtpConfig.auth, pass: '***' }, // Приховуємо пароль в логах
});

const transporter = nodemailer.createTransport(smtpConfig);

// Перевірка підключення
transporter.verify((error) => {
  if (error) {
    logger.error('SMTP connection failed: %s', error.message);
  } else {
    logger.info('SMTP connection established successfully');
  }
});

export const sendPasswordResetEmailMessage = async (email, resetLink) => {
  try {
    // Завантажуємо HTML шаблон
    const templatePath = path.join(
      __dirname,
      '../templates/reset-password.html',
    );
    const templateContent = await fs.readFile(templatePath, 'utf-8');
    const template = handlebars.compile(templateContent);

    // Генеруємо HTML листа
    const html = template({
      resetLink,
      appDomain: process.env.APP_DOMAIN,
    });

    // Налаштування листа
    const mailOptions = {
      from: `"Password Reset" <${process.env.SMTP_FROM}>`,
      to: email,
      subject: 'Password Reset Request',
      html,
      headers: {
        'X-Mailer': 'Node.js',
        'X-Priority': '1',
      },
    };

    logger.info('Sending password reset email to %s', email);

    // Відправляємо лист
    const info = await transporter.sendMail(mailOptions);
    logger.debug('Email sent: %j', {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
    });

    return info;
  } catch (error) {
    logger.error('Failed to send password reset email: %s', error.message);
    throw createError(500, 'Failed to send the email, please try again later.');
  }
};
