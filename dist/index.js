import { closeDb, getStops, openDb, getShapes, getStoptimes, getShapesAsGeoJSON, } from 'gtfs';
import * as turf from '@turf/turf';
import * as fs from 'fs';
import geolib from 'geolib';
let config = undefined;
try {
    const data = fs.readFileSync('./db/config.json', 'utf8');
    config = JSON.parse(data);
}
catch (error) {
    console.error('Error reading the file:', error);
}
function test(stopCode, busCode) {
    let config = undefined;
    try {
        const data = fs.readFileSync('./db/config.json', 'utf8');
        config = JSON.parse(data);
    }
    catch (error) {
        console.error('Error reading the file:', error);
    }
    const db = openDb(config);
    // Get all busses from vehicle_positions
    const vehicles = db
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
    let stops = [];
    const stopTimes = getStoptimes({
        trip_id: vehicles[0].trip_id,
    });
    stopTimes.forEach((stopTime) => {
        const [stop] = getStops({
            stop_id: stopTime.stop_id,
        });
        stops.push(Object.assign(Object.assign({}, stopTime), stop));
    });
    // Finds the index of the current stop
    const currentStopIndex = stops.findIndex(stop => stop.stop_code === stopCode);
    // Gets the stops in the range of 5 stops before and the current stop
    const rangeStops = stops
        .slice(currentStopIndex - 5, currentStopIndex + 1)
        .reverse();
    /**** END HERE *****/
    /*** MOVE THIS TO ITS OWN DICTIONARY LATER ***/
    // Get the shape points for the route
    const busRoutePoints = getShapes({
        shape_id: vehicles[0].shape_id,
    });
    // Save as a line using turf
    const busTurfLine = turf.lineString(busRoutePoints.map((point) => [
        point.shape_pt_lon,
        point.shape_pt_lat,
    ]));
    /******* END HERE ******/
    const busStationLocation = turf.point([-122.02460130725074, 36.97108991791251]);
    // Loop through the buses to know their location ETA
    vehicles.forEach((bus) => {
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
        const currFormerLine = turf.lineSlice(currStopLocation, prevStopLocation, busTurfLine);
        fs.writeFileSync('./currFormerLine.json', JSON.stringify(currFormerLine));
        const BROSFEET = 6;
        // Convert line to polygon
        const currFormerBuffer = turf.buffer(currFormerLine, BROSFEET, { units: 'feet' });
        // const isComingShortly = turf.booleanPointOnLine(busLocation, currFormerLine);
        const isComingShortly = turf.booleanPointInPolygon(busLocation, currFormerBuffer);
        console.log('Is the bus coming shortly?', isComingShortly);
        // Checks to see if the bus is in between the stops - Previous and 3 Stops away
        const threeStopsAwayLocation = turf.point([
            rangeStops[3].stop_lon,
            rangeStops[3].stop_lat,
        ]);
        const prevFormerLine = turf.lineSlice(prevStopLocation, threeStopsAwayLocation, busTurfLine);
        const prevFormerBuffer = turf.buffer(prevFormerLine, BROSFEET, { units: 'feet' });
        fs.writeFileSync('./prevFormerLine.json', JSON.stringify(prevFormerLine));
        // const isComingSoon = turf.booleanPointOnLine(busLocation, prevFormerLine);
        const isComingSoon = turf.booleanPointInPolygon(busLocation, prevFormerBuffer);
        console.log('Is the bus coming soon?', isComingSoon);
        // Checks to see if the bus is in between the stops - 3 Stops away and 5 Stops away
        const fiveStopsAwayLocation = turf.point([
            rangeStops[5].stop_lon,
            rangeStops[5].stop_lat,
        ]);
        const threeFormerLine = turf.lineSlice(threeStopsAwayLocation, fiveStopsAwayLocation, busTurfLine);
        const threeFormerBuffer = turf.buffer(threeFormerLine, BROSFEET, { units: 'feet' });
        fs.writeFileSync('./threeFormerLine.json', JSON.stringify(threeFormerLine));
        // const isComing = turf.booleanPointOnLine(busLocation, threeFormerLine);
        const isComing = turf.booleanPointInPolygon(busLocation, threeFormerBuffer);
        console.log('Is the bus coming?', isComing, '\n');
        // const toleranceDistance = 0.01
        // // Adjusted approach for checking if the bus is coming shortly
        // const distanceToCurrFormerLine = turf.pointToLineDistance(busLocation, currFormerLine, { units: 'miles' });
        // console.log('distanceToCurrFormerLine', distanceToCurrFormerLine)
        // const a = distanceToCurrFormerLine <= toleranceDistance; // toleranceDistance is the maximum distance you consider 'on the line'
        // console.log('Is the bus coming shortly? a', a);
        //
        // // Adjusted approach for checking if the bus is coming soon
        // const distanceToPrevFormerLine = turf.pointToLineDistance(busLocation, prevFormerLine, { units: 'miles' });
        // console.log('distanceToPrevFormerLine', distanceToPrevFormerLine)
        // const b = distanceToPrevFormerLine <= toleranceDistance;
        // console.log('Is the bus coming soon? b', b);
        //
        // // Adjusted approach for checking if the bus is coming
        // const distanceToThreeFormerLine = turf.pointToLineDistance(busLocation, threeFormerLine, { units: 'miles' });
        // console.log('distanceToThreeFormerLine', distanceToThreeFormerLine)
        // const c = distanceToThreeFormerLine <= toleranceDistance;
        // console.log('Is the bus coming? c', c);
    });
    console.log('\nUSING GEOLIB NOW\n');
    vehicles.forEach((bus) => {
        console.log(`Bus ${bus.vehicle_id} - route ${bus.route_id} is at ${bus.latitude}, ${bus.longitude}`);
        const busLocation = { latitude: bus.latitude, longitude: bus.longitude };
        const busStationLocation = { latitude: -122.02460130725074, longitude: 36.97108991791251 };
        const toleranceDistance = 0.01;
        // Check if the bus is at the station
        if (geolib.isPointWithinRadius(busLocation, busStationLocation, 321)) {
            console.log("This bus is currently at or near the station. Skipping...");
            return;
        }
        // Calculate distances to lines for 'coming shortly', 'coming soon', etc.
        const isComingShortly = geolib.getDistanceFromLine(busLocation, { latitude: rangeStops[0].stop_lat, longitude: rangeStops[0].stop_lon }, { latitude: rangeStops[1].stop_lat, longitude: rangeStops[1].stop_lon }) <= toleranceDistance;
        console.log('Is the bus coming shortly?', isComingShortly);
        // Similar checks for isComingSoon and isComing with respective stop locations
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
//# sourceMappingURL=index.js.map