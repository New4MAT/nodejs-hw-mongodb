import fs from 'fs/promises';
import { PATH_DB } from '../constants/contacts.js';

export const writeContacts = async (contacts) => {
  await fs.writeFile(PATH_DB, JSON.stringify(contacts, null, 2));
};
