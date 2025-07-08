import express from 'express';
import { getAllContactsController } from '../controllers/contactsController.js';

const router = express.Router();

router.get('/', getAllContactsController); // GET /contacts

export default router;
