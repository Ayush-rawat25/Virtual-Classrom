import React, { useState } from "react";

const LoginModal = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    name: "",
    role: "student",
    avatar: "default"
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Please enter your name");
      return;
    }
    onLogin({
      id: Date.now().toString(),
      name: formData.name.trim(),
      role: formData.role,
      avatar: formData.avatar
    });
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="login-modal">
      <div className="login-form">
        <h2>Welcome to Virtual Classroom Metaverse</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Your Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your name"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="role">Role</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="avatar">Avatar</label>
            <select
              id="avatar"
              name="avatar"
              value={formData.avatar}
              onChange={handleChange}
            >
              <option value="default">Default</option>
              <option value="blue">Blue</option>
              <option value="red">Red</option>
              <option value="green">Green</option>
              <option value="purple">Purple</option>
            </select>
          </div>
          
          <button type="submit" className="login-btn">
            Enter Metaverse
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginModal; 