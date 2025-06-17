@echo off
echo Building Virtual Classroom for production...

echo.
echo Step 1: Installing client dependencies...
cd client
call npm install

echo.
echo Step 2: Building React app...
call npm run build

echo.
echo Step 3: Installing server dependencies...
cd ..\server
call npm install

echo.
echo Step 4: Starting the server...
echo The Virtual Classroom will be available at:
echo - Local: http://localhost:3001
echo - Network: http://YOUR_IP_ADDRESS:3001
echo.
echo Press Ctrl+C to stop the server
echo.

call npm start 