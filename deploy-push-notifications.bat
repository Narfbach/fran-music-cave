@echo off
echo ================================================
echo  Push Notifications - Automatic Deployment
echo ================================================
echo.
echo This script will:
echo 1. Login to Firebase (opens browser)
echo 2. Deploy Cloud Function automatically
echo.
pause
echo.
echo Step 1: Logging in to Firebase...
echo (A browser window will open)
echo.
call firebase login
echo.
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Login failed
    pause
    exit /b 1
)
echo.
echo Step 2: Deploying Cloud Function...
echo.
call firebase deploy --only functions
echo.
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Deployment failed
    pause
    exit /b 1
)
echo.
echo ================================================
echo  SUCCESS! Push notifications are now active
echo ================================================
echo.
echo What happens now:
echo - Users will see permission request popup
echo - When they accept, FCM tokens are saved
echo - Likes/Comments trigger push notifications
echo - Notifications work even when browser is closed
echo.
pause
