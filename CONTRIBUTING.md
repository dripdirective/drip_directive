# Contributing to Dripdirective

Thank you for your interest in contributing to Dripdirective! This document provides guidelines and instructions for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/drip_directive.git`
3. Create a new branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test your changes thoroughly
6. Commit your changes: `git commit -m "Add your descriptive commit message"`
7. Push to your fork: `git push origin feature/your-feature-name`
8. Open a Pull Request

## Development Setup

### Backend Setup

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server
python run.py
```

### Frontend Setup

```bash
cd frontend
npm install --legacy-peer-deps
npx expo install react-dom@18.2.0 @expo/webpack-config@^19.0.0
npm start
```

## Code Style

### Python (Backend)
- Follow PEP 8 style guide
- Use type hints where appropriate
- Write docstrings for functions and classes
- Keep functions focused and single-purpose

### JavaScript/React (Frontend)
- Use functional components with hooks
- Follow React best practices
- Use meaningful variable and function names
- Keep components small and reusable

## Testing

Before submitting a PR:
1. Test all API endpoints using the Swagger UI at `http://localhost:8000/docs`
2. Test the frontend functionality in a web browser
3. Ensure no console errors or warnings
4. Test with different user accounts and scenarios

## Pull Request Guidelines

1. **Title**: Use a clear and descriptive title
2. **Description**: Explain what changes you made and why
3. **Testing**: Describe how you tested your changes
4. **Screenshots**: Include screenshots for UI changes
5. **Breaking Changes**: Clearly document any breaking changes

## Reporting Issues

When reporting issues, please include:
- Clear description of the problem
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots (if applicable)
- Environment details (OS, Python version, Node version)

## Feature Requests

We welcome feature requests! Please:
- Check if the feature already exists or is planned
- Clearly describe the feature and its use case
- Explain why it would be valuable to users

## Questions?

Feel free to open an issue for questions or join discussions in the Issues section.

Thank you for contributing! 🎉
