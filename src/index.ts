import {
  closeDb,
  openDb,
} from 'gtfs';
import * as fs from 'fs';
import {stopsAwayFromDestination} from "./db/helpers.js";
import path from "path";


let config = undefined;

try {
  const data = fs.readFileSync(path.resolve() + '/src/db/config.json', 'utf8');
  config = JSON.parse(data);
} catch (error) {
  console.error('Error reading the file:', error);
}

await stopsAwayFromDestination('1615', '20');

const db = openDb(config);

closeDb(db);
