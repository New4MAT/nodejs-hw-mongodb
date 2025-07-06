import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PATH_DB = path.join(__dirname, '../db/db.json');
