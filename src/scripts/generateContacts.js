import { createFakeContact } from '../utils/createFakeContact.js';
import { writeContacts } from '../utils/writeContacts.js';
import { readContacts } from '../utils/readContacts.js';

export const generateContacts = async (number) => {
  const contacts = await readContacts();
  for (let i = 0; i < number; i++) {
    contacts.push(createFakeContact());
  }
  await writeContacts(contacts);
  return contacts;
};

await generateContacts(5);
