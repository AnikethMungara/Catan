/**
 * Entry point: creates HTTP server and attaches WebSocket server.
 */

import { createServer } from "http";
import { CatanServer } from "./server.js";

const PORT = parseInt(process.env.PORT ?? "3001", 10);

const httpServer = createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "ok", service: "catan-server" }));
});

new CatanServer(httpServer);

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Catan server listening on port ${PORT}`);
});
