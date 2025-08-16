import nodemailer from 'nodemailer';
import pino from 'pino';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import handlebars from 'handlebars';
import createError from 'http-errors';
import dns from 'dns/promises';
import net from 'net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logger = pino();

const RESET_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <title>Password Reset</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; }
    .button {
      display: inline-block;
      padding: 10px 20px;
      background-color: #4CAF50;
      color: white;
      text-decoration: none;
      border-radius: 5px;
    }
  </style>
</head>
<body>
  <h2>Password Reset Request</h2>
  <p>You requested to reset your password. Click the button below to proceed:</p>
  <a href="{{resetLink}}" class="button">Reset Password</a>
  <p>If you didn't request this, please ignore this email.</p>
  <p><small>This link will expire in 15 minutes.</small></p>
</body>
</html>`;

// Альтернативні налаштування для Brevo
const smtpConfig = {
  host: process.env.SMTP_HOST || 'smtp.brevo.com', // Основна зміна - альтернативний хост
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2',
  },
  connectionTimeout: 10000,
  greetingTimeout: 5000,
  socketTimeout: 10000,
  logger: true,
  debug: true,
};

const transporter = nodemailer.createTransport(smtpConfig);

export const verifySMTPConnection = async () => {
  try {
    // 1. Перевірка DNS
    try {
      const addresses = await dns.resolve4(smtpConfig.host);
      logger.info(
        `DNS resolved: ${smtpConfig.host} -> ${addresses.join(', ')}`,
      );
    } catch (error) {
      logger.error(`DNS resolution failed: ${error.message}`);
      return false;
    }

    // 2. Перевірка TCP з'єднання
    const tcpSuccess = await new Promise((resolve) => {
      const socket = net.createConnection({
        host: smtpConfig.host,
        port: smtpConfig.port,
      });

      socket.on('connect', () => {
        socket.end();
        resolve(true);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });

      socket.on('error', (error) => {
        logger.error(`TCP connection error: ${error.message}`);
        resolve(false);
      });

      socket.setTimeout(5000);
    });

    if (!tcpSuccess) {
      logger.error(
        `TCP connection failed to ${smtpConfig.host}:${smtpConfig.port}`,
      );
      return false;
    }

    // 3. Повна SMTP перевірка
    await transporter.verify();
    logger.info('SMTP connection verified');
    return true;
  } catch (error) {
    logger.error(`SMTP verification failed: ${error.message}`);
    return false;
  }
};

export const sendPasswordResetEmail = async (email, resetLink) => {
  // Валідація вхідних даних
  if (!email || !resetLink) {
    throw new Error('Email and resetLink are required');
  }

  let template;
  try {
    const templatePath = path.join(
      __dirname,
      '../templates/reset-password.html',
    );
    template = await fs.readFile(templatePath, 'utf-8');
  } catch (error) {
    logger.warn('Using fallback template: ' + error.message);
    template = RESET_TEMPLATE;
  }

  try {
    const mailOptions = {
      from: `"Password Reset" <${process.env.SMTP_FROM}>`,
      to: email,
      subject: 'Password Reset Request',
      html: handlebars.compile(template)({ resetLink }),
      headers: {
        'X-Mailer': 'Node.js',
        'X-Priority': '1',
      },
    };

    // Спроба відправити лист без попередньої перевірки (можна спробувати, навіть якщо verify не пройшов)
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error(`Failed to send email: ${error.message}`);
    throw createError(
      503,
      'Email service is currently unavailable. Please try again later.',
    );
  }
};

export default {
  verifySMTPConnection,
  sendPasswordResetEmail,
};
