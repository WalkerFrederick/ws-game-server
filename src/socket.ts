import { Server, Socket } from "socket.io";

// Player and Game interfaces
interface Player {
    id: string;
    username: string;
    choice: 'rock' | 'paper' | 'scissors' | null; // Player's choice in the current round
    score: number; // Player's current score
    isReady: boolean; // Status indicating if the player is ready to start
    disconnected: boolean; // Indicates if player is currently disconnected
    reconnectTimeout?: NodeJS.Timeout | null; // Timer for reconnection countdown
}

interface Game {
    players: Player[]; // List of players in the game
    round: number; // Current round number
    timer: NodeJS.Timeout | null; // Timer for round timeouts
    isStarted: boolean; // Indicates if the game has started
    isPaused: boolean; // Indicates if the game is paused (e.g., due to disconnection)
    name: string;
    winner?: string;
}

// Game settings and global storage for active games
const games: { [gameId: string]: Game } = {}; // Stores all active games by gameId
const ROUND_TIME_LIMIT_SECONDS = 8; // Time limit per round in seconds
const MAX_ROUNDS = 3; // Maximum number of rounds in a game
const WINNING_SCORE = 2; // Score required to win the game
const COUNTDOWN_SECONDS = 5; // Countdown time before the game starts
const RECONNECT_TIME_SECONDS = 15; // Allowed time for a player to reconnect
const ROUND_BUFFER_SECONDS = 30; // Buffer time before starting a new round after one ends

// Initializes socket connections and event listeners
export default function initializeSocket(io: Server) {
    io.on("connection", (socket: Socket) => {
        // Handle player joining a game
        socket.on("client:join-game", ({ gameId, username }) => {
            let game = games[gameId];

            // Create a new game if it doesn't exist
            if (!game) {
                game = { players: [], round: 1, timer: null, isStarted: false, isPaused: false, name: gameId };
                games[gameId] = game;
                socket.emit("server:notification", { type: "success", message: "New game created. Waiting for another player." });
            }

            // Check if username is already taken in the game
            if (game.players.some((p) => p.username === username && !p.disconnected)) {
                socket.emit("server:notification", { type: "error", message: "Username is already taken in this game. Please choose a different username." });
                return;
            }

            const existingPlayer = game.players.find((p) => p.username === username);

            // Handle reconnection for an existing player
            if (existingPlayer) {
                existingPlayer.id = socket.id; // Update socket ID
                existingPlayer.disconnected = false;
                if (existingPlayer.reconnectTimeout) clearInterval(existingPlayer.reconnectTimeout); // Clear previous timeout

                socket.join(gameId);
                socket.emit("server:notification", { type: "success", message: "Reconnected to the game." });
                io.to(gameId).emit("server:player-reconnected", game);

                // Resume game if it was paused
                if (game.isPaused) {
                    game.isPaused = false;
                    io.to(gameId).emit("server:notification", { type: "info", message: "Resuming game..." });
                    startRound(io, gameId);
                }
                return;
            }

            // Check for maximum players and valid username
            if (game.players.length >= 2 || !username || username.trim() === "") {
                socket.emit("server:notification", { type: "error", message: "Game is full or invalid username." });
                return;
            }

            // Add a new player to the game
            const newPlayer: Player = { id: socket.id, username, choice: null, score: 0, isReady: false, disconnected: false };
            game.players.push(newPlayer);

            socket.join(gameId);
            socket.emit("server:notification", { type: "success", message: "Successfully joined the game." });
            io.to(gameId).emit("server:waiting-for-players", game);

            // Notify both players to ready up once two players have joined
            if (game.players.length === 2) {
                io.to(gameId).emit("server:notification", { type: "info", message: "Both players have joined. Ready up to start the game." });
                io.to(gameId).emit("server:waiting-for-ready", game);
            }
        });

        // Handle player ready status
        socket.on("client:player-ready", ({ gameId }) => {
            const game = games[gameId];
            if (!game || game.players.length < 2 || game.isStarted) {
                socket.emit("server:notification", { type: "error", message: "Cannot ready up until both players have joined." });
                return;
            }

            const player = game.players.find((p) => p.id === socket.id);
            if (player) {
                player.isReady = true;
                io.to(gameId).emit("server:player-ready-status", game);

                // Start the countdown if all players are ready
                if (game.players.every((p) => p.isReady)) {
                    startCountdown(io, gameId);
                }
            }
        });

        // Handle player choice submission for the current round
        socket.on("client:make-choice", ({ gameId, choice }) => {
            const game = games[gameId];
            if (!game) return;

            const player = game.players.find((p) => p.id === socket.id);
            if (player && !player.choice) {
                player.choice = choice; // Record player choice
                checkRoundEnd(io, gameId);
            }
        });

        // Handle player conceding the game
        socket.on("client:concede", ({ gameId }) => {
            const game = games[gameId];
            if (!game) return;

            const concedingPlayer = game.players.find((p) => p.id === socket.id);
            const remainingPlayer = game.players.find((p) => p.id !== socket.id);

            if (remainingPlayer) {
                game.winner = remainingPlayer.username
                io.to(gameId).emit("server:game-over", game);
                io.to(gameId).emit("server:notification", { type: "info", message: `${concedingPlayer?.username} has conceded. ${remainingPlayer.username} wins!` });
            }
            clearTimeout(game.timer as NodeJS.Timeout);
            delete games[gameId];
        });

        // Handle player disconnection and reconnection countdown
        socket.on("disconnect", () => {
            Object.keys(games).forEach((gameId) => {
                const game = games[gameId];
                const playerIndex = game.players.findIndex((p) => p.id === socket.id);

                if (playerIndex !== -1) {
                    const disconnectedPlayer = game.players[playerIndex];

                    // Remove player if game has not started or is paused
                    if (!game.isStarted || game.isPaused) {
                        game.players.splice(playerIndex, 1);
                        if (game.players.length === 1) {
                            game.players[0].isReady = false
                            io.to(gameId).emit("server:waiting-for-players", game);
                        }
                        return;
                    }

                    disconnectedPlayer.disconnected = true;
                    const remainingPlayer = game.players.find((p) => p.id !== socket.id);
                    if (remainingPlayer) {
                        io.to(remainingPlayer.id).emit("server:notification", { type: "error", message: `${disconnectedPlayer.username} has disconnected. The game is paused.` });
                    }

                    game.isPaused = true;
                    io.to(gameId).emit("server:player-disconnected", game);
                    let countdown = RECONNECT_TIME_SECONDS;
                    disconnectedPlayer.reconnectTimeout = setInterval(() => {
                        countdown -= 1;
                        if (remainingPlayer) {
                            io.to(remainingPlayer.id).emit("server:reconnect-timer", { countdown });
                        }
                        if (countdown <= 0) {
                            clearInterval(disconnectedPlayer.reconnectTimeout as NodeJS.Timeout);
                            if (remainingPlayer) {
                                game.winner = remainingPlayer.username
                                io.to(gameId).emit("server:game-over", game);
                            }
                            delete games[gameId];
                        }
                    }, 1000);
                }
            });
        });
    });
}

