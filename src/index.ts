import {
  closeDb,
  getStops,
  openDb,
  getShapes,
  getStoptimes,
  getShapesAsGeoJSON,
} from 'gtfs';
import * as turf from '@turf/turf';

import {
  Bus,
  Shape,
  Stop,
  StopCombination,
  Stoptime,
} from './types';
import * as fs from 'fs';


let config = undefined;

try {
  const data = fs.readFileSync('./db/config.json', 'utf8');
  config = JSON.parse(data);
} catch (error) {
  console.error('Error reading the file:', error);
}

function test(stopCode: string, busCode: string) {
  let config = undefined;

  try {
    const data = fs.readFileSync('./db/config.json', 'utf8');
    config = JSON.parse(data);
  } catch (error) {
    console.error('Error reading the file:', error);
  }

  const db = openDb(config);

  // Get all busses from vehicle_positions
  const vehicles: Bus[] = db
    .prepare('SELECT * ' +
      'FROM trips ' +
      'INNER JOIN vehicle_positions ON trips.trip_id = vehicle_positions.trip_id\n' +
      'WHERE trips.trip_id IN (SELECT trip_id FROM vehicle_positions WHERE trip_id != \'\') ' +
      'AND trips.route_id = ?;')
    .all(busCode);

  // console.log(vehicles);

  if (vehicles.length === 0) {
    console.log('No buses on the route');
    closeDb(db);
    return;
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
  const busTurfLine = turf.lineString(
    busRoutePoints.map((point: Shape) => [
      point.shape_pt_lon,
      point.shape_pt_lat,
    ])
  );
  /******* END HERE ******/

  const busStationLocation = turf.point([-122.02460130725074, 36.97108991791251]);

  // Loop through the buses to know their location ETA
  vehicles.forEach((bus: Bus) => {
    console.log(`Bus ${bus.vehicle_id} - route ${bus.route_id} is at ${bus.latitude}, ${bus.longitude}`);

    // Gets the location of the bus
    const busLocation = turf.point([bus.longitude, bus.latitude]);

    // First checks to see if the bus in at the station
    const distance = turf.distance(busStationLocation, busLocation, { units: 'miles' });
    const radius = 0.05;

    if (distance <= radius) {
      console.log("This bus is currently at or near the station. Skipping...\n");
      return;
    }

    // Checks to see if the bus is in between the stops - Current and Previous
    const currStopLocation = turf.point([
      rangeStops[0].stop_lon,
      rangeStops[0].stop_lat,
    ]);
    const prevStopLocation = turf.point([
      rangeStops[1].stop_lon,
      rangeStops[1].stop_lat,
    ]);
    const currFormerLine = turf.lineSlice(
      currStopLocation,
      prevStopLocation,
      busTurfLine
    );
    fs.writeFileSync('./currFormerLine.json', JSON.stringify(currFormerLine));

    const expandWidth = 6;

    // Convert line to polygon
    const currFormerBuffer = turf.buffer(currFormerLine, expandWidth, { units: 'feet' });

    // const isComingShortly = turf.booleanPointOnLine(busLocation, currFormerLine);
    const isComingShortly = turf.booleanPointInPolygon(busLocation, currFormerBuffer);
    console.log('Is the bus coming shortly?', isComingShortly);

    // Checks to see if the bus is in between the stops - Previous and 3 Stops away
    const threeStopsAwayLocation = turf.point([
      rangeStops[3].stop_lon,
      rangeStops[3].stop_lat,
    ]);
    const prevFormerLine = turf.lineSlice(
      prevStopLocation,
      threeStopsAwayLocation,
      busTurfLine
    );
    const prevFormerBuffer = turf.buffer(prevFormerLine, expandWidth, { units: 'feet' });

    fs.writeFileSync('./prevFormerLine.json', JSON.stringify(prevFormerLine));

    // const isComingSoon = turf.booleanPointOnLine(busLocation, prevFormerLine);
    const isComingSoon = turf.booleanPointInPolygon(busLocation, prevFormerBuffer);
    console.log('Is the bus coming soon?', isComingSoon);

    // Checks to see if the bus is in between the stops - 3 Stops away and 5 Stops away
    const fiveStopsAwayLocation = turf.point([
      rangeStops[5].stop_lon,
      rangeStops[5].stop_lat,
    ]);
    const threeFormerLine = turf.lineSlice(
      threeStopsAwayLocation,
      fiveStopsAwayLocation,
      busTurfLine
    );
    const threeFormerBuffer = turf.buffer(threeFormerLine, expandWidth, { units: 'feet' });

    fs.writeFileSync('./threeFormerLine.json', JSON.stringify(threeFormerLine));

    // const isComing = turf.booleanPointOnLine(busLocation, threeFormerLine);
    const isComing = turf.booleanPointInPolygon(busLocation, threeFormerBuffer);
    console.log('Is the bus coming?', isComing, '\n');
  });

}

test('1615', '18');

const db = openDb(config);
const shapes = getShapesAsGeoJSON({
  shape_id: 'shp-10-02',
});
// Store in a JSON file
fs.writeFileSync('./shapes.json', JSON.stringify(shapes));

closeDb(db);
