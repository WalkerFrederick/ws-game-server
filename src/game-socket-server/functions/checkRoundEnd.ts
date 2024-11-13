import { type Server, Socket } from "socket.io";
import { CONSTANTS } from "../GameSocketServer";
import type { GameState, LatestRoundResult } from "../types/types";
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

    const EXAMPLE_ROUND_RESULT: LatestRoundResult = {
        actionsToPlayOut: [
            { description: "player exmplUser's champion used Heavy Strike", playtime: 3000, gameStateSnapshot: game },
            { description: "they rolled a //d20=16 + //magic=3 = //total=19 for the attack roll", playtime: 3000, gameStateSnapshot: game },
            { description: "a //total=19 Hits player othrUser's champion", playtime: 3000, gameStateSnapshot: game },
            { description: "they deal //1d6=4 + //magic=3 = //total=7 damage", playtime: 3000, gameStateSnapshot: game },
            { description: "player othrUser's champion used Healing Words", playtime: 3000, gameStateSnapshot: game },
            { description: "they heal for //1d6=3", playtime: 3000, gameStateSnapshot: game },
        ],
        finalGameState: game,
        secondsToNextRound: CONSTANTS.MAX_ROUND_ACTION_REPLAY_SECONDS
    }

    // Emit round result once
    io.to(gameId).emit("server:round-result", EXAMPLE_ROUND_RESULT);

    // Emit round-end-timer countdown every second until the next round starts
    let countdown = CONSTANTS.MAX_ROUND_ACTION_REPLAY_SECONDS;
    const timerInterval = setInterval(() => {
        if (!game.isPaused) {
            io.to(gameId).emit("server:round-end-timer", { countdown });
            countdown -= 1;


            if (countdown <= 0 || game.players.every((p) => p.roundReady)) {
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
                            player.roundReady = false;
                        });

                        startRound({ gameId, games, io }); // Start the next round after countdown
                    }
                }
            }
        }
    }, 1000);
};

export default checkRoundEnd;
