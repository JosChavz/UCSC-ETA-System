import express from 'express';
import sqlite3 from 'sqlite3';
import { getRoutes, getShapes, importGtfs, updateGtfsRealtime } from "gtfs";
import cron from "node-cron";
import * as fs from "fs";
import path from 'path';
import { getEstimatedTime, getStopsAway } from "./etaEndpoints.js";
import { Route, Shape, Trip } from "../types";
import { Feature, LineString } from "@turf/turf";
import * as turf from "@turf/turf";

const app = express();
const PORT = 3000;
let db: sqlite3.Database;
export const busPathsGeoJSON: Record<string, Record<string, Feature<LineString>>> = {};

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

const updatePaths = async () => {
    const routes: Route[] = getRoutes() as Route[];
    let paths: Trip[] = [];

    for (const route of routes) {
        db.all('SELECT DISTINCT shape_id FROM trips WHERE route_id = ?', [route.route_id], (err, rows) => {
            if (err) {
                console.error(err);
            } else {
                paths = rows as Trip[];
            }
        });

        for (const path of paths) {
            const shapes: Shape[] = getShapes({
                shape_id: path.shape_id,
            }) as Shape[];

            if (!busPathsGeoJSON[route.route_id]) {
                busPathsGeoJSON[route.route_id] = {};
            }

            busPathsGeoJSON[route.route_id][path.shape_id] = turf.lineString(
              shapes.map((point: Shape) => [
                  point.shape_pt_lon,
                  point.shape_pt_lat,
              ]));
        }
    }
    console.log("Paths updated successfully.");
}

cron.schedule('*/0.25 * * * *', async () => {
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
    db = new sqlite3.Database(config.sqlitePath, async (err) => {
        if (err) {
            console.error('Error opening database', err);
            process.exit(1);
        } else {
            console.log('Connected to the SQLite database.');
        }
    });

    await importGtfs(config);
    await updatePaths();

    // Creates a new data.db
    console.log(`Server running on port ${PORT}`);
});

app.get('/', (_req, res) => {
  res.send('Hello World!');
});

app.get('/estimatedTime/:stop_id', getEstimatedTime);
app.get('/stop/:stop_id', getStopsAway);

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