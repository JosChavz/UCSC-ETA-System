import express from 'express';
import sqlite3 from 'sqlite3';
import {importGtfs, updateGtfsRealtime} from 'gtfs';
import cron from "node-cron";
import * as fs from "fs";
import path from 'path';
import { getEstimatedTime } from "./etaEndpoints.js";

const app = express();
const PORT = 3000;

// GTFS Configuration
let config: any = undefined;
try {
    const data = fs.readFileSync(path.resolve() + '/src/db/config.json', 'utf8');
    config = JSON.parse(data);
} catch (error) {
    console.error('Error reading the file:', error);
}

const updateGtfsData = async () => {
    try {
        // Import GTFS data
        await updateGtfsRealtime(config);
        console.log("GTFS data imported successfully.");
    } catch (e) {
        console.error("Failed to import GTFS data:", e);
    }
}

cron.schedule('*/1 * * * *', async () => {
    console.log('Updating GTFS data...');
    await updateGtfsData();
});

// Start the server
app.listen(PORT, async () => {
    // Deletes the data.db file
    console.log("Deleting old database...");
    fs.unlink(config.sqlitePath, err => {
      if (err) {
        console.error(err);
      }
    });

    // Establishes a connection to the data.db
    new sqlite3.Database(config.sqlitePath, async (err) => {
        if (err) {
            console.error('Error opening database', err);
        } else {
            console.log('Connected to the SQLite database.');
            await importGtfs(config);
        }
    });

    // Creates a new data.db
    console.log(`Server running on port ${PORT}`);
});

app.get('/estimatedTime/:stop_id', getEstimatedTime);

// Expose a route for the GTFS data given an stop ID
// myip:3000/estimatedTime/1615?bus=18 -> ETA time - STRING
// myip:3000/stop/1615?bus=18 -> how many stops away is - INT

// ETA TIME DISPLAYS HERE
// MOTOR PINS HERE
//  on its way/coming shortly             bus image                     bus image
//      _                                     _                             _
//  0-1 stop away                        3 stops away                 6 stops away 


// ~3 weeks checkup - 2nd of December
// Goal:
//  Mirely - Get all 3 motors to flip based off signals
//  Jose - Endpoint for ETA time given a stop ID and bus number; Endpoint for how many stops away is given a stop ID and bus number;
//          Logic for updating the stops based off bus location and stop location    


// DATABASE
// bus_id, stop_id, eta_time, stops_away