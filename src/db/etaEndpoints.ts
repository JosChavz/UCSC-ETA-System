import { findBusArrivalTimes } from "./helpers.js";

/**
 * Gets the estimated time from the bus that was passed through the parameters
 * Returns a date-time string
 * @param req
 * @param res
 */
export async function getEstimatedTime(req: any, res: any) {
  const { stop_id } = req.params;

  await findBusArrivalTimes(stop_id);
  console.log();

  res.send('Hello World!');
}