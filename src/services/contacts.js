import { Contact } from '../models/contactModel.js';

export const getAllContactsService = async () => {
  try {
    console.log('Fetching all contacts from database');
    const contacts = await Contact.find({}).lean().exec();
    console.log(`Found ${contacts.length} contacts in database`);
    return contacts;
  } catch (error) {
    console.error('Error in getAllContactsService:', error);
    throw new Error('Failed to retrieve contacts from database');
  }
};

export const getContactByIdService = async (id) => {
  try {
    console.log(`Querying contact with ID: ${id}`);
    const contact = await Contact.findById(id).lean().exec();
    
    if (!contact) {
      console.warn(`Contact ${id} not found in database`);
      return null;
    }
    
    console.log(`Found contact: ${contact.name} (${contact.phoneNumber})`);
    return contact;
  } catch (error) {
    console.error(`Error finding contact ${id}:`, error);
    throw error;
  }
};