import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import fetch from 'node-fetch';
import {
    closeDb,
    getStops,
    getStopTimesUpdates,
    getTrips,
    getTripUpdates,
    getRiderTrips,
    openDb,
    getVehiclePositions
} from 'gtfs';
import {readFile} from "fs/promises";
import {URL} from "url";
import cron from "node-cron";

const config = JSON.parse(
    await readFile(new URL('./config.json', import.meta.url))
);


const stopId = '1615';

async function findBusArrivalTimes() {
    const db = openDb(config);

    try {
        const [destinedStop] = getStops({
            stop_code: stopId
        });

        // console.log('destined stop', destinedStop)

        const stopTimes = getStopTimesUpdates({
            stop_id: destinedStop.stop_id,
        });
        // console.log('stop times:', stopTimes);

        // Process the stopTimes as needed
        stopTimes.map(bus => {
            // console.log(bus);
            const [stopName] = getStops({
                stop_id: bus.stop_id,
            });
            const time = new Date(bus.arrival_timestamp);
            console.log(`${stopName.stop_name} - ${bus.route_id} will arive at ${time.toLocaleTimeString()}`);
        });
    } catch (error) {
        console.error('Error fetching stop times:', error);
    }

    closeDb(db);
}

cron.schedule('*/2 * * * *', async () => {
    console.log('Checking upcoming busses...');
    await findBusArrivalTimes();
});

await findBusArrivalTimes();


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

