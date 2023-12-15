import { findBusArrivalTimes } from "./helpers.js";
import { Arrival } from "../types";

/**
 * Gets the estimated time from the bus that was passed through the parameters
 * Returns a date-time string
 * @param req
 * @param res
 */
export async function getEstimatedTime(req: any, res: any) {
  const { stop_id } = req.params;

  const arrivals: Arrival[] = await findBusArrivalTimes(stop_id);

  res.send(JSON.stringify(arrivals));
}