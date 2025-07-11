import { Contact } from '../models/contactModel.js';
import mongoose from 'mongoose';
import pino from 'pino';

const logger = pino();

const formatResponse = (status, message, data = null) => ({
  status,
  message,
  ...(data && { data }),
});

export const getContacts = async (req, res) => {
  try {
    const contacts = await Contact.find();
    res.json(formatResponse(200, 'Successfully found contacts!', contacts));
  } catch (error) {
    logger.error(error);
    res.status(500).json(formatResponse(500, 'Server error'));
  }
};

export const getOneContact = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json(formatResponse(400, 'Invalid ID format'));
    }

    const contact = await Contact.findById(id);
    if (!contact) {
      return res.status(404).json(formatResponse(404, 'Contact not found'));
    }

    res.json(
      formatResponse(200, `Successfully found contact with id ${id}!`, contact),
    );
  } catch (error) {
    logger.error(error);
    res.status(500).json(formatResponse(500, 'Server error'));
  }
};

export const createContact = async (req, res) => {
  try {
    const result = await Contact.create(req.body);
    res
      .status(201)
      .json(formatResponse(201, 'Successfully created contact!', result));
  } catch (error) {
    logger.error(error);
    res.status(400).json(formatResponse(400, error.message));
  }
};

export const updateContactById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json(formatResponse(400, 'Invalid ID format'));
    }

    const result = await Contact.findByIdAndUpdate(id, req.body, { new: true });
    if (!result) {
      return res.status(404).json(formatResponse(404, 'Contact not found'));
    }

    res.json(formatResponse(200, 'Successfully updated contact!', result));
  } catch (error) {
    logger.error(error);
    res.status(500).json(formatResponse(500, 'Server error'));
  }
};

export const deleteContactById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json(formatResponse(400, 'Invalid ID format'));
    }

    const result = await Contact.findByIdAndDelete(id);
    if (!result) {
      return res.status(404).json(formatResponse(404, 'Contact not found'));
    }

    res.json(formatResponse(200, 'Successfully deleted contact!', { id }));
  } catch (error) {
    logger.error(error);
    res.status(500).json(formatResponse(500, 'Server error'));
  }
};
