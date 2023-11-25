import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const GOOGLE_API = process.env.GOOGLE_API;
const baseUrl = "https://routes.googleapis.com/directions/v2:computeRoutes";

const requestSettings = {
    method: 'GET',
    url: 'https://rt.scmetro.org/gtfsrt/vehicles',
    encoding: null
};

let data = {
    "origin": {
        "location": {
            "latLng": {
                "latitude": 36.975,
                "longitude": -122.025
            }
        }
    },
    "destination": {
        "location": {
            "latLng": {
                "latitude": 36.975,
                "longitude": -122.025
            }
        }
    },
    "travelMode": "DRIVE",
    "vehicleType": "BUS",

};



const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': GOOGLE_API,
    'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline'
};

const acceptedRoutes = [
    '10', '18', '20'
];

let vehicles = [];

try {
    const routesRequest = await fetch('https://rt.scmetro.org/gtfsrt/vehicles', {
        method: 'GET',
        encoding: null,
        headers: {
            'Content-Type': 'application/json',
        }
    });

    const routes = await routesRequest.arrayBuffer();

    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(routes));
    vehicles = feed.entity.filter(entity => {
        return entity.vehicle && acceptedRoutes.includes(entity.vehicle.trip?.routeId);
    });

    console.log("VEHICLES:", vehicles);
} catch (e) {
    console.log("ERROR GETTING ROUTES FROM SCMETRO:", e)
}

// const etaPromise = vehicles.map(async vehicle => {
//     // Change the data to the current vehicle
//     data.origin.location.latLng.latitude = vehicle.vehicle.position?.latitude;
//     data.origin.location.latLng.longitude = vehicle.vehicle.position?.longitude;
//
//     try {
//         const r = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
//             method: 'POST',
//             headers: headers,
//             body: JSON.stringify(data)
//         });
//
//         const j = await r.json();
//         console.log(j)
//
//         return {
//             vehicle: vehicle.vehicle,
//             route: j.routes[0]
//         }
//     } catch (e) {
//         console.log("ERROR GETTING ROUTE FROM GOOGLE:", e)
//     }
// });
//
// const etas = await Promise.all(etaPromise);
// console.log("ETAS:", etas);

// etas.forEach(eta => {
//     const seconds = eta.route.duration.substring(0, eta.route.duration.length - 1);
//     const minutes = Math.floor(seconds / 60);
//     console.log("Bus", eta.vehicle)
//     console.log("Taking", eta.route.duration, "or", minutes, "minutes until arrival\n");
// });