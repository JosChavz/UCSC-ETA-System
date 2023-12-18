import {
  findBusArrivalTimes,
  stopsAwayFromDestination,
} from './endpointHelper.js';
import { Arrival } from '../types';

/**
 * Gets the estimated time from the bus that was passed through the parameters
 * Returns a date-time string
 * @param req
 * @param res
 */
export async function getEstimatedTime(req: any, res: any) {
  const { stop_id } = req.params;

  let arrivals: Arrival[] = [];

  try {
    arrivals = await findBusArrivalTimes(stop_id);
  } catch (e) {
    console.error(e);
  }
  res.send(JSON.stringify(arrivals));
}

/**
 * Gets the number of stops away from the destination
 * @param req
 * @param res
 */
export async function getStopsAway(req: any, res: any) {
  const { stop_id } = req.params;
  const { bus_id } = req.query;
  let stopsAway: number[] = [];

  try {
    stopsAway = await stopsAwayFromDestination(stop_id, bus_id);
  } catch (e) {
    console.error(e);
  }

  res.send(JSON.stringify(stopsAway));
}
