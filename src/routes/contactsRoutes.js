import express from 'express';
import {
  getContacts,
  getOneContact,
  createContact,
  updateContactById,
  deleteContactById,
} from '../controllers/contactsController.js';

const router = express.Router();

router.get('/', getContacts);
router.get('/:id', getOneContact);
router.post('/', createContact);
router.put('/:id', updateContactById);
router.delete('/:id', deleteContactById);

export default router;
