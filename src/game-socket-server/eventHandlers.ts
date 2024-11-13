import type { Server, Socket } from "socket.io";
import { CONSTANTS } from "./GameSocketServer";
import startCountdown from "./functions/startCountdown";
import startRound from "./functions/startRound";
import type { GameState, Player } from "./types/types";

type handleClientJoinEventArgs = {
    username: string;
    gameId: string;
    games: { [lobbyCode: string]: GameState };
    socket: Socket;
    io: Server;
};

export const handleClientJoinEvent = (args: handleClientJoinEventArgs): void => {
    const { username, gameId, games, socket, io } = args;
    let game = games[gameId];

    // Check if the username is valid
    if (!username || username.trim() === "") {
        socket.emit("server:notification", {
            type: "error",
            message: "Invalid username. Please enter a valid username.",
        });
        return;
    }

    // Create a new game if it doesn't exist
    if (!game) {
        game = {
            players: [],
            currentRound: 1,
            timer: null,
            isStarted: false,
            isPaused: false,
            lobbyCode: gameId,
            latestRoundResult: null,
            winner: null,
        };
        games[gameId] = game;
        socket.emit("server:notification", {
            type: "success",
            message: "New game created. Waiting for another player.",
        });
    }

    // Check if username is already taken by a connected player in the game
    if (game.players.some((p) => p.username === username && !p.disconnected)) {
        socket.emit("server:notification", {
            type: "error",
            message: "Username is already taken in this game. Please choose a different username.",
        });
        return;
    }

    // Handle reconnection if the player already exists but was disconnected
    const existingPlayer = game.players.find((p) => p.username === username);
    if (existingPlayer) {
        existingPlayer.socketId = socket.id;
        existingPlayer.disconnected = false;

        // Clear any reconnection timeout
        if (existingPlayer.reconnectTimeout) clearInterval(existingPlayer.reconnectTimeout);

        socket.join(gameId);
        socket.emit("server:notification", { type: "success", message: "Reconnected to the game." });
        io.to(gameId).emit("server:player-reconnected", game);

        // Resume game if it was paused
        if (game.isPaused) {
            game.isPaused = false;
            io.to(gameId).emit("server:notification", { type: "info", message: "Resuming game..." });
        }
        return;
    }

    // Check for maximum players
    if (game.players.length >= 2) {
        socket.emit("server:notification", {
            type: "error",
            message: "Game is full. Unable to join.",
        });
        return;
    }

    // Add new player to the game
    const newPlayer: Player = {
        socketId: socket.id,
        username,
        matchReady: false,
        roundReady: false,
        disconnected: false,
    };
    game.players.push(newPlayer);

    // Join the game's room
    socket.join(gameId);
    socket.emit("server:notification", {
        type: "success",
        message: "Successfully joined the game.",
    });
    io.to(gameId).emit("server:waiting-for-players", game);

    // Notify both players to ready up once two players have joined
    if (game.players.length === 2) {
        io.to(gameId).emit("server:notification", {
            type: "info",
            message: "Both players have joined. Ready up to start the game.",
        });
        io.to(gameId).emit("server:waiting-for-ready", game);
    }
};

type handleClientReadyEventArgs = {
    gameId: string;
    games: { [lobbyCode: string]: GameState };
    socket: Socket;
    io: Server;
};

export const handleClientReadyEvent = (args: handleClientReadyEventArgs): void => {
    const { gameId, games, socket, io } = args;
    const game = games[gameId];

    if (!game || game.players.length < 2) {
        socket.emit("server:notification", {
            type: "error",
            message: "Cannot ready up until both players have joined.",
        });
        return;
    }
    if (game.isPaused) {
        socket.emit("server:notification", {
            type: "error",
            message: "Cannot ready up when game is paused.",
        });
        return;
    }


    const player = game.players.find((p) => p.socketId === socket.id);
    if (player) {
        if (game.isStarted) {
            //we want to do roundready
            player.roundReady = true
        } else {
            //matchReady
            player.matchReady = true;
            io.to(gameId).emit("server:player-ready-status", game);

            // Start the countdown if all players are ready
            if (game.players.every((p) => p.matchReady)) {
                startCountdown({ gameId, games, io });
            }
        }

    } else {
        socket.emit("server:notification", {
            type: "error",
            message: "Not in this game",
        });
        return;
    }
};

type handleClientConcedeEventArgs = {
    gameId: string;
    games: { [lobbyCode: string]: GameState };
    socket: Socket;
    io: Server;
};

export const handleClientConcedeEvent = (args: handleClientConcedeEventArgs): void => {
    const { gameId, games, socket, io } = args;
    const game = games[gameId];
    if (!game) return;

    const concedingPlayer = game.players.find((p) => p.socketId === socket.id);
    const remainingPlayer = game.players.find((p) => p.socketId !== socket.id);

    if (remainingPlayer) {
        game.winner = remainingPlayer;
        io.to(gameId).emit("server:game-over", game);
        io.to(gameId).emit("server:notification", {
            type: "info",
            message: `${concedingPlayer?.username} has conceded. ${remainingPlayer.username} wins!`,
        });
    }
    clearTimeout(game.timer as NodeJS.Timeout);
    delete games[gameId];
};

type handleClientDisconnectEventArgs = {
    games: { [lobbyCode: string]: GameState };
    socket: Socket;
    io: Server;
};

export const handleClientDisconnectEvent = (args: handleClientDisconnectEventArgs): void => {
    const { games, socket, io } = args;
    Object.keys(games).forEach((gameId) => {
        const game = games[gameId];
        const playerIndex = game.players.findIndex((p) => p.socketId === socket.id);

        if (playerIndex !== -1) {
            const disconnectedPlayer = game.players[playerIndex];
            disconnectedPlayer.disconnected = true;

            // Check if both players are disconnected
            const allDisconnected = game.players.every((p) => p.disconnected);
            if (allDisconnected) {
                // Clear intervals and delete the game
                if (disconnectedPlayer.reconnectTimeout) clearInterval(disconnectedPlayer.reconnectTimeout);
                if (game.timer) clearTimeout(game.timer);
                delete games[gameId];
                return;
            }

            // Remove player if game has not started or is paused
            if (!game.isStarted || game.isPaused) {
                game.players.splice(playerIndex, 1);
                if (game.players.length === 1) {
                    game.players[0].matchReady = false;
                    io.to(gameId).emit("server:waiting-for-players", game);
                }
                return;
            }

            disconnectedPlayer.disconnected = true;
            const remainingPlayer = game.players.find((p) => p.socketId !== socket.id);
            if (remainingPlayer) {
                io.to(remainingPlayer.socketId).emit("server:notification", {
                    type: "error",
                    message: `${disconnectedPlayer.username} has disconnected. The game is paused.`,
                });
            }

            game.isPaused = true;
            io.to(gameId).emit("server:player-disconnected", game);
            let countdown = CONSTANTS.RECONNECT_TIME_SECONDS;
            disconnectedPlayer.reconnectTimeout = setInterval(() => {
                countdown -= 1;
                if (remainingPlayer) {
                    io.to(remainingPlayer.socketId).emit("server:reconnect-timer", { countdown });
                }
                if (countdown <= 0) {
                    clearInterval(disconnectedPlayer.reconnectTimeout as NodeJS.Timeout);
                    if (remainingPlayer) {
                        game.winner = remainingPlayer;
                        io.to(gameId).emit("server:game-over", game);
                    }
                    delete games[gameId];
                }
            }, 1000);
        }
    });
};
