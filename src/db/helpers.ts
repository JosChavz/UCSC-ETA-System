import {closeDb, getShapes, getStops, getStopsAsGeoJSON, getStoptimes, getStopTimesUpdates, openDb} from "gtfs";
import {Bus, Shape, Stop, StopCombination, Stoptime} from "../types";
import * as turf from "@turf/turf";
import fs from "fs";
import {Feature, LineString, Point} from "@turf/turf";

let config: any = undefined;

try {
    const data = fs.readFileSync('./db/config.json', 'utf8');
    config = JSON.parse(data);
} catch (error) {
    console.error('Error reading the file:', error);
}

/**
 * Deprecated
 * @param stop_code
 * @param route_id
 * @returns {Promise<boolean>}
 */
export async function validateBus(stop_code: string, route_id: string){
    const db = openDb(config);
    let stopContainsBus = false;

    try {
        // Gets a collection of busses that pass by the stop
        const stopCollection = await getStopsAsGeoJSON({
            stop_code,
        });
        // Some 'pretty' deconstruction to get the routes for the stop
        const [feature] = stopCollection.features;
        const validStops = feature.properties.routes;
        // Checks to see if the `route_id` is in the routes array
        stopContainsBus = validStops.some((bus: any) => bus.route_id === route_id)
    } catch (error) {
        console.log('Error fetching stop times:', error);
    }

    closeDb(db);
    return stopContainsBus;
}

/**
 * TODO: Use SQL to make it faster
 * @param stop_code
 * @returns {Promise<void>}
 */
export async function findBusArrivalTimes(stop_code: string) {
    const db = openDb(config);

    try {
        const [destinedStop] = getStops({
            stop_code
        });

        const stopTimes = getStopTimesUpdates({
            stop_id: destinedStop.stop_id,
        });

        // Process the stopTimes as needed
        stopTimes.map(bus => {
            const [stopName] = getStops({
                stop_id: bus.stop_id,
            });
            const time = new Date(bus.arrival_timestamp);
            console.log(`${stopName.stop_name} - ${bus.route_id} will arrive at ${time.toLocaleTimeString()}`);
        });
    } catch (error) {
        console.error('Error fetching stop times:', error);
    }

    closeDb(db);
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

    /*** MOVE THIS TO ITS OWN DICTIONARY LATER ***/
      // Get the shape points for the route
    const busRoutePoints: Shape[] = getShapes({
          shape_id: vehicles[0].shape_id,
      }) as Shape[];

    // Save as a line using turf
    const busTurfLine: Feature<LineString> = turf.lineString(
      busRoutePoints.map((point: Shape) => [
          point.shape_pt_lon,
          point.shape_pt_lat,
      ])
    );
    /******* END HERE ******/

    // Loop through the buses to know their location ETA
    vehicles.every((bus: Bus) => {
        console.log(`Bus ${bus.vehicle_id} - route ${bus.route_id} is at ${bus.latitude}, ${bus.longitude}`);

        // Gets the location of the bus
        const busLocation: Feature<Point> = turf.point([bus.longitude, bus.latitude]);

        if (isNearBusStation(busLocation)) {
            return true;
        }

        // Checks to see if the bus is in between the stops - First and Last
        const isWithinRange = pointWithinStops(busLocation, busTurfLine ,rangeStops[0], rangeStops[5])
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

function pointWithinStops(busLocation: Feature<Point>, pathway: Feature<LineString>, start: StopCombination, end: StopCombination): boolean {
    const expandWidth: number = 6;

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

    return turf.booleanPointInPolygon(busLocation, currToLastBuffer);
}