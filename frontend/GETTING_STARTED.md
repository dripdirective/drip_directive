# Getting Started with Dripdirective Frontend

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI (will be installed with npm install)

## Setup Instructions

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure API URL:**
   - Open `config/api.js`
   - Update `API_BASE_URL` to match your backend URL:
     ```javascript
     export const API_BASE_URL = 'http://localhost:8000';
     ```

4. **Start the backend server first:**
   ```bash
   # In the root directory
   cd ..
   python run.py
   ```

5. **Start the frontend:**
   ```bash
   # In the frontend directory
   npm start
   ```

6. **Open in browser:**
   - Press `w` in the terminal to open in web browser
   - Or visit the URL shown in the terminal

## Project Structure

```
frontend/
├── App.js                    # Main app with navigation
├── index.js                  # Entry point
├── config/
│   └── api.js               # API configuration
├── context/
│   └── AuthContext.js       # Authentication state management
├── screens/
│   ├── LoginScreen.js       # Login screen
│   ├── SignupScreen.js     # Signup screen
│   ├── ProfileScreen.js     # User profile management
│   ├── UserImagesScreen.js  # User image uploads
│   ├── WardrobeScreen.js    # Wardrobe management
│   └── RecommendationsScreen.js # Recommendations
└── services/
    └── api.js               # API service layer
```

## Features

### Authentication
- User signup and login
- JWT token management
- Automatic token refresh

### User Profile
- Create and update profile
- Body type, face tone, measurements
- Location information

### User Images
- Upload front, back, side, and close-up images
- View uploaded images
- Process images with AI
- Delete images

### Wardrobe
- Upload wardrobe images
- View wardrobe items
- Process items with AI (segmentation, metadata extraction)
- Delete items

### Recommendations
- Generate outfit recommendations
- View previous recommendations
- See generated try-on images

## Troubleshooting

### CORS Issues
If you encounter CORS errors, make sure your backend has CORS enabled for your frontend URL.

### Image Upload Issues
- Ensure backend is running
- Check file permissions
- Verify API_BASE_URL is correct

### Authentication Issues
- Clear AsyncStorage if tokens are corrupted
- Check backend JWT secret key configuration

## Development Tips

- Use React Native Debugger for debugging
- Check browser console for API errors
- Use Network tab to inspect API calls
- Refresh page to see updated data after processing

