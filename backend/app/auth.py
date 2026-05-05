from datetime import datetime, timedelta
from typing import Optional
import secrets
import hashlib
import base64

SECRET_KEY = secrets.token_hex(32)
TOKEN_EXPIRE_HOURS = 24

def create_token(user_id: str, email: str, role: str, tenant_id: Optional[str] = None) -> str:
    """Create a simple token for a user."""
    data = f"{user_id}:{email}:{role}:{tenant_id or ''}:{datetime.utcnow().timestamp() + TOKEN_EXPIRE_HOURS * 3600}"
    encoded = base64.b64encode(data.encode()).decode()
    return f"{SECRET_KEY[:8]}_{encoded}"

def verify_token(token: str) -> Optional[dict]:
    """Verify and decode a token."""
    try:
        if '_' not in token:
            return None
        parts = token.split('_', 1)
        if len(parts) != 2:
            return None
        encoded = parts[1]
        decoded = base64.b64decode(encoded.encode()).decode()
        fields = decoded.split(':')
        if len(fields) < 4:
            return None
        expiry = float(fields[4])
        if datetime.utcnow().timestamp() > expiry:
            return None
        return {
            "sub": fields[0],
            "email": fields[1],
            "role": fields[2],
            "tenant_id": fields[3] if fields[3] else None,
        }
    except Exception:
        return None

def create_password_hash(password: str) -> str:
    """Create a hash of a password."""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hash: str) -> bool:
    """Verify a password against a hash."""
    return create_password_hash(password) == hash

USERS_DB = {
    "user_001": {
        "id": "user_001",
        "email": "broker@thirdspace.risk",
        "password_hash": create_password_hash("demo123"),
        "name": "Alex Chen",
        "role": "broker",
        "tenant_id": "ts_001",
    },
    "user_002": {
        "id": "user_002",
        "email": "venue@elsewhere.com",
        "password_hash": create_password_hash("demo123"),
        "name": "Jordan Miller",
        "role": "venue_operator",
        "tenant_id": "elsewhere-brooklyn",
    },
}

USER_COUNTER = 3

def authenticate_user(email: str, password: str) -> Optional[dict]:
    """Authenticate a user by email and password."""
    for user in USERS_DB.values():
        if user["email"] == email and verify_password(password, user["password_hash"]):
            return user
    return None

def get_user_by_id(user_id: str) -> Optional[dict]:
    """Get a user by ID."""
    return USERS_DB.get(user_id)

def register_user(email: str, password: str, name: str, role: str = "venue_operator") -> Optional[dict]:
    """Register a new user."""
    global USER_COUNTER
    
    for user in USERS_DB.values():
        if user["email"] == email:
            return None
    
    user_id = f"user_{USER_COUNTER:03d}"
    USER_COUNTER += 1
    
    tenant_id = f"venue_{USER_COUNTER:03d}" if role == "venue_operator" else None
    
    new_user = {
        "id": user_id,
        "email": email,
        "password_hash": create_password_hash(password),
        "name": name,
        "role": role,
        "tenant_id": tenant_id,
    }
    
    USERS_DB[user_id] = new_user
    
    return new_user

from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel

router = APIRouter()

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    role: str = "venue_operator"

@router.post("/login")
def login(request: LoginRequest):
    user = authenticate_user(request.email, request.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(user["id"], user["email"], user["role"], user["tenant_id"])
    
    # Format the user data correctly to remove password_hash before returning
    safe_user = {k: v for k, v in user.items() if k != "password_hash"}
    
    return {"access_token": token, "user": safe_user}

@router.post("/register")
def register(request: RegisterRequest):
    user = register_user(request.email, request.password, request.name, request.role)
    if not user:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    token = create_token(user["id"], user["email"], user["role"], user["tenant_id"])
    
    safe_user = {k: v for k, v in user.items() if k != "password_hash"}
    
    return {"access_token": token, "user": safe_user}

@router.get("/me")
def get_me(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    
    token = authorization.split(" ")[1]
    decoded = verify_token(token)
    
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
        
    user = get_user_by_id(decoded["sub"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    safe_user = {k: v for k, v in user.items() if k != "password_hash"}
    return safe_user