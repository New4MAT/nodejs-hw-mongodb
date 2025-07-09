import {
  getAllContactsService,
  getContactByIdService,
} from '../services/contacts.js';
import mongoose from 'mongoose';

export const getAllContactsController = async (req, res, next) => {
  try {
    console.log('Starting to fetch all contacts');
    const contacts = await getAllContactsService();

    if (!contacts || contacts.length === 0) {
      console.warn('No contacts found in database');
      return res.status(404).json({
        status: 404,
        message: 'No contacts found',
        data: [],
      });
    }

    console.log(`Successfully fetched ${contacts.length} contacts`);
    return res.status(200).json({
      status: 200,
      message: 'Successfully found contacts!',
      data: contacts,
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return next({
      status: 500,
      message: 'Internal server error while fetching contacts',
      details: error.message,
    });
  }
};

export const getContactByIdController = async (req, res, next) => {
  try {
    const { contactId } = req.params;
    console.log(`Looking for contact with ID: ${contactId}`);

    if (!mongoose.Types.ObjectId.isValid(contactId)) {
      return res.status(400).json({
        status: 400,
        message: 'Invalid contact ID format',
        details: `Received: ${contactId}`,
      });
    }

    const contact = await getContactByIdService(contactId);

    if (!contact) {
      return res.status(404).json({
        status: 404,
        message: 'Contact not found',
        requestedId: contactId,
        suggestion: 'Try GET /contacts to see available IDs',
      });
    }

    return res.status(200).json({
      status: 200,
      message: `Successfully found contact with id ${contactId}!`,
      data: contact,
    });
  } catch (error) {
    console.error('Find contact error:', error);
    return next({
      status: 500,
      message: 'Internal server error',
      details: error.message,
    });
  }
};
