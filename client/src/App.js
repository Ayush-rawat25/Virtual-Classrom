// src/App.js
import React, { useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Sky } from "@react-three/drei";
import MetaverseWorld from "./components/MetaverseWorld";
import VideoChat from "./components/VideoChat";
import LoginModal from "./components/LoginModal";
import ClassroomUI from "./components/ClassroomUI";
import "./App.css";

function App() {
  const [user, setUser] = useState(null);
  const [currentClassroom, setCurrentClassroom] = useState(null);
  const [isInClassroom, setIsInClassroom] = useState(false);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleClassroomEnter = (classroom) => {
    setCurrentClassroom(classroom);
    setIsInClassroom(true);
  };

  const handleClassroomExit = () => {
    setCurrentClassroom(null);
    setIsInClassroom(false);
  };

  if (!user) {
    return <LoginModal onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <div className="header">
        <h1>Virtual Classroom Metaverse</h1>
        <div className="user-info">
          <span>Welcome, {user.name} ({user.role})</span>
          {currentClassroom && (
            <span className="classroom-info">
              | Classroom: {currentClassroom.name}
            </span>
          )}
        </div>
      </div>

      <div className="main-content">
        <div className="world-container">
          <Canvas
            camera={{ position: [0, 5, 10], fov: 75 }}
            style={{ background: "#87CEEB" }}
          >
            <Sky sunPosition={[100, 20, 100]} />
            <ambientLight intensity={0.6} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            
            <MetaverseWorld
              user={user}
              onClassroomEnter={handleClassroomEnter}
              onClassroomExit={handleClassroomExit}
              currentClassroom={currentClassroom}
            />
            
            <OrbitControls 
              enablePan={false}
              maxPolarAngle={Math.PI / 2}
              minDistance={5}
              maxDistance={20}
            />
          </Canvas>
        </div>

        {isInClassroom && currentClassroom && (
          <div className="classroom-panel">
            <ClassroomUI
              classroom={currentClassroom}
              user={user}
              onExit={handleClassroomExit}
            />
            <VideoChat role={user.role} room={currentClassroom.id} user={user} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
