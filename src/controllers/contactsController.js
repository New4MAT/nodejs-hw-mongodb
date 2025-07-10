import { Contact } from '../models/contactModel.js';
import mongoose from 'mongoose';
import pino from 'pino';

const logger = pino();

export const getContacts = async (req, res) => {
  try {
    const contacts = await Contact.find();
    res.json({
      status: 'success',
      code: 200,
      data: contacts,
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Server error',
    });
  }
};

export const getOneContact = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Invalid ID format',
      });
    }

    const contact = await Contact.findById(id);

    if (!contact) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Not found',
      });
    }

    res.json({
      status: 'success',
      code: 200,
      data: contact,
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Server error',
    });
  }
};

export const createContact = async (req, res) => {
  try {
    const result = await Contact.create(req.body);
    res.status(201).json({
      status: 'success',
      code: 201,
      data: result,
    });
  } catch (error) {
    logger.error(error);
    res.status(400).json({
      status: 'error',
      code: 400,
      message: error.message,
    });
  }
};

export const updateContactById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Invalid ID format',
      });
    }

    const result = await Contact.findByIdAndUpdate(id, req.body, { new: true });

    if (!result) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Not found',
      });
    }

    res.json({
      status: 'success',
      code: 200,
      data: result,
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Server error',
    });
  }
};

export const deleteContactById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Invalid ID format',
      });
    }

    const result = await Contact.findByIdAndDelete(id);

    if (!result) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Not found',
      });
    }

    res.json({
      status: 'success',
      code: 200,
      data: { message: 'Contact deleted' },
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Server error',
    });
  }
};
