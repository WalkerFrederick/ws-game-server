import { type Server, Socket } from "socket.io";
import { CONSTANTS } from "../GameSocketServer";
import type { GameState } from "../types/types";
import checkRoundEnd from "./checkRoundEnd";

type startRoundArgs = {
    gameId: string;
    games: { [lobbyCode: string]: GameState };
    io: Server;
};

const startRound = (args: startRoundArgs) => {
    const { gameId, games, io } = args;

    // Start a new round
    const game = games[gameId];
    if (!game || game.isPaused) return; // Check if the game is paused before starting the round

    io.to(gameId).emit("server:start-round", { round: game.currentRound });
    game.currentRound++;

    let countdown = CONSTANTS.ROUND_TIME_LIMIT_SECONDS;

    // Emit the countdown event to the players in the game
    io.to(gameId).emit("server:round-countdown", { countdown });

    const countdownInterval = setInterval(() => {
        if (!game.isPaused) {
            countdown -= 1;
            if (countdown > 0 && !(game.players[0].latestRoundAction && game.players[1].latestRoundAction)) {
                io.to(gameId).emit("server:round-countdown", { countdown });
            } else {
                clearInterval(countdownInterval);

                if (game.isPaused) return; // Ensure the timer doesn't progress if the game is paused
                checkRoundEnd({ gameId, games, io });
            }
        }
    }, 1000);
};

export default startRound;
