import { type Server, Socket } from "socket.io";
import { CONSTANTS } from "../GameSocketServer";
import type { GameState } from "../types/types";
import startRound from "./startRound";

type checkRoundEndArgs = {
  gameId: string;
  games: { [lobbyCode: string]: GameState };
  io: Server;
};

const checkRoundEnd = (args: checkRoundEndArgs) => {
  const { gameId, games, io } = args;
  // Check if the round has ended based on players' choices
  const game = games[gameId];
  if (!game || game.isPaused) return; // Verify game is not paused

  const choices = game.players.map((player) => player.latestRoundAction);
  //if (choices.includes(undefined)) return; // Wait until both players have made a choice

  clearTimeout(game.timer as NodeJS.Timeout);
  const [player1, player2] = game.players;

  // Emit round result once
  io.to(gameId).emit("server:round-result", {});

  // Emit round-end-timer countdown every second until the next round starts
  let countdown = CONSTANTS.ROUND_BUFFER_SECONDS;
  const timerInterval = setInterval(() => {
    if (game.isPaused) {
      clearInterval(timerInterval);
      return; // Stop if the game is paused
    }

    io.to(gameId).emit("server:round-end-timer", { countdown });
    countdown -= 1;

    if (countdown <= 0) {
      clearInterval(timerInterval);
      if (!game.isPaused) {
        // Check for game over conditions
        if (game.winner || game.currentRound >= CONSTANTS.MAX_ROUNDS) {
          io.to(gameId).emit("server:game-over", game);
          delete games[gameId];
        } else {
          // Start the round once the countdown is finished
          game.players.forEach((player) => {
            player.latestRoundAction = undefined;
          });
          io.to(gameId).emit("server:start-round", { round: game.currentRound });
          game.currentRound++;
          startRound({ gameId, games, io }); // Start the next round after countdown
        }
      }
    }
  }, 1000);
};

export default checkRoundEnd;
