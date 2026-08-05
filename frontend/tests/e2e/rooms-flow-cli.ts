import { runRoomFlows } from "./rooms-flow";

void runRoomFlows().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
