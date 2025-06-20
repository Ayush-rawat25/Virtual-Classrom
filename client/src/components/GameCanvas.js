// src/components/GameCanvas.js
import React, { useEffect, useRef, useState } from "react";
import socket from "../socket";

const GameCanvas = ({ userId, role, room }) => {
  const canvasRef = useRef(null);
  const [players, setPlayers] = useState({});


  useEffect(() => {
    socket.emit("join", { userId, role, room });
    socket.on("players", setPlayers);
    return () => socket.off("players");
  }, [userId, role, room]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const render = () => {
      if (!ctx || !bg || !avatar) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

      Object.entries(players).forEach(([id, p]) => {
        const size = 40;
        ctx.drawImage(avatar, p.x, p.y, size, size);
        ctx.fillStyle = "black";
        ctx.font = "12px sans-serif";
        ctx.fillText(p.role, p.x, p.y - 5);
      });

      requestAnimationFrame(render);
    };

    render();
  }, [players]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const movement = {};
      if (e.key === "ArrowUp") movement.y = -5;
      if (e.key === "ArrowDown") movement.y = 5;
      if (e.key === "ArrowLeft") movement.x = -5;
      if (e.key === "ArrowRight") movement.x = 5;
      socket.emit("move", movement);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      style={{ border: "2px solid black", background: "#ccc" }}
    />
  );
};

export default GameCanvas;
