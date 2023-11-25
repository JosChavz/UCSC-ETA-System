import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import fetch from 'node-fetch';
import {closeDb, getStopTimesUpdates, getTrips, getTripUpdates, openDb} from 'gtfs';
import {readFile} from "fs/promises";
import {URL} from "url";

const config = JSON.parse(
    await readFile(new URL('./config.json', import.meta.url))
);

const acceptedRoutes = [
    '10', '18', '20'
];

let vehicles = [];

const loadTripUpdates = async () => {
    const routesRequest = await fetch('https://rt.scmetro.org/gtfsrt/trips', {
        method: 'GET',
        encoding: null,
        headers: {
            'Content-Type': 'application/json',
        }
    });

    const routes = await routesRequest.arrayBuffer();

    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(routes));

    console.log("UPDATES ENTITY:", feed.entity[0].tripUpdate);
}

const getAllVehicles = async () => {
    const routesRequest = await fetch('https://rt.scmetro.org/gtfsrt/vehicles', {
        method: 'GET',
        encoding: null,
        headers: {
            'Content-Type': 'application/json',
        }
    });

    const routes = await routesRequest.arrayBuffer();

    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(routes));

    vehicles = feed.entity;
}
const filterAcceptedVehicles = () => {
    vehicles = vehicles.filter(entity => {
        // console.log("ENTITY ROUTE ID:", entity.vehicle.trip?.routeId);
        // console.log("ENTITY VEHICLE ID:", entity.vehicle.vehicle?.id);
        // console.log("ACCEPTED ROUTES:", acceptedRoutes.includes(entity.vehicle.trip?.routeId));
        return entity.vehicle && acceptedRoutes.includes(entity.vehicle.trip?.routeId);
    });
}
const getVehicleETAs = async () => {
    // for each vehicle
    for (const vehicle of vehicles) {
        // get the trip for this vehicle
        // console.log("VEHICLE:", vehicle);
        const trip = getTrips({
            trip_id: vehicle.vehicle.trip.tripId,
        });
        // console.log("TRIP:", trip)
    }
};

const db = openDb(config);

// await loadTripUpdates();
// await getAllVehicles();
// filterAcceptedVehicles();
// await getVehicleETAs();

const stopId = '1615'; // Replace with your actual stop ID

async function findBusArrivalTimes() {
    try {
        const stopTimes = getStopTimesUpdates({
            stop_id: stopId
        });

        // Process the stopTimes as needed
        console.log(stopTimes);
    } catch (error) {
        console.error('Error fetching stop times:', error);
    }
}

findBusArrivalTimes();


closeDb(db);