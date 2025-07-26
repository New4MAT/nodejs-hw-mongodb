import createError from 'http-errors';
import { Contact } from '../models/contactModel.js';
import mongoose from 'mongoose';

const formatResponse = (status, message, data = null) => ({
  status,
  message,
  ...(data && { data }),
});

export const getContacts = async (req, res) => {
  const contacts = await Contact.find();
  res.json(formatResponse(200, 'Successfully found contacts!', contacts));
};

export const getOneContact = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createError(400, 'Invalid ID format');
  }

  const contact = await Contact.findById(id);
  if (!contact) {
    throw createError(404, 'Contact not found');
  }

  res.json(
    formatResponse(200, `Successfully found contact with id ${id}!`, contact),
  );
};

export const createContact = async (req, res) => {
  const { name, phoneNumber, contactType } = req.body;

  if (!name || !phoneNumber || !contactType) {
    throw createError(
      400,
      'Missing required fields: name, phoneNumber, contactType',
    );
  }

  const result = await Contact.create(req.body);
  res
    .status(201)
    .json(formatResponse(201, 'Successfully created contact!', result));
};

export const updateContactById = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createError(400, 'Invalid ID format');
  }

  const result = await Contact.findByIdAndUpdate(id, req.body, { new: true });
  if (!result) {
    throw createError(404, 'Contact not found');
  }

  res.json(formatResponse(200, 'Successfully updated contact!', result));
};

export const deleteContactById = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createError(400, 'Invalid ID format');
  }

  const result = await Contact.findByIdAndDelete(id);
  if (!result) {
    throw createError(404, 'Contact not found');
  }

  res.status(204).end();
};
