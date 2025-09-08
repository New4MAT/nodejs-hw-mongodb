import express from 'express';
import {
  getContacts,
  getOneContact,
  createContact,
  updateContactById,
  deleteContactById,
} from '../controllers/contactsController.js';
import { ctrlWrapper } from '../utils/ctrlWrapper.js';
import { validateBody, isValidId } from '../middlewares/validateBody.js';
import {
  createContactSchema,
  updateContactSchema,
} from '../schemas/contactSchemas.js';
import { authenticate } from '../middlewares/authenticate.js';
import { query } from 'express-validator';
import { upload } from '../middlewares/multer.js';

const router = express.Router();

const getContactsValidation = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('perPage').optional().isInt({ min: 1 }).toInt(),
  query('sortBy').optional().isIn(['name', 'phoneNumber', 'contactType']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
  query('contactType').optional().isIn(['work', 'home', 'personal']),
  query('isFavourite').optional().isBoolean().toBoolean(),
];

router.use(authenticate);

router.get('/', validateBody(getContactsValidation), ctrlWrapper(getContacts));
router.get('/:id', isValidId, ctrlWrapper(getOneContact));
router.post(
  '/',
  upload.single('photo'),
  validateBody(createContactSchema),
  ctrlWrapper(createContact),
);
router.patch(
  '/:id',
  authenticate,
  isValidId,
  upload.single('photo'),
  validateBody(updateContactSchema),
  ctrlWrapper(updateContactById),
);
router.delete('/:id', isValidId, ctrlWrapper(deleteContactById));

export default router;
