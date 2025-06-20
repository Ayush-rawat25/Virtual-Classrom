// src/components/VideoChat.js
import React, { useEffect, useRef, useState } from "react";
import SimplePeer from "simple-peer";
import socket from "../socket";

const VideoChat = ({ role, room, user }) => {
  const [stream, setStream] = useState(null);
  const [peers, setPeers] = useState({});
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");
  const [participants, setParticipants] = useState({});

  const localVideoRef = useRef();
  const remoteVideosRef = useRef({});
  const peerConnections = useRef({});

  useEffect(() => {
    console.log("VideoChat: Initializing for room:", room, "User:", user.name);
    
    // Get user media
    navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: { ideal: 640 },
        height: { ideal: 480 }
      }, 
      audio: true 
    })
      .then(localStream => {
        console.log("VideoChat: Got local stream");
        setStream(localStream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }

        // Join video room with user info
        socket.emit("joinVideoRoom", { 
          room, 
          userId: socket.id,
          userName: user.name,
          userRole: user.role
        });
        setConnectionStatus("Connecting...");

        // Listen for new peers joining
        socket.on("userJoinedVideo", ({ userId, userName, userRole }) => {
          if (userId === socket.id) return;
          
          console.log("VideoChat: Creating peer connection for:", userName, "(", userId, ")");
          
          // Check if peer already exists
          if (peerConnections.current[userId]) {
            console.log("VideoChat: Peer already exists for:", userId);
            return;
          }
          
          setIsConnecting(true);
          
          const peer = new SimplePeer({
            initiator: true,
            trickle: false,
            stream: localStream,
            config: {
              iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }
              ]
            }
          });

          peerConnections.current[userId] = peer;

          peer.on("signal", data => {
            console.log("VideoChat: Sending signal to:", userName);
            socket.emit("videoSignal", { to: userId, data });
          });

          peer.on("stream", remoteStream => {
            console.log("VideoChat: Received remote stream from:", userName);
            if (remoteVideosRef.current[userId]) {
              remoteVideosRef.current[userId].srcObject = remoteStream;
            }
            setIsConnecting(false);
            setConnectionStatus(`Connected to ${Object.keys(peerConnections.current).length} participants`);
          });

          peer.on("error", (err) => {
            console.error("VideoChat: Peer error:", err);
            setIsConnecting(false);
            setConnectionStatus("Connection error");
            delete peerConnections.current[userId];
          });

          peer.on("close", () => {
            console.log("VideoChat: Peer connection closed:", userName);
            setIsConnecting(false);
            delete peerConnections.current[userId];
            setConnectionStatus(`Connected to ${Object.keys(peerConnections.current).length} participants`);
          });

          setPeers(prev => ({ ...prev, [userId]: peer }));
          setParticipants(prev => ({ ...prev, [userId]: { name: userName, role: userRole } }));
        });

        // Listen for incoming signals
        socket.on("videoSignal", ({ from, data, userName, userRole }) => {
          console.log("VideoChat: Received signal from:", userName || from);
          
          let peer = peerConnections.current[from];
          
          if (!peer) {
            // Create new peer for incoming connection
            console.log("VideoChat: Creating new peer for incoming connection from:", userName || from);
            peer = new SimplePeer({
              initiator: false,
              trickle: false,
              stream: localStream,
              config: {
                iceServers: [
                  { urls: 'stun:stun.l.google.com:19302' }
                ]
              }
            });

            peerConnections.current[from] = peer;

            peer.on("signal", signalData => {
              console.log("VideoChat: Sending signal response to:", userName || from);
              socket.emit("videoSignal", { to: from, data: signalData });
            });

            peer.on("stream", remoteStream => {
              console.log("VideoChat: Received remote stream from new peer:", userName || from);
              if (remoteVideosRef.current[from]) {
                remoteVideosRef.current[from].srcObject = remoteStream;
              }
              setConnectionStatus(`Connected to ${Object.keys(peerConnections.current).length} participants`);
            });

            peer.on("error", (err) => {
              console.error("VideoChat: New peer error:", err);
              delete peerConnections.current[from];
            });

            peer.on("close", () => {
              console.log("VideoChat: New peer connection closed:", userName || from);
              delete peerConnections.current[from];
              setConnectionStatus(`Connected to ${Object.keys(peerConnections.current).length} participants`);
            });

            setPeers(prev => ({ ...prev, [from]: peer }));
            setParticipants(prev => ({ ...prev, [from]: { name: userName, role: userRole } }));
          }

          try {
            peer.signal(data);
          } catch (err) {
            console.error("VideoChat: Error signaling peer:", err);
          }
        });

        // Listen for user leaving
        socket.on("userLeftVideo", ({ userId }) => {
          const participantName = participants[userId]?.name || userId;
          console.log("VideoChat: User left video:", participantName);
          const peer = peerConnections.current[userId];
          if (peer) {
            peer.destroy();
            delete peerConnections.current[userId];
            setPeers(prev => {
              const newPeers = { ...prev };
              delete newPeers[userId];
              return newPeers;
            });
            setParticipants(prev => {
              const newParticipants = { ...prev };
              delete newParticipants[userId];
              return newParticipants;
            });
            setConnectionStatus(`Connected to ${Object.keys(peerConnections.current).length} participants`);
          }
        });

      })
      .catch(err => {
        console.error("VideoChat: Error accessing media devices:", err);
        alert("Unable to access camera/microphone. Please check permissions.");
        setConnectionStatus("Media access error");
      });

    return () => {
      console.log("VideoChat: Cleaning up");
      socket.off("userJoinedVideo");
      socket.off("videoSignal");
      socket.off("userLeftVideo");
      
      // Clean up peers
      Object.values(peerConnections.current).forEach(peer => {
        if (peer && typeof peer.destroy === 'function') {
          peer.destroy();
        }
      });
      peerConnections.current = {};
      
      // Stop local stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [room, user]);

  const toggleMic = () => {
    if (!stream) return;
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setMicOn(audioTrack.enabled);
    }
  };

  const toggleVideo = () => {
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setVideoOn(videoTrack.enabled);
    }
  };

  const getRemoteVideos = () => {
    return Object.keys(peers).map(userId => {
      const participant = participants[userId];
      const displayName = participant?.name || `User ${userId.slice(-4)}`;
      const displayRole = participant?.role || 'Unknown';
      
      return (
        <div key={userId} className="remote-video">
          <video
            ref={el => remoteVideosRef.current[userId] = el}
            autoPlay
            playsInline
            muted={false}
          />
          <div className="video-label">{displayName} ({displayRole})</div>
        </div>
      );
    });
  };

  return (
    <div className="video-chat">
      <h4>Video Chat - {room}</h4>
      
      <div className="video-container">
        <div className="local-video">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
          />
          <div className="video-label">You ({user.name} - {role})</div>
        </div>
        
        {getRemoteVideos()}
      </div>

      {isConnecting && (
        <div className="connecting-message">
          Connecting to classroom...
        </div>
      )}

      <div className="connection-status">
        <p>Status: {connectionStatus}</p>
        <p>Connected to: {Object.keys(peers).length} other participants</p>
        <p>Participants: {Object.values(participants).map(p => p.name).join(', ')}</p>
      </div>

      <div className="controls">
        <button
          className={`control-btn mic-btn ${!micOn ? 'muted' : ''}`}
          onClick={toggleMic}
        >
          {micOn ? "🎤 Mute" : "🔇 Unmute"}
        </button>
        
        <button
          className={`control-btn ${!videoOn ? 'muted' : ''}`}
          onClick={toggleVideo}
        >
          {videoOn ? "📹 Hide Video" : "📹 Show Video"}
        </button>
      </div>

      <div className="video-info">
        <p>Room: {room}</p>
        <p>Your role: {role}</p>
      </div>
    </div>
  );
};

export default VideoChat;
