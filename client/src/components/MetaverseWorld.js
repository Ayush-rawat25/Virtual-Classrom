import React, { useRef, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text, Box, Sphere, Cylinder } from "@react-three/drei";
import * as THREE from "three";
import socket from "../socket";

const MetaverseWorld = ({ user, onClassroomEnter, onClassroomExit, currentClassroom }) => {
  const { camera } = useThree();
  const playerRef = useRef();
  const [players, setPlayers] = useState({});
  const [playerPosition, setPlayerPosition] = useState([0, 0, 0]);
  const [nearClassroom, setNearClassroom] = useState(null);
  const [pendingRequest, setPendingRequest] = useState(false);
  const [requestedClassrooms, setRequestedClassrooms] = useState(new Set());
  const [mySocketId, setMySocketId] = useState(null);

  // Classroom definitions
  const classrooms = [
    { id: "math101", name: "Mathematics 101", position: [-15, 0, -10], color: "#4CAF50" },
    { id: "science201", name: "Science Lab", position: [15, 0, -10], color: "#2196F3" },
    { id: "english301", name: "English Literature", position: [0, 0, -20], color: "#FF9800" },
    { id: "history401", name: "History", position: [-15, 0, 10], color: "#9C27B0" },
    { id: "art501", name: "Art Studio", position: [15, 0, 10], color: "#E91E63" }
  ];

  // Socket connection and player management
  useEffect(() => {
    socket.emit("join", { userId: user.id, role: user.role, room: "campus", avatar: user.avatar });
    
    socket.on("players", (newPlayers) => {
      setPlayers(newPlayers);
    });

    socket.on("classroomRequest", ({ studentId, studentName, classroomId }) => {
      if (user.role === "teacher") {
        const classroom = classrooms.find(c => c.id === classroomId);
        if (classroom) {
          const accept = window.confirm(`${studentName} wants to join ${classroom.name}. Accept?`);
          socket.emit("classroomResponse", { studentId, classroomId, accepted: accept });
        }
      }
    });

    socket.on("classroomResponse", ({ accepted, classroomId }) => {
      setPendingRequest(false);
      setRequestedClassrooms(prev => {
        const newSet = new Set(prev);
        newSet.delete(classroomId);
        return newSet;
      });
      
      if (accepted) {
        const classroom = classrooms.find(c => c.id === classroomId);
        if (classroom) {
          // Join classroom through server
          socket.emit("joinClassroom", {
            userId: user.id,
            userName: user.name,
            role: user.role,
            classroomId: classroom.id
          });
          // The server will handle the actual joining and emit appropriate events
        }
      } else {
        alert("Your request to join the classroom was denied.");
      }
    });

    socket.on("noTeacherInClassroom", ({ classroomId }) => {
      setPendingRequest(false);
      setRequestedClassrooms(prev => {
        const newSet = new Set(prev);
        newSet.delete(classroomId);
        return newSet;
      });
      alert("No teacher is currently in this classroom. Please wait for a teacher to join first.");
    });

    socket.on("classroomLocked", ({ classroomId }) => {
      setPendingRequest(false);
      setRequestedClassrooms(prev => {
        const newSet = new Set(prev);
        newSet.delete(classroomId);
        return newSet;
      });
      alert("This classroom is currently locked. Please wait for the teacher to unlock it.");
    });

    socket.on("classroomAccessDenied", ({ classroomId, reason }) => {
      setPendingRequest(false);
      setRequestedClassrooms(prev => {
        const newSet = new Set(prev);
        newSet.delete(classroomId);
        return newSet;
      });
      alert(`Access denied: ${reason}`);
    });

    socket.on("classroomJoined", ({ classroomId }) => {
      const classroom = classrooms.find(c => c.id === classroomId);
      if (classroom) {
        onClassroomEnter(classroom);
      }
    });

    // Listen for socket id
    setMySocketId(socket.id);
    socket.on("connect", () => setMySocketId(socket.id));

    return () => {
      socket.off("players");
      socket.off("classroomRequest");
      socket.off("classroomResponse");
      socket.off("noTeacherInClassroom");
      socket.off("classroomLocked");
      socket.off("classroomAccessDenied");
      socket.off("classroomJoined");
    };
  }, [user, onClassroomEnter]);

  // Movement controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (currentClassroom) return; // Can't move when in classroom
      
      const speed = 0.5;
      const newPosition = [...playerPosition];
      
      switch (e.key) {
        case "ArrowUp":
        case "w":
          newPosition[2] -= speed;
          break;
        case "ArrowDown":
        case "s":
          newPosition[2] += speed;
          break;
        case "ArrowLeft":
        case "a":
          newPosition[0] -= speed;
          break;
        case "ArrowRight":
        case "d":
          newPosition[0] += speed;
          break;
        case "Enter":
          if (nearClassroom && !pendingRequest && !requestedClassrooms.has(nearClassroom.id)) {
            if (user.role === "student") {
              setPendingRequest(true);
              setRequestedClassrooms(prev => new Set(prev).add(nearClassroom.id));
              console.log("Student requesting to join classroom:", nearClassroom.id);
              socket.emit("classroomRequest", {
                studentId: user.id,
                studentName: user.name,
                classroomId: nearClassroom.id
              });
            } else {
              console.log("Teacher entering classroom:", nearClassroom.id);
              onClassroomEnter(nearClassroom);
            }
          }
          break;
      }
      
      setPlayerPosition(newPosition);
      socket.emit("move", { x: newPosition[0], y: newPosition[1], z: newPosition[2] });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [playerPosition, currentClassroom, nearClassroom, user, onClassroomEnter, pendingRequest]);

  // Update camera to follow player
  useFrame(() => {
    if (playerRef.current && !currentClassroom) {
      const targetPosition = new THREE.Vector3(
        playerPosition[0],
        playerPosition[1] + 5,
        playerPosition[2] + 8
      );
      camera.position.lerp(targetPosition, 0.05);
      camera.lookAt(playerPosition[0], playerPosition[1], playerPosition[2]);
    }
  });

  // Check proximity to classrooms
  useEffect(() => {
    const checkProximity = () => {
      if (currentClassroom) return;
      
      let foundNearClassroom = false;
      for (const classroom of classrooms) {
        const distance = Math.sqrt(
          Math.pow(playerPosition[0] - classroom.position[0], 2) +
          Math.pow(playerPosition[2] - classroom.position[2], 2)
        );
        
        if (distance < 3) {
          setNearClassroom(classroom);
          foundNearClassroom = true;
          break;
        }
      }
      
      if (!foundNearClassroom) {
        setNearClassroom(null);
        // Reset requested classrooms when moving away
        setRequestedClassrooms(new Set());
      }
    };

    checkProximity();
  }, [playerPosition, currentClassroom]);

  // Get avatar color
  const getAvatarColor = (avatarType) => {
    const colors = {
      default: "#666666",
      blue: "#2196F3",
      red: "#F44336",
      green: "#4CAF50",
      purple: "#9C27B0"
    };
    return colors[avatarType] || colors.default;
  };

  return (
    <group>
      {/* Ground */}
      <Box args={[100, 0.1, 100]} position={[0, -0.05, 0]}>
        <meshStandardMaterial color="#90EE90" />
      </Box>

      {/* Campus buildings and decorations */}
      <Box args={[5, 8, 5]} position={[-25, 4, -25]}>
        <meshStandardMaterial color="#8B4513" />
      </Box>
      <Box args={[5, 8, 5]} position={[25, 4, -25]}>
        <meshStandardMaterial color="#8B4513" />
      </Box>
      <Box args={[5, 8, 5]} position={[-25, 4, 25]}>
        <meshStandardMaterial color="#8B4513" />
      </Box>
      <Box args={[5, 8, 5]} position={[25, 4, 25]}>
        <meshStandardMaterial color="#8B4513" />
      </Box>

      {/* Classrooms */}
      {classrooms.map((classroom) => (
        <group key={classroom.id} position={classroom.position}>
          {/* Classroom building */}
          <Box args={[8, 6, 8]} position={[0, 3, 0]}>
            <meshStandardMaterial color={classroom.color} />
          </Box>
          
          {/* Door */}
          <Box args={[1.5, 3, 0.1]} position={[0, 1.5, 4]}>
            <meshStandardMaterial color="#8B4513" />
          </Box>
          
          {/* Classroom name */}
          <Text
            position={[0, 4, 4.5]}
            fontSize={0.8}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            {classroom.name}
          </Text>
          
          {/* Entrance indicator */}
          {nearClassroom?.id === classroom.id && (
            <Text
              position={[0, 2, 6]}
              fontSize={1}
              color="yellow"
              anchorX="center"
              anchorY="middle"
            >
              {pendingRequest ? "Requesting..." : "Press ENTER to join"}
            </Text>
          )}
        </group>
      ))}

      {/* Current player */}
      <group ref={playerRef} position={playerPosition}>
        <Sphere args={[0.5]} position={[0, 0.5, 0]}>
          <meshStandardMaterial color={getAvatarColor(user.avatar)} />
        </Sphere>
        <Text
          position={[0, 1.5, 0]}
          fontSize={0.5}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {user.name}
        </Text>
        <Text
          position={[0, 1, 0]}
          fontSize={0.3}
          color="lightblue"
          anchorX="center"
          anchorY="middle"
        >
          {user.role}
        </Text>
      </group>

      {/* Other players */}
      {Object.entries(players).map(([id, player]) => {
        if (id === mySocketId) return null;
        return (
          <group key={id} position={[player.x, player.y, player.z]}>
            <Sphere args={[0.5]} position={[0, 0.5, 0]}>
              <meshStandardMaterial color="#FF6B6B" />
            </Sphere>
            <Text
              position={[0, 1.5, 0]}
              fontSize={0.5}
              color="white"
              anchorX="center"
              anchorY="middle"
            >
              {player.userId || "Unknown"}
            </Text>
            <Text
              position={[0, 1, 0]}
              fontSize={0.3}
              color="lightblue"
              anchorX="center"
              anchorY="middle"
            >
              {player.role}
            </Text>
          </group>
        );
      })}

      {/* Instructions */}
      {!currentClassroom && (
        <Text
          position={[0, 8, -30]}
          fontSize={1}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          Use WASD or Arrow Keys to move | Press ENTER near classrooms to join
        </Text>
      )}

      {/* Debug info */}
      {nearClassroom && (
        <Text
          position={[0, 6, -30]}
          fontSize={0.8}
          color="yellow"
          anchorX="center"
          anchorY="middle"
        >
          Near: {nearClassroom.name} ({user.role})
        </Text>
      )}
    </group>
  );
};

export default MetaverseWorld; 