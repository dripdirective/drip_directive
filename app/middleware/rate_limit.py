"""
Rate Limiting Middleware
Protects API endpoints from abuse and DDoS attacks
"""

import time
from typing import Dict, Optional
from collections import defaultdict
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import logging

logger = logging.getLogger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    In-memory rate limiting middleware
    For production, use Redis-based rate limiting (e.g., slowapi with Redis)
    """
    
    def __init__(
        self,
        app,
        requests_per_minute: int = 100,
        requests_per_hour: int = 1000,
        burst_size: int = 20,
    ):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.requests_per_hour = requests_per_hour
        self.burst_size = burst_size
        
        # Storage: client_ip -> [(timestamp, endpoint), ...]
        self.request_log: Dict[str, list] = defaultdict(list)
        
        # Burst storage: client_ip -> count
        self.burst_counter: Dict[str, int] = defaultdict(int)
        self.burst_reset: Dict[str, float] = {}
        
    def get_client_ip(self, request: Request) -> str:
        """Extract client IP from request"""
        # Check for forwarded headers (when behind proxy/load balancer)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # Fallback to direct connection
        return request.client.host if request.client else "unknown"
    
    def is_rate_limited(self, client_ip: str, endpoint: str) -> tuple[bool, Optional[str]]:
        """
        Check if client has exceeded rate limits
        Returns: (is_limited, reason)
        """
        current_time = time.time()
        
        # Clean old entries (older than 1 hour)
        if client_ip in self.request_log:
            self.request_log[client_ip] = [
                (ts, ep) for ts, ep in self.request_log[client_ip]
                if current_time - ts < 3600
            ]
        
        requests = self.request_log[client_ip]
        
        # Check burst rate (requests in last 5 seconds)
        recent_requests = [ts for ts, _ in requests if current_time - ts < 5]
        if len(recent_requests) >= self.burst_size:
            return True, f"Burst limit exceeded ({self.burst_size} requests in 5 seconds)"
        
        # Check per-minute limit
        minute_requests = [ts for ts, _ in requests if current_time - ts < 60]
        if len(minute_requests) >= self.requests_per_minute:
            return True, f"Rate limit exceeded ({self.requests_per_minute} requests per minute)"
        
        # Check per-hour limit
        if len(requests) >= self.requests_per_hour:
            return True, f"Rate limit exceeded ({self.requests_per_hour} requests per hour)"
        
        return False, None
    
    def is_whitelisted(self, endpoint: str) -> bool:
        """Check if endpoint is whitelisted from rate limiting"""
        whitelist = [
            "/docs",
            "/redoc",
            "/openapi.json",
            "/health",
            "/metrics",
        ]
        return any(endpoint.startswith(path) for path in whitelist)
    
    def get_endpoint_specific_limit(self, endpoint: str) -> Optional[int]:
        """Get endpoint-specific rate limits"""
        # More restrictive limits for expensive operations
        if "/upload" in endpoint:
            return 20  # 20 uploads per minute
        if "/ai/" in endpoint or "/process" in endpoint:
            return 10  # 10 AI requests per minute
        if "/recommendations/generate" in endpoint:
            return 5  # 5 recommendation requests per minute
        return None
    
    async def dispatch(self, request: Request, call_next):
        """Process request with rate limiting"""
        
        endpoint = request.url.path
        client_ip = self.get_client_ip(request)
        
        # Skip rate limiting for whitelisted endpoints
        if self.is_whitelisted(endpoint):
            return await call_next(request)
        
        # Check rate limits
        is_limited, reason = self.is_rate_limited(client_ip, endpoint)
        
        if is_limited:
            logger.warning(
                f"Rate limit exceeded for {client_ip} on {endpoint}: {reason}"
            )
            return JSONResponse(
                status_code=429,
                content={
                    "detail": reason,
                    "retry_after": 60,  # Suggest retry after 60 seconds
                },
                headers={
                    "Retry-After": "60",
                    "X-RateLimit-Limit": str(self.requests_per_minute),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(time.time() + 60)),
                }
            )
        
        # Check endpoint-specific limits
        endpoint_limit = self.get_endpoint_specific_limit(endpoint)
        if endpoint_limit:
            endpoint_requests = [
                ts for ts, ep in self.request_log[client_ip]
                if ep == endpoint and time.time() - ts < 60
            ]
            if len(endpoint_requests) >= endpoint_limit:
                logger.warning(
                    f"Endpoint-specific rate limit exceeded for {client_ip} on {endpoint}"
                )
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": f"Too many requests to {endpoint}. Limit: {endpoint_limit}/minute",
                        "retry_after": 60,
                    },
                    headers={"Retry-After": "60"}
                )
        
        # Log request
        self.request_log[client_ip].append((time.time(), endpoint))
        
        # Add rate limit headers
        minute_requests = len([
            ts for ts, _ in self.request_log[client_ip]
            if time.time() - ts < 60
        ])
        
        response = await call_next(request)
        
        # Add rate limit info to response headers
        response.headers["X-RateLimit-Limit"] = str(self.requests_per_minute)
        response.headers["X-RateLimit-Remaining"] = str(
            max(0, self.requests_per_minute - minute_requests)
        )
        response.headers["X-RateLimit-Reset"] = str(int(time.time() + 60))
        
        return response


def setup_rate_limiting(app, config: Optional[dict] = None):
    """
    Setup rate limiting middleware
    
    Args:
        app: FastAPI application
        config: Rate limiting configuration
    """
    default_config = {
        "requests_per_minute": 100,
        "requests_per_hour": 1000,
        "burst_size": 20,
    }
    
    if config:
        default_config.update(config)
    
    app.add_middleware(RateLimitMiddleware, **default_config)
    logger.info(f"✅ Rate limiting enabled: {default_config}")
