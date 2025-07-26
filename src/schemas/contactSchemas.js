import { body } from 'express-validator';

export const createContactSchema = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 3, max: 20 })
    .withMessage('Name must be 3-20 characters'),

  body('phoneNumber')
    .trim()
    .notEmpty()
    .withMessage('Phone is required')
    .isLength({ min: 3, max: 20 })
    .withMessage('Phone must be 3-20 characters'),

  body('contactType')
    .notEmpty()
    .withMessage('Contact type is required')
    .isIn(['work', 'home', 'personal'])
    .withMessage('Invalid contact type'),
];

export const updateContactSchema = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Name must be 3-20 characters long'),
  body('phoneNumber')
    .optional()
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Phone number must be 3-20 characters long'),
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('contactType')
    .optional()
    .isIn(['work', 'home', 'personal'])
    .withMessage('Invalid contact type'),
  body('isFavourite')
    .optional()
    .isBoolean()
    .withMessage('isFavourite must be boolean'),
];
