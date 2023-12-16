export interface Arrival {
    route_id: string,
    arrival_timestamp: number,
}

export interface VehiclePosition {
    update_id: string,
    bearing: number,
    latitude: number,
    longitude: number,
    speed: number,
    trip_id: string,
    vehicle_id: string,
    timestamp: Date,
    isUpdated: number,
}

export interface Trip {
    route_id: string,
    service_id: string,
    trip_id: string,
    trip_headsign: string,
    trip_short_name: string | null,
    direction_id: number,
    block_id: string,
    shape_id: string,
    wheelchair_accessible: number,
    bikes_allowed: number,
}

export interface Bus extends VehiclePosition, Trip {}

export interface Shape {
    shape_id: string,
    shape_pt_lat: number,
    shape_pt_lon: number,
    shape_pt_sequence: number,
    shape_dist_traveled: number
}

export interface Stoptime {
    trip_id: string,
    arrival_time: string,
    arrival_timestamp: number,
    departure_time: string,
    departure_timestamp: number,
    stop_id: string,
    stop_sequence: number,
    stop_headsign: string,
    pickup_type: number,
    drop_off_type: number,
    continuous_pickup: null | string,
    continuous_drop_off: null | string,
    shape_dist_traveled: number,
    timepoint: number
}

export interface Stop {
    stop_id: string,
    stop_code: string,
    stop_name: string,
    tts_stop_name: null,
    stop_desc: null,
    stop_lat: number,
    stop_lon: number,
    zone_id: null,
    stop_url: string,
    location_type: null,
    parent_station: null,
    stop_timezone: null,
    wheelchair_boarding: number,
    level_id: null,
    platform_code: null
}

export interface Route {
    route_id: string
    agency_id: string
    route_short_name: string
    route_long_name: string
    route_desc: string
    route_type: number
    route_url: string
    route_color: string
    route_text_color: string
    route_sort_order: number
    continuous_pickup: number
    continuous_drop_off: number
    network_id: string
}

export interface StopCombination extends Stop, Stoptime {}