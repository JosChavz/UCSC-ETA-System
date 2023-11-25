"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var gtfs_1 = require("gtfs");
var turf = require("@turf/turf");
var fs = require("fs");
var config = undefined;
try {
    var data = fs.readFileSync('path/to/yourfile.json', 'utf8');
    config = JSON.parse(data);
}
catch (error) {
    console.error('Error reading the file:', error);
}
var db = (0, gtfs_1.openDb)(config);
var shapePoints = (0, gtfs_1.getShapes)({
    shape_id: 'shp-10-02',
});
var line = turf.lineString(shapePoints.map(function (point) { return [point.shape_pt_lon, point.shape_pt_lat]; }));
// Find the location of the both stops
var stop1 = (0, gtfs_1.getStops)({
    stop_code: '1615',
})[0];
var stop2 = (0, gtfs_1.getStops)({
    stop_code: '1616',
})[0];
// Convert to points
var stop1Location = turf.point([stop1.stop_lon, stop1.stop_lat]);
var stop2Location = turf.point([stop2.stop_lon, stop2.stop_lat]);
// Cut the line into just the stops
var sliced = turf.lineSlice(stop1Location, stop2Location, line);
// Get the current location of the bus
var bus = (0, gtfs_1.getVehiclePositions)({
    vehicle_id: '2226',
})[0];
var busses = (0, gtfs_1.getVehiclePositions)();
var validBus = busses.filter(function (bus) {
    var trip = (0, gtfs_1.getTrips)({
        trip_id: bus.trip_id,
        route_id: '10'
    });
    return trip.length > 0;
});
console.log(validBus);
var busLocation = turf.point([bus.longitude, bus.latitude]);
// Checks to see if the current bus location is on the line
var isOnLine = turf.booleanPointOnLine(busLocation, sliced, { epsilon: 0.0001 });
console.log('Is the bus on the route?', isOnLine);
// Check to see if bus is in between the stops
var dummyPointInBounds = turf.point([-122.06068773618074, 37.00011662530676]);
var dummyPointOutBounds = turf.point([-122.05679403106326, 37.000112581552976]);
var isOnLineInBounds = turf.booleanPointOnLine(dummyPointInBounds, sliced, { epsilon: 0.0001 });
var isOnLineOutBounds = turf.booleanPointOnLine(dummyPointOutBounds, sliced, { epsilon: 0.0001 });
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
(0, gtfs_1.closeDb)(db);
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