// Countdown before the match starts
function startCountdown(io: Server, gameId: string) {
    const game = games[gameId];
    if (!game) return;

    let countdown = COUNTDOWN_SECONDS;
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
                startRound(io, gameId);
            }
        }
    }, 1000);
}

// Start a new round
function startRound(io: Server, gameId: string) {
    const game = games[gameId];
    if (!game || game.isPaused) return; // Check if the game is paused before starting the round

    let countdown = ROUND_TIME_LIMIT_SECONDS;

    // Emit the countdown event to the players in the game
    io.to(gameId).emit("server:round-countdown", { countdown });

    const countdownInterval = setInterval(() => {
        countdown -= 1;
        if (game.isPaused) {
            clearInterval(countdownInterval);
            return; // Stop countdown if the game is paused
        }

        if (countdown > 0) {
            io.to(gameId).emit("server:round-countdown", { countdown });
        } else {
            clearInterval(countdownInterval);

            // Start the round once the countdown is finished
            game.players.forEach((player) => (player.choice = null));
            io.to(gameId).emit("server:start-round", { round: game.round });

            if (game.isPaused) return; // Ensure the timer doesn't progress if the game is paused

            game.players.forEach((player) => {
                if (!player.choice) {
                    player.choice = getRandomChoice();
                }
            });
            checkRoundEnd(io, gameId);
        }
    }, 1000);
}

// Check if the round has ended based on players' choices
function checkRoundEnd(io: Server, gameId: string) {
    const game = games[gameId];
    if (!game || game.isPaused) return; // Verify game is not paused

    const choices = game.players.map((player) => player.choice);
    if (choices.includes(null)) return; // Wait until both players have made a choice

    clearTimeout(game.timer as NodeJS.Timeout);
    const [player1, player2] = game.players;

    const winner = determineWinner(player1.choice as string, player2.choice as string);
    if (winner === 1) player1.score++;
    if (winner === 2) player2.score++;

    // Emit round result once
    io.to(gameId).emit("server:round-result", {
        player1: { id: player1.id, choice: player1.choice, score: player1.score },
        player2: { id: player2.id, choice: player2.choice, score: player2.score },
    });

    // Check for game over conditions
    if (player1.score >= WINNING_SCORE || player2.score >= WINNING_SCORE || game.round >= MAX_ROUNDS) {
        const gameWinner = player1.score > player2.score ? player1 : player2;
        game.winner = gameWinner.username
        io.to(gameId).emit("server:game-over", game);
        delete games[gameId];
    } else {
        game.round++;

        // Emit round-end-timer countdown every second until the next round starts
        let countdown = ROUND_BUFFER_SECONDS / 10;
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
                    startRound(io, gameId); // Start the next round after countdown
                }
            }
        }, 1000);
    }
}

// Determine winner of the round based on player choices
function determineWinner(choice1: string, choice2: string): number {
    if (choice1 === choice2) return 0; // Draw
    if ((choice1 === 'rock' && choice2 === 'scissors') ||
        (choice1 === 'paper' && choice2 === 'rock') ||
        (choice1 === 'scissors' && choice2 === 'paper')) {
        return 1; // Player 1 wins
    }
    return 2; // Player 2 wins
}

// Generate a random choice for a player who times out
function getRandomChoice(): 'rock' | 'paper' | 'scissors' {
    const choices: ('rock' | 'paper' | 'scissors')[] = ['rock', 'paper', 'scissors'];
    return choices[Math.floor(Math.random() * choices.length)];
}