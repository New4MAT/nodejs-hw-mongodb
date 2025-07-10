import express from 'express';
import {
  getAllContactsController,
  getContactByIdController,
} from '../controllers/contactsController.js';

const router = express.Router();

router.get('/', getAllContactsController);
router.get('/:id', getContactByIdController);

export default router;
