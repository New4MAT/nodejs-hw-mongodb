import { body } from 'express-validator';
import Joi from 'joi';

export const registerSchema = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 3, max: 30 })
    .withMessage('Name must be 3-30 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format'),
  body('password')
    .trim()
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

export const loginSchema = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format'),
  body('password').trim().notEmpty().withMessage('Password is required'),
];

export const requestResetEmailSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'string.empty': 'Email is required',
    'any.required': 'Email is required',
  }),
});

export const resetPwdSchema = Joi.object({
  token: Joi.string().required().messages({
    'string.empty': 'Token is required',
    'any.required': 'Token is required',
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'string.empty': 'Password is required',
    'any.required': 'Password is required',
  }),
});
