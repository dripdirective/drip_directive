# Web Dependencies Installation

If you encounter the error:
```
CommandError: It looks like you're trying to use web support but don't have the required dependencies installed.
```

## Quick Fix

Run these commands in the `frontend/` directory:

```bash
cd frontend
npx expo install react-dom@18.2.0 @expo/webpack-config@^19.0.0
```

## Verify Installation

Check if packages are installed:
```bash
npm list react-dom @expo/webpack-config
```

Should show:
```
├── @expo/webpack-config@19.0.1
└── react-dom@18.2.0
```

## Note

These dependencies are now included in `package.json`, so they should install automatically with `npm install`. If you still get the error, run the `npx expo install` command above.

