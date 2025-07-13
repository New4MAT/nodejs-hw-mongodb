import express from 'express';
import {
  getContacts,
  getOneContact,
  createContact,
  updateContactById,
  deleteContactById,
} from '../controllers/contactsController.js';
import { ctrlWrapper } from '../utils/ctrlWrapper.js';

const router = express.Router();

router.get('/', ctrlWrapper(getContacts));
router.get('/:id', ctrlWrapper(getOneContact));
router.post('/', ctrlWrapper(createContact));
router.patch('/:id', ctrlWrapper(updateContactById));
router.delete('/:id', ctrlWrapper(deleteContactById));

export default router;
