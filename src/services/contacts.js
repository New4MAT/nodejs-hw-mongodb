import { Contact } from '../models/contactModel.js';

export const getAllContactsService = async () => {
  try {
    const contacts = await Contact.find({});
    return contacts;
  } catch (error) {
    console.error('Error in getAllContactsService:', error);
    throw error;
  }
};

export const getContactByIdService = async (id) => {
  return await Contact.findById(id);
};
