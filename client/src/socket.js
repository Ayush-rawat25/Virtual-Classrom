// src/socket.js
import { io } from "socket.io-client";
import config from "./config";

const socket = io(config.SERVER_URL);
export default socket;
