import { createFakeContact } from '../utils/createFakeContact.js';
import { writeContacts } from '../utils/writeContacts.js';
import { readContacts } from '../utils/readContacts.js';

export const addOneContact = async () => {
  const contacts = await readContacts();
  contacts.push(createFakeContact());
  await writeContacts(contacts);
  return contacts;
};

await addOneContact();
