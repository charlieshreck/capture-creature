// Entry point: create the game and start the loop.
import { Game } from './Game.js';

const game = new Game(document.getElementById('app'));
game.start();

// handy for tinkering in the browser console
window.eonsmith = game;
