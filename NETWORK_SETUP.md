# Network Access Setup Guide

## Your Computer's IP Address: `10.10.158.78`

### Step 1: Configure Server URL

**Option A: Using Environment Variable (Recommended)**

1. Create a `.env` file in the `client` folder with this content:
```
REACT_APP_SERVER_URL=http://10.10.158.78:3001
```

**Option B: Direct Configuration**

1. Edit `client/src/config.js` and change the SERVER_URL:
```javascript
const config = {
  SERVER_URL: "http://10.10.158.78:3001",
};
```

### Step 2: Start the Server

Make sure your server is running and accessible from the network:

```bash
cd server
npm start
```

### Step 3: Start the Client

```bash
cd client
npm start
```

### Step 4: Access from Another Computer

1. Make sure both computers are on the same network
2. On the other computer, open a web browser
3. Navigate to: `http://10.10.158.78:3000`

**Note:** If you can't access the React app from another computer, you may need to:

1. **Allow React through Windows Firewall:**
   - Open Windows Defender Firewall
   - Click "Allow an app or feature through Windows Defender Firewall"
   - Click "Change settings" and then "Allow another app"
   - Browse to your Node.js installation and add it

2. **Alternative: Use a different port or approach:**
   - The React dev server by default only accepts localhost connections
   - For production deployment, you would build the app and serve it differently

### Troubleshooting

1. **Firewall Issues**: Make sure Windows Firewall allows connections on ports 3000 and 3001
2. **Antivirus**: Some antivirus software may block network connections
3. **Router Settings**: Ensure your router allows local network communication

### Testing Server Connection

You can test if the server is accessible by running:
```bash
curl http://10.10.158.78:3001
```

If you get a response, the server is accessible from the network.

### Alternative: Build for Production

If you want to make the app easily accessible from other computers, you can build it for production:

```bash
cd client
npm run build
```

Then serve the build folder using a simple HTTP server that accepts network connections. 