import React, { useState, useEffect } from "react";
import socket from "../socket";

const ClassroomUI = ({ classroom, user, onExit }) => {
  const [students, setStudents] = useState([]);
  const [pendingStudents, setPendingStudents] = useState([]);
  const [classroomState, setClassroomState] = useState("active");
  const [newRequestNotification, setNewRequestNotification] = useState(false);
  const [teacher, setTeacher] = useState(null);

  useEffect(() => {
    console.log("ClassroomUI: Joining classroom", classroom.id, "as", user.role);
    
    // Listen for classroom events
    socket.on("classroomUpdate", ({ students: newStudents, pending: newPending, teacher: newTeacher }) => {
      console.log("ClassroomUI: Received classroom update", { students: newStudents, pending: newPending, teacher: newTeacher });
      setStudents(newStudents || []);
      setPendingStudents(newPending || []);
      setTeacher(newTeacher || null);
    });

    socket.on("studentJoined", (student) => {
      console.log("ClassroomUI: Student joined", student);
      setStudents(prev => {
        // Check if student already exists
        const exists = prev.find(s => s.id === student.id);
        if (!exists) {
          return [...prev, student];
        }
        return prev;
      });
    });

    socket.on("studentLeft", (studentId) => {
      console.log("ClassroomUI: Student left", studentId);
      setStudents(prev => prev.filter(s => s.id !== studentId));
    });

    // Listen for new classroom requests (for teachers)
    socket.on("classroomRequest", ({ studentId, studentName, classroomId }) => {
      if (user.role === "teacher") {
        console.log("ClassroomUI: New request from", studentName);
        setNewRequestNotification(true);
        // Auto-hide notification after 5 seconds
        setTimeout(() => setNewRequestNotification(false), 5000);
      }
    });

    // Join the classroom
    socket.emit("joinClassroom", {
      userId: user.id,
      userName: user.name,
      role: user.role,
      classroomId: classroom.id
    });

    return () => {
      console.log("ClassroomUI: Cleaning up socket listeners");
      socket.off("classroomUpdate");
      socket.off("studentJoined");
      socket.off("studentLeft");
      socket.off("classroomRequest");
    };
  }, [classroom.id, user]);

  const handleAcceptStudent = (studentId) => {
    socket.emit("classroomAction", {
      action: "accept",
      studentId,
      classroomId: classroom.id
    });
  };

  const handleRejectStudent = (studentId) => {
    socket.emit("classroomAction", {
      action: "reject",
      studentId,
      classroomId: classroom.id
    });
  };

  const handleRemoveStudent = (studentId) => {
    socket.emit("classroomAction", {
      action: "remove",
      studentId,
      classroomId: classroom.id
    });
  };

  const handleToggleClassroom = () => {
    const newState = classroomState === "active" ? "locked" : "active";
    setClassroomState(newState);
    socket.emit("classroomAction", {
      action: "toggleState",
      classroomId: classroom.id,
      state: newState
    });
  };

  const handleExitClassroom = () => {
    socket.emit("leaveClassroom", {
      userId: user.id,
      classroomId: classroom.id
    });
    onExit();
  };

  // Get teacher name
  const getTeacherName = () => {
    if (teacher && teacher.name) {
      return teacher.name;
    }
    return "Not assigned";
  };

  return (
    <div className="classroom-ui">
      {/* New Request Notification */}
      {newRequestNotification && user.role === "teacher" && (
        <div className="notification-banner">
          <span>🎓 New student request received! Check the pending requests below.</span>
          <button onClick={() => setNewRequestNotification(false)}>×</button>
        </div>
      )}

      <div className="classroom-header">
        <h3>{classroom.name}</h3>
        <button className="exit-btn" onClick={handleExitClassroom}>
          Exit Classroom
        </button>
      </div>

      {user.role === "teacher" && (
        <div className="teacher-controls">
          <div className="classroom-status">
            <span>Status: </span>
            <span className={`status ${classroomState}`}>
              {classroomState === "active" ? "Open" : "Locked"}
            </span>
            <button 
              className="toggle-btn"
              onClick={handleToggleClassroom}
            >
              {classroomState === "active" ? "Lock Classroom" : "Unlock Classroom"}
            </button>
          </div>

          {pendingStudents.length > 0 && (
            <div className="student-list">
              <h4>Pending Requests ({pendingStudents.length})</h4>
              {pendingStudents.map((student) => (
                <div key={student.id} className="student-item">
                  <span className="student-name">{student.name}</span>
                  <div className="student-actions">
                    <button
                      className="action-btn accept-btn"
                      onClick={() => handleAcceptStudent(student.id)}
                    >
                      Accept
                    </button>
                    <button
                      className="action-btn reject-btn"
                      onClick={() => handleRejectStudent(student.id)}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="student-list">
        <h4>Students in Class ({students.length})</h4>
        {students.length === 0 ? (
          <p>No students in class yet.</p>
        ) : (
          students.map((student) => (
            <div key={student.id} className="student-item">
              <span className="student-name">{student.name}</span>
              {user.role === "teacher" && (
                <button
                  className="action-btn reject-btn"
                  onClick={() => handleRemoveStudent(student.id)}
                >
                  Remove
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <div className="classroom-info">
        <h4>Classroom Information</h4>
        <p><strong>Subject:</strong> {classroom.name}</p>
        <p><strong>Teacher:</strong> {getTeacherName()}</p>
        <p><strong>Capacity:</strong> {students.length}/30 students</p>
        <p><strong>Status:</strong> {classroomState === "active" ? "Open for students" : "Locked"}</p>
      </div>

      {user.role === "student" && (
        <div className="student-info">
          <h4>Your Status</h4>
          <p>You are currently in {classroom.name}</p>
          <p>Use the video chat panel below to communicate with your teacher and classmates.</p>
        </div>
      )}
    </div>
  );
};

export default ClassroomUI; 