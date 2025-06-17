// server/index.js
const { Server } = require("socket.io");
const express = require("express");
const path = require("path");
const http = require("http");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
  host: "0.0.0.0" // Allow connections from any IP address
});

// Debug: Log the build path
const buildPath = path.join(__dirname, '../client/build');
console.log('Build path:', buildPath);
console.log('Build path exists:', require('fs').existsSync(buildPath));

// Serve static files from the React build
app.use(express.static(buildPath));

// API routes (if needed)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Virtual Classroom Server is running' });
});

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  console.log('Serving React app for path:', req.path);
  res.sendFile(path.join(buildPath, 'index.html'));
});

// Data structures
let players = {}; // socket.id => { x, y, z, role, room, userId, userName }
let classrooms = {}; // classroomId => { students: [], pending: [], state: 'active'|'locked', teacher: null }
let videoRooms = {}; // roomId => { participants: [] }
let pendingRequests = new Set(); // Track pending requests to prevent duplicates

io.on("connection", socket => {
  console.log("Connected:", socket.id);

  // Join campus or classroom
  socket.on("join", ({ userId, role, room }) => {
    socket.join(room);
    players[socket.id] = { 
      id: socket.id, 
      x: 100, 
      y: 0, 
      z: 100, 
      role, 
      room, 
      userId, 
      userName: userId 
    };

    console.log(`User ${userId} joined room: ${room}`);
    
    // Send players in this room only
    io.to(room).emit("players", getRoomPlayers(room));
  });

  // Movement in 3D space
  socket.on("move", data => {
    if (players[socket.id]) {
      const room = players[socket.id].room;
      players[socket.id] = { ...players[socket.id], ...data };
      io.to(room).emit("players", getRoomPlayers(room));
    }
  });

  // Classroom management
  socket.on("joinClassroom", ({ userId, userName, role, classroomId }) => {
    console.log(`joinClassroom: ${userName} (${role}) joining ${classroomId}`);
    
    if (!classrooms[classroomId]) {
      classrooms[classroomId] = {
        students: [],
        pending: [],
        state: "active",
        teacher: null
      };
      console.log(`Created new classroom: ${classroomId}`);
    }

    const classroom = classrooms[classroomId];
    
    if (role === "teacher") {
      classroom.teacher = { id: userId, name: userName };
      socket.join(`classroom-${classroomId}`);
      socket.join(`video-${classroomId}`);
      
      console.log(`Teacher ${userName} joined classroom ${classroomId}`);
      
      // Send current classroom state to teacher
      socket.emit("classroomUpdate", {
        students: classroom.students,
        pending: classroom.pending,
        teacher: classroom.teacher
      });
    } else {
      // Students cannot directly join - they must be approved first
      const existingStudent = classroom.students.find(s => s.id === userId);
      const existingPending = classroom.pending.find(s => s.id === userId);
      
      if (existingStudent) {
        // Student is already approved, allow them to join
        socket.join(`classroom-${classroomId}`);
        socket.join(`video-${classroomId}`);
        console.log(`Approved student ${userName} joined classroom ${classroomId}`);
        
        // Notify the client that they can enter the classroom
        socket.emit("classroomJoined", { classroomId });
        // Send the latest classroom state directly to the joining student
        socket.emit("classroomUpdate", {
          students: classroom.students,
          pending: classroom.pending,
          teacher: classroom.teacher
        });
      } else if (!existingPending) {
        // Student is not approved and not pending - they need to request first
        console.log(`Student ${userName} tried to join classroom ${classroomId} without approval`);
        socket.emit("classroomAccessDenied", { 
          classroomId, 
          reason: "You must request to join this classroom first." 
        });
        return;
      } else {
        // Student is pending - they need to wait for approval
        console.log(`Student ${userName} is still pending for classroom ${classroomId}`);
        socket.emit("classroomAccessDenied", { 
          classroomId, 
          reason: "Your request is still pending. Please wait for teacher approval." 
        });
        return;
      }
    }

    console.log(`User ${userName} joined classroom: ${classroomId}`);
    console.log(`Classroom ${classroomId} state:`, classroom);
  });

  // Classroom actions (teacher only)
  socket.on("classroomAction", ({ action, studentId, classroomId, state }) => {
    const classroom = classrooms[classroomId];
    if (!classroom) return;

    console.log(`classroomAction: ${action} for student ${studentId} in classroom ${classroomId}`);

    switch (action) {
      case "accept":
        const pendingIndex = classroom.pending.findIndex(s => s.id === studentId);
        if (pendingIndex !== -1) {
          const student = classroom.pending.splice(pendingIndex, 1)[0];
          classroom.students.push(student);
          
          console.log(`Accepted student ${student.name} into classroom ${classroomId}`);
          
          // Remove from pending requests set
          pendingRequests.delete(`${studentId}-${classroomId}`);
          
          // Notify student they were accepted
          io.emit("classroomResponse", { 
            studentId, 
            classroomId, 
            accepted: true 
          });
          
          // Update all participants
          io.to(`classroom-${classroomId}`).emit("classroomUpdate", {
            students: classroom.students,
            pending: classroom.pending,
            teacher: classroom.teacher
          });
        }
        break;

      case "reject":
        const rejectIndex = classroom.pending.findIndex(s => s.id === studentId);
        if (rejectIndex !== -1) {
          classroom.pending.splice(rejectIndex, 1);
          
          console.log(`Rejected student ${studentId} from classroom ${classroomId}`);
          
          // Remove from pending requests set
          pendingRequests.delete(`${studentId}-${classroomId}`);
          
          // Notify student they were rejected
          io.emit("classroomResponse", { 
            studentId, 
            classroomId, 
            accepted: false 
          });
          
          // Update all participants
          io.to(`classroom-${classroomId}`).emit("classroomUpdate", {
            students: classroom.students,
            pending: classroom.pending,
            teacher: classroom.teacher
          });
        }
        break;

      case "remove":
        const studentIndex = classroom.students.findIndex(s => s.id === studentId);
        if (studentIndex !== -1) {
          const student = classroom.students.splice(studentIndex, 1)[0];
          
          console.log(`Removed student ${student.name} from classroom ${classroomId}`);
          
          // Remove student from video room
          io.to(`video-${classroomId}`).emit("userLeftVideo", { userId: studentId });
          
          // Update all participants
          io.to(`classroom-${classroomId}`).emit("classroomUpdate", {
            students: classroom.students,
            pending: classroom.pending,
            teacher: classroom.teacher
          });
        }
        break;

      case "toggleState":
        classroom.state = state;
        console.log(`Classroom ${classroomId} state changed to: ${state}`);
        io.to(`classroom-${classroomId}`).emit("classroomUpdate", {
          students: classroom.students,
          pending: classroom.pending,
          teacher: classroom.teacher
        });
        break;
    }
  });

  // Leave classroom
  socket.on("leaveClassroom", ({ userId, classroomId }) => {
    const classroom = classrooms[classroomId];
    if (classroom) {
      // Remove from students
      const studentIndex = classroom.students.findIndex(s => s.id === userId);
      if (studentIndex !== -1) {
        classroom.students.splice(studentIndex, 1);
      }
      
      // Remove from pending
      const pendingIndex = classroom.pending.findIndex(s => s.id === userId);
      if (pendingIndex !== -1) {
        classroom.pending.splice(pendingIndex, 1);
      }
      
      // Remove teacher
      if (classroom.teacher && classroom.teacher.id === userId) {
        classroom.teacher = null;
      }
      
      socket.leave(`classroom-${classroomId}`);
      socket.leave(`video-${classroomId}`);
      
      // Notify others
      io.to(`classroom-${classroomId}`).emit("studentLeft", userId);
      io.to(`video-${classroomId}`).emit("userLeftVideo", { userId });
      
      // Update classroom state
      io.to(`classroom-${classroomId}`).emit("classroomUpdate", {
        students: classroom.students,
        pending: classroom.pending,
        teacher: classroom.teacher
      });
    }
  });

  // Classroom request (student to teacher)
  socket.on("classroomRequest", ({ studentId, studentName, classroomId }) => {
    console.log(`classroomRequest: ${studentName} (${studentId}) requesting to join ${classroomId}`);
    
    // Check if request is already pending
    const requestKey = `${studentId}-${classroomId}`;
    if (pendingRequests.has(requestKey)) {
      console.log(`Request already pending for ${studentName} in ${classroomId}`);
      return;
    }
    
    const classroom = classrooms[classroomId];
    if (!classroom) {
      console.log(`Classroom ${classroomId} does not exist`);
      socket.emit("noTeacherInClassroom", { classroomId });
      return;
    }
    
    // Check if classroom is locked
    if (classroom.state === "locked") {
      console.log(`Classroom ${classroomId} is locked, rejecting request from ${studentName}`);
      socket.emit("classroomLocked", { classroomId });
      return;
    }
    
    if (classroom.teacher) {
      // Add to pending requests set
      pendingRequests.add(requestKey);
      
      // Add to pending if not already there
      const existingPending = classroom.pending.find(s => s.id === studentId);
      if (!existingPending) {
        classroom.pending.push({ id: studentId, name: studentName });
        console.log(`Added ${studentName} to pending list for classroom ${classroomId}`);
      }
      
      // Send request to teacher and update pending list
      console.log(`Sending request to teacher in classroom ${classroomId}`);
      io.to(`classroom-${classroomId}`).emit("classroomRequest", {
        studentId,
        studentName,
        classroomId
      });
      
      // Also emit classroom update to refresh the pending list
      io.to(`classroom-${classroomId}`).emit("classroomUpdate", {
        students: classroom.students,
        pending: classroom.pending,
        teacher: classroom.teacher
      });
    } else {
      // No teacher in classroom
      console.log(`No teacher in classroom ${classroomId}, notifying student ${studentName}`);
      socket.emit("noTeacherInClassroom", { classroomId });
    }
  });

  // Video chat management
  socket.on("joinVideoRoom", ({ room, userId, userName, userRole }) => {
    console.log(`joinVideoRoom: ${userName} (${userRole}) joining video room ${room}`);
    
    if (!videoRooms[room]) {
      videoRooms[room] = { participants: [] };
    }
    
    // Check if user is already in the room
    const existingParticipant = videoRooms[room].participants.find(p => p.id === userId);
    if (!existingParticipant) {
      videoRooms[room].participants.push({ id: userId, name: userName, role: userRole });
    }
    
    socket.join(`video-${room}`);
    
    // Notify existing participants with user info
    socket.to(`video-${room}`).emit("userJoinedVideo", { 
      userId, 
      userName, 
      userRole 
    });
    
    console.log(`Video room ${room} participants:`, videoRooms[room].participants);
  });

  // Video signaling
  socket.on("videoSignal", ({ to, data }) => {
    console.log(`videoSignal: ${socket.id} sending signal to ${to}`);
    
    // Get user info from video rooms
    let userName = "Unknown";
    let userRole = "Unknown";
    
    Object.keys(videoRooms).forEach(roomId => {
      const room = videoRooms[roomId];
      const participant = room.participants.find(p => p.id === socket.id);
      if (participant) {
        userName = participant.name;
        userRole = participant.role;
      }
    });
    
    io.to(to).emit("videoSignal", { 
      from: socket.id, 
      data,
      userName,
      userRole
    });
  });

  // WebRTC signaling (legacy)
  socket.on("signal", ({ to, data }) => {
    io.to(to).emit("signal", { from: socket.id, data });
  });

  // On disconnect
  socket.on("disconnect", () => {
    console.log("Disconnect: Cleaning up for socket", socket.id);
    
    const player = players[socket.id];
    if (player) {
      const room = player.room;
      delete players[socket.id];
      if (room) {
        io.to(room).emit("players", getRoomPlayers(room));
      }
    }

    // Clean up video rooms
    Object.keys(videoRooms).forEach(roomId => {
      const room = videoRooms[roomId];
      const index = room.participants.findIndex(p => p.id === socket.id);
      if (index !== -1) {
        const participant = room.participants.splice(index, 1)[0];
        console.log(`User ${participant.name} left video room ${roomId}`);
        io.to(`video-${roomId}`).emit("userLeftVideo", { 
          userId: socket.id,
          userName: participant.name,
          userRole: participant.role
        });
      }
    });

    // Clean up classrooms
    Object.keys(classrooms).forEach(classroomId => {
      const classroom = classrooms[classroomId];
      
      // Remove from students
      const studentIndex = classroom.students.findIndex(s => s.id === socket.id);
      if (studentIndex !== -1) {
        const student = classroom.students.splice(studentIndex, 1)[0];
        console.log(`Student ${student.name} left classroom ${classroomId}`);
        io.to(`classroom-${classroomId}`).emit("studentLeft", socket.id);
      }
      
      // Remove from pending
      const pendingIndex = classroom.pending.findIndex(s => s.id === socket.id);
      if (pendingIndex !== -1) {
        const student = classroom.pending.splice(pendingIndex, 1)[0];
        console.log(`Pending student ${student.name} left classroom ${classroomId}`);
      }
      
      // Remove teacher
      if (classroom.teacher && classroom.teacher.id === socket.id) {
        console.log(`Teacher ${classroom.teacher.name} left classroom ${classroomId}`);
        classroom.teacher = null;
      }
      
      // Update classroom state
      io.to(`classroom-${classroomId}`).emit("classroomUpdate", {
        students: classroom.students,
        pending: classroom.pending,
        teacher: classroom.teacher
      });
    });

    console.log("Disconnected:", socket.id);
  });
});

// Helper to get all players in a room
function getRoomPlayers(room) {
  return Object.fromEntries(
    Object.entries(players).filter(([id, p]) => p.room === room)
  );
}

console.log("Virtual Classroom Metaverse Server running on port 3001");

server.listen(3001);
