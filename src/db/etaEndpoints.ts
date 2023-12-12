import { findBusArrivalTimes } from "./helpers.js";

export async function getEstimatedTime(req: any, res: any) {
  const { stop_id } = req.params;

  await findBusArrivalTimes(stop_id);

  res.send('Hello World!');
}