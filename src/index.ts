import {
  closeDb,
  getStops,
  getTrips,
  openDb,
  getVehiclePositions,
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
  Trip,
  VehiclePosition,
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

  // Get all the vehicle positions - RT
  const vehicles: VehiclePosition[] =
    getVehiclePositions() as VehiclePosition[];
  let busArr: Bus[] = [];

  // Iterate through all the vehicles and get the trip info for each
  // Only if the trip is on the route we want
  vehicles.forEach((bus: VehiclePosition) => {
    const [trip]: Trip[] = getTrips({
      trip_id: bus.trip_id,
      route_id: busCode,
    }) as Trip[];

    if (trip) {
      busArr.push({
        ...bus,
        ...trip,
      });
    }
  });

  if (busArr.length === 0) {
    console.log('No buses on the route');
    closeDb(db);
    return;
  }

  // Get the stops for the route
  let stops: StopCombination[] = [];
  const stopTimes: Stoptime[] = getStoptimes({
    trip_id: busArr[0].trip_id,
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

  // Get the shape points for the route
  const busRoutePoints: Shape[] = getShapes({
    shape_id: busArr[0].shape_id,
  }) as Shape[];

  // Save as a line using turf
  const busTurfLine = turf.lineString(
    busRoutePoints.map((point: Shape) => [
      point.shape_pt_lon,
      point.shape_pt_lat,
    ])
  );
  // Gets the location of the bus
  const busLocation = turf.point([busArr[0].longitude, busArr[0].latitude]);

  console.log('Bus:', busArr[0]);

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

  const isComingShortly = turf.booleanPointOnLine(busLocation, currFormerLine, {
    epsilon: 0.001,
  });
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

  fs.writeFileSync('./prevFormerLine.json', JSON.stringify(prevFormerLine));

  const isComingSoon = turf.booleanPointOnLine(busLocation, prevFormerLine, {
    epsilon: 0.001,
  });
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

  fs.writeFileSync('./threeFormerLine.json', JSON.stringify(threeFormerLine));

  const isComing = turf.booleanPointOnLine(busLocation, threeFormerLine, {
    epsilon: 0.001,
  });
  console.log('Is the bus coming?', isComing);
}

test('1615', '18');

const db = openDb(config);
const shapes = getShapesAsGeoJSON({
  shape_id: 'shp-10-02',
});
// Store in a JSON file
fs.writeFileSync('./shapes.json', JSON.stringify(shapes));
// const shapePoints = getShapes({
//     shape_id: 'shp-10-02',
// });
// const line = turf.lineString(shapePoints.map(point => [point.shape_pt_lon, point.shape_pt_lat]));
//
// // Find the location of the both stops
// const [stop1] = getStops({
//     stop_code: '1615',
// });
// const [stop2] = getStops({
//     stop_code: '1616',
// });
//
// // Convert to points
// const stop1Location = turf.point([stop1.stop_lon, stop1.stop_lat]);
// const stop2Location = turf.point([stop2.stop_lon, stop2.stop_lat]);
//
// // Cut the line into just the stops
// const sliced = turf.lineSlice(stop1Location, stop2Location, line);
//
// // Get the current location of the bus
// const [bus] = getVehiclePositions({
//     vehicle_id: '2226',
// });
//
// const busLocation = turf.point([bus.longitude, bus.latitude]);
//
// // Checks to see if the current bus location is on the line
// const isOnLine = turf.booleanPointOnLine(busLocation, sliced, {epsilon: 0.0001});
// console.log('Is the bus on the route?', isOnLine);
//
// // Check to see if bus is in between the stops
// const dummyPointInBounds = turf.point([-122.06068773618074, 37.00011662530676]);
// const dummyPointOutBounds = turf.point([-122.05679403106326, 37.000112581552976]);
// const isOnLineInBounds  = turf.booleanPointOnLine(dummyPointInBounds,  sliced, {epsilon: 0.0001});
// const isOnLineOutBounds = turf.booleanPointOnLine(dummyPointOutBounds, sliced, {epsilon: 0.0001});
//
// console.log('TEST: Is the bus on the route? (should be true)', isOnLineInBounds);
// console.log('TEST: Is the bus on the route? (should be false)', isOnLineOutBounds);
closeDb(db);
