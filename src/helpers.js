import {closeDb, getStops, getStopsAsGeoJSON, getStopTimesUpdates, openDb} from "gtfs";
import {readFile} from "fs/promises";
import {URL} from "url";

const config = JSON.parse(
    await readFile(new URL('./config.json', import.meta.url))
);

export async function validateBus(stop_code, route_id){
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
        stopContainsBus = validStops.some((bus) => bus.route_id === route_id)
    } catch (error) {
        console.log('Error fetching stop times:', error);
    }

    closeDb(db);
    return stopContainsBus;
}

export async function findBusArrivalTimes(stop_code) {
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