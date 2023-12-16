import { closeDb, openDb } from 'gtfs';
import * as fs from 'fs';
import path from 'path';

let config = undefined;

try {
  const data = fs.readFileSync(path.resolve() + '/src/db/config.json', 'utf8');
  config = JSON.parse(data);
} catch (error) {
  console.error('Error reading the file:', error);
}


const db = openDb(config);

closeDb(db);
