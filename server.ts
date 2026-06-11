import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { setRealtimeServer } from "./src/server/realtime.ts";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || (dev ? "127.0.0.1" : "0.0.0.0");
const port = Number.parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

await app.prepare();

const httpServer = createServer((request, response) => {
  handle(request, response);
});

const io = new Server(httpServer, {
  path: "/api/socket",
  cors: {
    origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
    credentials: true
  }
});

setRealtimeServer(io);

io.on("connection", (socket) => {
  socket.join("smartable:global");

  socket.on("restaurant:join", (restaurantId: string) => {
    if (restaurantId) {
      socket.join(`restaurant:${restaurantId}`);
    }
  });

  socket.on("restaurant:leave", (restaurantId: string) => {
    if (restaurantId) {
      socket.leave(`restaurant:${restaurantId}`);
    }
  });
});

httpServer.listen(port, hostname, () => {
  console.log(`SmarTable is ready at http://${hostname}:${port}`);
});
