// client/src/config.js
const config = {
  // Since we're serving the client from the same server, we can use relative URLs
  // or detect the current hostname automatically
  SERVER_URL: "https://virtual-classrom.onrender.com",
  
  // For development, you can still override this
  // SERVER_URL: process.env.REACT_APP_SERVER_URL || "http://localhost:3001",
};

export default config; 