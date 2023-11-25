import { closeDb, getStops, getTrips, openDb, getVehiclePositions, getShapes } from 'gtfs';
import * as turf from '@turf/turf';
import * as fs from "fs";
let config = undefined;
try {
    const data = fs.readFileSync('path/to/yourfile.json', 'utf8');
    config = JSON.parse(data);
}
catch (error) {
    console.error('Error reading the file:', error);
}
const db = openDb(config);
const shapePoints = getShapes({
    shape_id: 'shp-10-02',
});
const line = turf.lineString(shapePoints.map(point => [point.shape_pt_lon, point.shape_pt_lat]));
// Find the location of the both stops
const [stop1] = getStops({
    stop_code: '1615',
});
const [stop2] = getStops({
    stop_code: '1616',
});
// Convert to points
const stop1Location = turf.point([stop1.stop_lon, stop1.stop_lat]);
const stop2Location = turf.point([stop2.stop_lon, stop2.stop_lat]);
// Cut the line into just the stops
const sliced = turf.lineSlice(stop1Location, stop2Location, line);
// Get the current location of the bus
const [bus] = getVehiclePositions({
    vehicle_id: '2226',
});
const busses = getVehiclePositions();
const validBus = busses.filter(bus => {
    const trip = getTrips({
        trip_id: bus.trip_id,
        route_id: '10'
    });
    return trip.length > 0;
});
console.log(validBus);
const busLocation = turf.point([bus.longitude, bus.latitude]);
// Checks to see if the current bus location is on the line
const isOnLine = turf.booleanPointOnLine(busLocation, sliced, { epsilon: 0.0001 });
console.log('Is the bus on the route?', isOnLine);
// Check to see if bus is in between the stops
const dummyPointInBounds = turf.point([-122.06068773618074, 37.00011662530676]);
const dummyPointOutBounds = turf.point([-122.05679403106326, 37.000112581552976]);
const isOnLineInBounds = turf.booleanPointOnLine(dummyPointInBounds, sliced, { epsilon: 0.0001 });
const isOnLineOutBounds = turf.booleanPointOnLine(dummyPointOutBounds, sliced, { epsilon: 0.0001 });
console.log('TEST: Is the bus on the route? (should be true)', isOnLineInBounds);
console.log('TEST: Is the bus on the route? (should be false)', isOnLineOutBounds);
// Create a point for the bus's location
// const busLocation = turf.point([busLongitude, busLatitude]);
// Check if the point is on the line (within a specified tolerance)
// const isOnLine = turf.booleanPointOnLine(busLocation, line, { tolerance: 0.0001 }); // tolerance in degrees
// console.log('Is the bus on the route?', isOnLine);
// console.log(getShapes({
//     shape_id: 'shp-18-02',
// }))
// console.log('Routes', getRoutes({
//     route_id: '18',
// }));
// To get the stops for a route
// const tripId = getTrips({
//     route_id: '18',
// });
// const stopTimes = getStoptimes({
//     trip_id: tripId[0].trip_id,
// }, ['stop_id']);
// stopTimes.map(stop => {
//     const [stopName] = getStops({
//         stop_id: stop.stop_id,
//     });
//     console.log(stopName.stop_name);
// });
closeDb(db);
// const [vehicle] = getVehiclePositions({
//     vehicle_id: '2812',
// });
// const stopTimes = getStopTimesUpdates({
//     trip_id: vehicle.trip_id,
// });
//
// stopTimes.map(stops => {
//     console.log(stops);
//     const [stop] = getStops({
//         stop_id: stops.stop_id,
//     });
//     const time = new Date(stops.arrival_timestamp).toLocaleTimeString();
//     console.log(stop.stop_name, time);
// })
//# sourceMappingURL=index.js.map