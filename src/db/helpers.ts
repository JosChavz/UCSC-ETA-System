import fs from "fs";
import path from "path";
import { closeDb, getStops, getStoptimes, getStopTimesUpdates, openDb } from "gtfs";
import { Arrival, Bus, Stop, StopCombination, Stoptime } from "../types";
import { Feature, LineString, Point } from "@turf/turf";
import * as turf from "@turf/turf";
import { busPathsGeoJSON } from "./db.js";

let config: any = undefined;

try {
    const data = fs.readFileSync(path.resolve() + '/src/db/config.json', 'utf8');
    config = JSON.parse(data);
} catch (error) {
    console.error('Error reading the file:', error);
}

/**
 * TODO: Use SQL to make it faster
 * @param stop_code
 * @returns {Promise<void>}
 */
export async function findBusArrivalTimes(stop_code: string): Promise<Arrival[]> {
  const db = openDb(config);

  const arrivals: Arrival[] = [];

  const [destinedStop] = getStops({
    stop_code,
  });

  const stopTimes = getStopTimesUpdates({
    stop_id: destinedStop.stop_id,
  });

  // Process the stopTimes as needed
  stopTimes.map(bus => {
    arrivals.push({
      route_id: bus.route_id,
      arrival_timestamp: bus.arrival_timestamp,
    });
  });

  closeDb(db);

  return arrivals;
}

export async function stopsAwayFromDestination(stopCode: string, busCode: string): Promise<number> {
    const db = openDb(config);
    let stopsAway: number = -1;

    // Get all busses from vehicle_positions
    const vehicles: Bus[] = db
      .prepare('SELECT * ' +
        'FROM trips ' +
        'INNER JOIN vehicle_positions ON trips.trip_id = vehicle_positions.trip_id\n' +
        'WHERE trips.trip_id IN (SELECT trip_id FROM vehicle_positions WHERE trip_id != \'\') ' +
        'AND trips.route_id = ?;')
      .all(busCode);

    if (vehicles.length === 0) {
        console.log('No buses on the route');
        closeDb(db);
        return -1;
    }

    /*** MOVE THIS TO ITS OWN DICTIONARY LATER ***/
      // Get the stops for the route
    let stops: StopCombination[] = [];
    const stopTimes: Stoptime[] = getStoptimes({
        trip_id: vehicles[0].trip_id,
    }) as Stoptime[];

    stopTimes.forEach((stopTime: Stoptime) => {
        const [stop] = getStops({
            stop_id: stopTime.stop_id,
        }) as Stop[];
        stops.push({
            ...stopTime,
            ...stop,
        });
    });

    // Finds the index of the current stop
    const currentStopIndex: number = stops.findIndex(
      stop => stop.stop_code === stopCode
    );
    // Gets the stops in the range of 5 stops before and the current stop
    const rangeStops: StopCombination[] = stops
      .slice(currentStopIndex - 5, currentStopIndex + 1)
      .reverse();
    /**** END HERE *****/

    const busTurfLine: Feature<LineString> = busPathsGeoJSON[vehicles[0].route_id][vehicles[0].shape_id];

    // Loop through the buses to know their location ETA
    vehicles.every((bus: Bus) => {
        console.log(`Bus ${bus.vehicle_id} - route ${bus.route_id} is at ${bus.latitude}, ${bus.longitude}`);

      console.log('Bus', bus);

        // Gets the location of the bus
        const busLocation: Feature<Point> = turf.point([bus.longitude, bus.latitude]);

        if (!isNearBusStation(busLocation)) {
            console.log('Near the bus station.');
            return true;
        }

        // Checks to see if the bus is in between the stops - First and Last
        // Uses a larger width to ensure that the point of the bus is within the range
        const isWithinRange = pointWithinStops(busLocation, busTurfLine ,rangeStops[0], rangeStops[5], 50);

        if (!isWithinRange) {
            console.log("This bus is not within the range of the first and last stop. Skipping...\n");
            return true;
        }

        const isOneStopAway = pointWithinStops(busLocation, busTurfLine, rangeStops[0], rangeStops[1]);
        console.log('Is the bus one stop away?', isOneStopAway);
        if (isOneStopAway) {
            stopsAway = 1;
            return false;
        }

        const isTwoThreeStopsAway = pointWithinStops(busLocation, busTurfLine, rangeStops[1], rangeStops[3]);
        console.log('Is the bus two or three stops away?', isTwoThreeStopsAway);
        if (isTwoThreeStopsAway) {
            stopsAway = 2;
            return false;
        }

        const isFourFiveStopsAway = pointWithinStops(busLocation, busTurfLine, rangeStops[3], rangeStops[5]);
        console.log('Is the bus four or five stops away?', isFourFiveStopsAway);
        if (isFourFiveStopsAway) {
            stopsAway = 3;
            return false;
        }

        return true;
    });

    closeDb(db);
    return stopsAway;
}

function isNearBusStation(busLocation: Feature<Point>): boolean {
    const busStationLocation = turf.point([-122.02460130725074, 36.97108991791251]);

    // First checks to see if the bus in at the station
    const distance = turf.distance(busStationLocation, busLocation, { units: 'miles' });
    const radius: number = 0.05;

    if (distance <= radius) {
        console.log("This bus is currently at or near the station. Skipping...\n");
        return false;
    }

    return true;
}

function pointWithinStops(busLocation: Feature<Point>, pathway: Feature<LineString>, start: StopCombination, end: StopCombination, expansion?: number): boolean {
  const expandWidth: number = expansion ?? 25;

  // Checks to see if the bus is in between the stops - Current and Previous
  const currStopLocation = turf.point([
    start.stop_lon,
    start.stop_lat,
  ]);


  // Checks to see if the bus is between the first stop and last stop
  const lastStopLocation = turf.point([
    end.stop_lon,
    end.stop_lat,
  ]);

  const currToLastLine = turf.lineSlice(
    currStopLocation,
    lastStopLocation,
    pathway
  );

  const currToLastBuffer = turf.buffer(currToLastLine, expandWidth, { units: 'feet' });

  fs.writeFileSync('./pathway.json', JSON.stringify(currToLastBuffer))

  return turf.booleanPointInPolygon(busLocation, currToLastBuffer);
}