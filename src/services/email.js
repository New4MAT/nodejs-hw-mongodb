import nodemailer from 'nodemailer';
import pino from 'pino';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import handlebars from 'handlebars';
import createError from 'http-errors';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Завантажити змінні оточення з правильного шляху
const envPath = path.join(__dirname, '../../.env');
dotenv.config({ path: envPath });

const logger = pino({
  level: 'debug',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:dd-mm-yyyy HH:MM:ss',
      ignore: 'pid,hostname',
    },
  },
});

// Детальне логування конфігурації SMTP
logger.debug('SMTP Configuration:');
logger.debug('Host: %s', process.env.SMTP_HOST);
logger.debug('Port: %s', process.env.SMTP_PORT);
logger.debug('User: %s', process.env.SMTP_USER);
logger.debug('Password set: %s', !!process.env.SMTP_PASSWORD);

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
  <p><small>This link will expire in 5 minutes.</small></p>
</body>
</html>`;

const smtpConfig = {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
};

const transporter = nodemailer.createTransport(smtpConfig);

// Перевірка підключення SMTP
transporter.verify(function (error, success) {
  if (error) {
    logger.error('SMTP Connection failed: %s', error.message);
  } else {
    logger.info('SMTP Connection verified successfully');
  }
});

// Функція для відправки листа з посиланням для скидання паролю
export const sendPasswordResetEmail = async (email, resetLink) => {
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
    logger.warn('Using fallback template: %s', error.message);
    template = RESET_TEMPLATE;
  }

  try {
    const mailOptions = {
      from: `"Your App" <${process.env.SMTP_FROM}>`,
      to: email,
      subject: 'Password Reset Request',
      html: handlebars.compile(template)({ resetLink }),
    };

    logger.debug('Sending email to: %s', email);
    logger.debug('Reset link: %s', resetLink);

    const info = await transporter.sendMail(mailOptions);
    logger.info('Email sent successfully: %s', info.messageId);
    return info;
  } catch (error) {
    logger.error('Failed to send email: %s', error.message);
    logger.error('Error details: %j', error);

    // Детальна інформація про помилку SMTP
    if (error.response) {
      logger.error('SMTP response: %s', error.response);
    }
    if (error.responseCode) {
      logger.error('SMTP response code: %s', error.responseCode);
    }

    throw createError(500, 'Failed to send email. Please try again later.');
  }
};

export default {
  sendPasswordResetEmail,
};
