# Virtual Classroom - Production Deployment Guide

## New Architecture

This project now uses a **unified client-server architecture** where:
- The Express server serves both the API (Socket.IO) and the React app
- Everything runs on a single port (3001)
- No separate client development server needed
- Perfect for network access and production deployment

## Quick Start (Windows)

### Option 1: Using the Build Script (Recommended)

1. **Run the build script:**
   ```cmd
   build-and-run.bat
   ```
   
   Or in PowerShell:
   ```powershell
   .\build-and-run.ps1
   ```

2. **Access the application:**
   - Local: `http://localhost:3001`
   - Network: `http://YOUR_IP_ADDRESS:3001`

### Option 2: Manual Steps

1. **Build the React app:**
   ```cmd
   cd client
   npm install
   npm run build
   ```

2. **Start the server:**
   ```cmd
   cd server
   npm install
   npm start
   ```

3. **Access the application:**
   - Local: `http://localhost:3001`
   - Network: `http://YOUR_IP_ADDRESS:3001`

## Network Access

### Find Your IP Address

Run this command to find your computer's IP address:
```cmd
ipconfig
```

Look for the "IPv4 Address" under your active network adapter (usually starts with 192.168.x.x or 10.x.x.x).

### Access from Another Computer

1. Make sure both computers are on the same network
2. On the other computer, open a web browser
3. Navigate to: `http://YOUR_IP_ADDRESS:3001`

Example: If your IP is `192.168.1.100`, access `http://192.168.1.100:3001`

## Architecture Benefits

### ✅ What's Fixed

1. **Single Server**: Everything runs on one server, no separate client dev server
2. **Network Access**: Automatically accessible from other computers on the network
3. **Production Ready**: Built React app is served as static files
4. **No Port Conflicts**: Only one port (3001) needed
5. **Automatic Configuration**: Client automatically detects server URL

### 🔧 How It Works

1. **Express Server** (port 3001):
   - Serves Socket.IO API for real-time communication
   - Serves built React app as static files
   - Handles all routing

2. **React App**:
   - Built to static files in `client/build/`
   - Automatically connects to the same server
   - No separate development server needed

## Troubleshooting

### Port Already in Use
If port 3001 is already in use, change it in `server/index.js`:
```javascript
server.listen(3002); // Change to any available port
```

### Firewall Issues
1. Open Windows Defender Firewall
2. Allow Node.js through the firewall
3. Or temporarily disable firewall for testing

### Can't Access from Network
1. Check if both computers are on the same network
2. Verify the IP address is correct
3. Try accessing from the same computer first: `http://localhost:3001`

## Development vs Production

### Development
- Use `npm start` in client folder for hot reloading
- Server runs separately on port 3001
- Good for development with live code changes

### Production
- Use the build script for deployment
- Single server serves everything
- Optimized for network access and performance

## File Structure

```
Virtual-classroom/
├── client/
│   ├── build/           # Built React app (generated)
│   ├── src/             # React source code
│   └── package.json
├── server/
│   ├── index.js         # Express + Socket.IO server
│   └── package.json
├── build-and-run.bat    # Windows build script
├── build-and-run.ps1    # PowerShell build script
└── DEPLOYMENT_GUIDE.md  # This file
```

## Environment Variables

The application automatically detects the server URL. If you need to override it:

1. Create `client/.env`:
   ```
   REACT_APP_SERVER_URL=http://YOUR_IP_ADDRESS:3001
   ```

2. Or edit `client/src/config.js`:
   ```javascript
   SERVER_URL: "http://YOUR_IP_ADDRESS:3001"
   ```

## Security Notes

- This setup is for local network use
- For internet deployment, add proper security measures
- Consider using HTTPS for production
- Add authentication if needed 