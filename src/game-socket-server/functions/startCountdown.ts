import { type Server, Socket } from "socket.io";
import { CONSTANTS } from "../GameSocketServer";
import type { GameState } from "../types/types";
import checkRoundEnd from "./checkRoundEnd";
import startRound from "./startRound";

type startRoundArgs = {
  gameId: string;
  games: { [lobbyCode: string]: GameState };
  io: Server;
};

const startCountdown = (args: startRoundArgs) => {
  const { gameId, games, io } = args;
  // Countdown before the match starts
  const game = games[gameId];
  if (!game) return;

  let countdown = CONSTANTS.COUNTDOWN_SECONDS;
  io.to(gameId).emit("server:game-countdown-starting", game);
  io.to(gameId).emit("server:countdown", { countdown });
  const countdownInterval = setInterval(() => {
    countdown -= 1;
    if (countdown > 0 && game.players.length === 2) {
      io.to(gameId).emit("server:countdown", { countdown });
    } else {
      clearInterval(countdownInterval);
      if (game.players.length === 2) {
        game.isStarted = true;
        io.to(gameId).emit("server:game-starting", game);
        io.to(gameId).emit("server:notification", { type: "success", message: "Game is starting!" });
        startRound({ gameId, games, io }); // Start the next round after countdown
      }
    }
  }, 1000);
};

export default startCountdown;
