import type { Server, Socket } from "socket.io";

import {
  handleClientConcedeEvent,
  handleClientDisconnectEvent,
  handleClientJoinEvent,
  handleClientReadyEvent,
} from "./eventHandlers";
import { type GameState, Player } from "./types/types";

// GAMES
const games: { [lobbyCode: string]: GameState } = {}; // Stores all active games by gameId

// CONSTANTS
export const CONSTANTS = {
  ROUND_TIME_LIMIT_SECONDS: 8,
  MAX_ROUNDS: 4,
  COUNTDOWN_SECONDS: 5,
  RECONNECT_TIME_SECONDS: 60,
  ROUND_BUFFER_SECONDS: 3,
};
// Initializes socket connections and event listeners
export default function initializeGameSocketServer(io: Server) {
  io.on("connection", (socket: Socket) => {
    // Handle player joining a game
    socket.on("client:join-game", ({ gameId, username }) => {
      handleClientJoinEvent({ gameId, games, username, socket, io });
    });

    // Handle player ready status
    socket.on("client:player-ready", ({ gameId }) => {
      handleClientReadyEvent({ gameId, games, socket, io });
    });

    // Handle player choice submission for the current round
    socket.on("client:make-choice", ({ gameId, choice }) => {});

    // Handle player conceding the game
    socket.on("client:concede", ({ gameId }) => {
      handleClientConcedeEvent({ gameId, games, socket, io });
    });

    // Handle player disconnection and reconnection countdown
    socket.on("disconnect", () => {
      handleClientDisconnectEvent({ games, socket, io });
    });
  });
}
