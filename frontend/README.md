# Dripdirective - React Native Web App

React Native web application for the Dripdirective fashion recommendation system.

## Features

- User authentication (Login/Signup)
- User profile management
- User image upload (front, back, side, close-up)
- Wardrobe management
- AI processing integration
- Outfit recommendations

## Installation

1. Install dependencies:
```bash
npm install
```

2. Configure API endpoint in `config/api.js`:
```javascript
export const API_BASE_URL = 'http://localhost:8000';
```

3. Start the development server:
```bash
npm start
```

Then press `w` to open in web browser.

## Project Structure

```
frontend/
├── App.js                 # Main app component with navigation
├── config/
│   └── api.js            # API configuration
├── context/
│   └── AuthContext.js    # Authentication context
├── screens/
│   ├── LoginScreen.js
│   ├── SignupScreen.js
│   ├── ProfileScreen.js
│   ├── UserImagesScreen.js
│   ├── WardrobeScreen.js
│   └── RecommendationsScreen.js
└── services/
    └── api.js            # API service layer
```

## API Integration

All API endpoints are integrated through the service layer in `services/api.js`:

- **Auth API**: Signup, login, logout, get current user
- **Profile API**: Get, create, update profile
- **User Images API**: Upload, get, delete user images
- **Wardrobe API**: Upload, get, delete wardrobe items
- **AI Processing API**: Process user images and wardrobe items
- **Recommendations API**: Generate and get recommendations

## Usage

1. **Sign up/Login**: Create an account or login
2. **Complete Profile**: Fill in your profile details (height, weight, body type, etc.)
3. **Upload User Images**: Upload front, back, side, and close-up images
4. **Process User Images**: Click "Process Images with AI" to analyze your images
5. **Upload Wardrobe**: Upload images of your clothes
6. **Process Wardrobe**: Process wardrobe items to extract dress information
7. **Get Recommendations**: Enter a query to get outfit recommendations

## Development

- Uses Expo for React Native web development
- React Navigation for routing
- Context API for state management
- Axios for API calls
- AsyncStorage for token persistence

## Notes

- Make sure the backend API is running on the configured URL
- Images are uploaded as multipart/form-data
- Processing tasks run in the background - refresh to see updates
- Authentication tokens are stored in AsyncStorage

