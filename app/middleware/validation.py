"""
Request Validation Middleware
Validates and sanitizes incoming requests
"""

import logging
from typing import Optional
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)

# Max request sizes by content type (in bytes)
MAX_REQUEST_SIZES = {
    "application/json": 1024 * 1024,  # 1MB
    "multipart/form-data": 10 * 1024 * 1024,  # 10MB
    "default": 5 * 1024 * 1024,  # 5MB
}

# Allowed file extensions for uploads
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}

# Dangerous patterns in paths (path traversal prevention)
DANGEROUS_PATH_PATTERNS = ["../", "..\\", "%2e%2e", "%252e%252e"]


class ValidationMiddleware(BaseHTTPMiddleware):
    """Request validation and sanitization middleware"""
    
    def __init__(self, app, max_request_size: Optional[int] = None):
        super().__init__(app)
        self.max_request_size = max_request_size or MAX_REQUEST_SIZES["default"]
    
    def validate_request_size(self, request: Request) -> Optional[str]:
        """Validate request body size"""
        content_length = request.headers.get("content-length")
        if not content_length:
            return None
        
        try:
            size = int(content_length)
            content_type = request.headers.get("content-type", "").split(";")[0].strip()
            
            # Get max size for this content type
            max_size = MAX_REQUEST_SIZES.get(content_type, MAX_REQUEST_SIZES["default"])
            
            if size > max_size:
                return (
                    f"Request body too large. Maximum size for {content_type} "
                    f"is {max_size / (1024 * 1024):.1f}MB"
                )
        except ValueError:
            return "Invalid Content-Length header"
        
        return None
    
    def validate_content_type(self, request: Request) -> Optional[str]:
        """Validate content type for specific endpoints"""
        method = request.method
        path = request.url.path
        content_type = request.headers.get("content-type", "").split(";")[0].strip()
        
        # Upload endpoints must use multipart/form-data
        if method == "POST" and "/upload" in path:
            if not content_type.startswith("multipart/form-data"):
                return (
                    "Invalid content type for file upload. "
                    "Expected multipart/form-data"
                )
        
        # JSON endpoints should use application/json
        if method in ["POST", "PUT", "PATCH"] and "/upload" not in path:
            if content_type and not content_type.startswith("application/json"):
                # Allow multipart for specific endpoints
                if not (content_type.startswith("multipart/form-data") or 
                       content_type.startswith("application/x-www-form-urlencoded")):
                    logger.warning(
                        f"Unexpected content type: {content_type} for {method} {path}"
                    )
        
        return None
    
    def validate_path(self, request: Request) -> Optional[str]:
        """Validate request path for security issues"""
        path = str(request.url.path)
        
        # Check for path traversal attempts
        for pattern in DANGEROUS_PATH_PATTERNS:
            if pattern in path.lower():
                return f"Invalid path: potential path traversal detected"
        
        # Check path length
        if len(path) > 2048:
            return "Path too long"
        
        return None
    
    def validate_headers(self, request: Request) -> Optional[str]:
        """Validate request headers"""
        # Check for required headers in specific scenarios
        
        # User-Agent validation (optional but recommended)
        user_agent = request.headers.get("user-agent")
        if not user_agent or len(user_agent) > 500:
            logger.warning(f"Suspicious User-Agent: {user_agent}")
        
        # Check for header injection attempts
        for header_name, header_value in request.headers.items():
            if "\n" in header_value or "\r" in header_value:
                return f"Invalid header value: potential header injection"
        
        return None
    
    def sanitize_query_params(self, request: Request) -> dict:
        """Sanitize query parameters"""
        sanitized = {}
        
        for key, value in request.query_params.items():
            # Remove potentially dangerous characters
            clean_key = key.strip()
            clean_value = value.strip()
            
            # Limit parameter length
            if len(clean_key) > 100:
                logger.warning(f"Query parameter key too long: {clean_key[:50]}...")
                continue
            
            if len(clean_value) > 1000:
                logger.warning(f"Query parameter value too long for key: {clean_key}")
                clean_value = clean_value[:1000]
            
            sanitized[clean_key] = clean_value
        
        return sanitized
    
    async def dispatch(self, request: Request, call_next):
        """Process request with validation"""
        
        # Skip validation for docs and health check
        if request.url.path in ["/docs", "/redoc", "/openapi.json", "/health"]:
            return await call_next(request)
        
        try:
            # Validate request size
            size_error = self.validate_request_size(request)
            if size_error:
                logger.warning(f"Request size validation failed: {size_error}")
                return JSONResponse(
                    status_code=413,
                    content={"detail": size_error}
                )
            
            # Validate content type
            content_type_error = self.validate_content_type(request)
            if content_type_error:
                logger.warning(f"Content type validation failed: {content_type_error}")
                return JSONResponse(
                    status_code=415,
                    content={"detail": content_type_error}
                )
            
            # Validate path
            path_error = self.validate_path(request)
            if path_error:
                logger.warning(f"Path validation failed: {path_error}")
                return JSONResponse(
                    status_code=400,
                    content={"detail": path_error}
                )
            
            # Validate headers
            header_error = self.validate_headers(request)
            if header_error:
                logger.warning(f"Header validation failed: {header_error}")
                return JSONResponse(
                    status_code=400,
                    content={"detail": header_error}
                )
            
            # Sanitize query parameters
            # (Note: This doesn't modify the actual request, just logs issues)
            self.sanitize_query_params(request)
            
            # Add validation timestamp header
            response = await call_next(request)
            response.headers["X-Request-Validated"] = "true"
            
            return response
            
        except Exception as e:
            logger.error(f"Validation middleware error: {e}", exc_info=True)
            return JSONResponse(
                status_code=500,
                content={"detail": "Internal server error during request validation"}
            )


def setup_validation(app):
    """Setup validation middleware"""
    app.add_middleware(ValidationMiddleware)
    logger.info("✅ Request validation middleware enabled")
