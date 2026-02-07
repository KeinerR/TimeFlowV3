from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import asyncio
import resend

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'default-secret-key')
ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get('ACCESS_TOKEN_EXPIRE_MINUTES', 1440))

# Resend Config
resend.api_key = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# Custom middleware to fix HTTPS redirects
class HTTPSRedirectMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        # Fix redirect URLs to use HTTPS when X-Forwarded-Proto is https
        if response.status_code in (301, 302, 307, 308):
            location = response.headers.get('location', '')
            if location.startswith('http://') and request.headers.get('x-forwarded-proto') == 'https':
                new_location = location.replace('http://', 'https://', 1)
                response.headers['location'] = new_location
        return response

# Create the main app
app = FastAPI(title="TimeFlow API", version="1.0.0")

# Create routers
api_router = APIRouter(prefix="/api")
auth_router = APIRouter(prefix="/auth", tags=["Authentication"])
users_router = APIRouter(prefix="/users", tags=["Users"])
businesses_router = APIRouter(prefix="/businesses", tags=["Businesses"])
services_router = APIRouter(prefix="/services", tags=["Services"])
staff_router = APIRouter(prefix="/staff", tags=["Staff"])
appointments_router = APIRouter(prefix="/appointments", tags=["Appointments"])
notifications_router = APIRouter(prefix="/notifications", tags=["Notifications"])
finance_router = APIRouter(prefix="/finance", tags=["Finance"])
reports_router = APIRouter(prefix="/reports", tags=["Reports"])
public_router = APIRouter(prefix="/public", tags=["Public"])

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============== ENUMS ==============
ROLES = ["super_admin", "admin", "business", "staff", "client"]
APPOINTMENT_STATUSES = ["pending", "confirmed", "cancelled", "rescheduled", "attended", "no_show"]
PAYMENT_METHODS = ["payu", "transfer", "cash"]

# ============== MODELS ==============
class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    phone: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    role: str = "client"
    businesses: List[str] = []
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    language: str = "es"

class UserResponse(BaseModel):
    id: str
    email: str
    first_name: str
    last_name: str
    phone: Optional[str] = None
    role: str
    businesses: List[str] = []
    is_active: bool
    language: str = "es"

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class BusinessBase(BaseModel):
    name: str
    description: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None

class BusinessCreate(BusinessBase):
    pass

class BusinessUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    is_active: Optional[bool] = None
    payment_config: Optional[Dict] = None

class Business(BusinessBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    owner_id: str
    payment_config: Dict = Field(default_factory=lambda: {"payu": {"enabled": False}, "transfer": {"enabled": False}})
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ServiceBase(BaseModel):
    name: str
    description: Optional[str] = None
    duration_minutes: int = 30
    price: Optional[float] = None

class ServiceCreate(ServiceBase):
    business_id: str
    staff_ids: List[str] = []

class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    price: Optional[float] = None
    staff_ids: Optional[List[str]] = None
    is_active: Optional[bool] = None

class Service(ServiceBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    business_id: str
    staff_ids: List[str] = []
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StaffBase(BaseModel):
    schedule: Dict = Field(default_factory=lambda: {
        "monday": {"start": "09:00", "end": "18:00", "enabled": True},
        "tuesday": {"start": "09:00", "end": "18:00", "enabled": True},
        "wednesday": {"start": "09:00", "end": "18:00", "enabled": True},
        "thursday": {"start": "09:00", "end": "18:00", "enabled": True},
        "friday": {"start": "09:00", "end": "18:00", "enabled": True},
        "saturday": {"start": "09:00", "end": "14:00", "enabled": False},
        "sunday": {"start": "09:00", "end": "14:00", "enabled": False}
    })

class StaffCreate(StaffBase):
    user_id: str
    business_id: str
    service_ids: List[str] = []

class StaffUpdate(BaseModel):
    service_ids: Optional[List[str]] = None
    schedule: Optional[Dict] = None
    is_active: Optional[bool] = None

class Staff(StaffBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    business_id: str
    service_ids: List[str] = []
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AppointmentBase(BaseModel):
    date: datetime
    notes: Optional[str] = None

class AppointmentCreate(AppointmentBase):
    business_id: str
    service_id: str
    staff_id: str
    client_id: Optional[str] = None
    client_name: Optional[str] = None
    client_email: Optional[EmailStr] = None
    client_phone: Optional[str] = None

class AppointmentUpdate(BaseModel):
    date: Optional[datetime] = None
    status: Optional[str] = None
    price_final: Optional[float] = None
    notes: Optional[str] = None

class Appointment(AppointmentBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    business_id: str
    service_id: str
    staff_id: str
    client_id: str
    status: str = "pending"
    price_final: Optional[float] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NotificationBase(BaseModel):
    type: str
    title: str
    message: str

class Notification(NotificationBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PaymentBase(BaseModel):
    amount: float
    method: str
    reference: Optional[str] = None
    notes: Optional[str] = None

class PaymentCreate(PaymentBase):
    business_id: str
    appointment_id: Optional[str] = None

class Payment(PaymentBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    business_id: str
    appointment_id: Optional[str] = None
    receipt_url: Optional[str] = None
    status: str = "completed"  # completed, pending_validation, pending_payment
    pending_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Payment completion request for attended appointments
class AppointmentPaymentRequest(BaseModel):
    payment_method: str  # cash, transfer, pending
    receipt_image: Optional[str] = None  # Base64 image for transfer
    pending_reason: Optional[str] = None  # Reason if payment is pending

class PlatformPayment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    business_id: str
    amount: float
    method: str
    reference: Optional[str] = None
    receipt_url: Optional[str] = None
    status: str = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PublicBookingRequest(BaseModel):
    business_id: str
    service_id: str
    staff_id: str
    date: datetime
    client_name: str
    client_email: EmailStr
    client_phone: str
    notes: Optional[str] = None

# ============== HELPERS ==============
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user is None:
        raise credentials_exception
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="User account is disabled")
    return user

async def get_optional_user(token: Optional[str] = None) -> Optional[dict]:
    if not token:
        return None
    try:
        return await get_current_user(token)
    except:
        return None

def require_roles(allowed_roles: List[str]):
    async def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user["role"] not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return role_checker

async def send_notification(user_id: str, type: str, title: str, message: str):
    notification = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": type,
        "title": title,
        "message": message,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    return notification

async def send_email_notification(to_email: str, subject: str, html_content: str):
    if not resend.api_key:
        logger.warning("Resend API key not configured, skipping email")
        return None
    try:
        params = {
            "from": SENDER_EMAIL,
            "to": [to_email],
            "subject": subject,
            "html": html_content
        }
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email sent to {to_email}")
        return result
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        return None

def serialize_doc(doc: dict) -> dict:
    """Serialize MongoDB document for JSON response"""
    if doc is None:
        return None
    result = {k: v for k, v in doc.items() if k != "_id"}
    for key, value in result.items():
        if isinstance(value, datetime):
            result[key] = value.isoformat()
    return result

# ============== AUTH ROUTES ==============
@auth_router.post("/register", response_model=Token)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        email=user_data.email,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        phone=user_data.phone,
        role="client"
    )
    user_dict = user.model_dump()
    user_dict["password_hash"] = get_password_hash(user_data.password)
    user_dict["created_at"] = user_dict["created_at"].isoformat()
    
    await db.users.insert_one(user_dict)
    
    access_token = create_access_token(data={"sub": user.id, "role": user.role})
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(**user.model_dump())
    )

@auth_router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await db.users.find_one({"email": form_data.username}, {"_id": 0})
    if not user or not verify_password(form_data.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is disabled")
    
    access_token = create_access_token(data={"sub": user["id"], "role": user["role"]})
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            first_name=user["first_name"],
            last_name=user["last_name"],
            phone=user.get("phone"),
            role=user["role"],
            businesses=user.get("businesses", []),
            is_active=user["is_active"],
            language=user.get("language", "es")
        )
    )

@auth_router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        first_name=current_user["first_name"],
        last_name=current_user["last_name"],
        phone=current_user.get("phone"),
        role=current_user["role"],
        businesses=current_user.get("businesses", []),
        is_active=current_user["is_active"],
        language=current_user.get("language", "es")
    )

@auth_router.put("/me", response_model=UserResponse)
async def update_me(update_data: UserUpdate, current_user: dict = Depends(get_current_user)):
    update_fields = {k: v for k, v in update_data.model_dump().items() if v is not None}
    if "role" in update_fields:
        del update_fields["role"]
    if "is_active" in update_fields:
        del update_fields["is_active"]
    
    if update_fields:
        await db.users.update_one({"id": current_user["id"]}, {"$set": update_fields})
    
    updated = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    return UserResponse(**{k: v for k, v in updated.items() if k != "password_hash"})

@auth_router.put("/me/language")
async def update_language(language: str, current_user: dict = Depends(get_current_user)):
    if language not in ["es", "en"]:
        raise HTTPException(status_code=400, detail="Invalid language")
    await db.users.update_one({"id": current_user["id"]}, {"$set": {"language": language}})
    return {"message": "Language updated", "language": language}

# ============== USERS ROUTES ==============
@users_router.get("/", response_model=List[UserResponse])
async def get_users(
    role: Optional[str] = None,
    business_id: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: dict = Depends(require_roles(["super_admin", "admin", "business", "staff"]))
):
    query = {}
    
    # CRITICAL: Hide super_admin from all non-super_admin users
    if current_user["role"] != "super_admin":
        query["role"] = {"$ne": "super_admin"}
    
    # Data isolation by business
    if current_user["role"] == "super_admin":
        pass  # Super admin can see all users
    elif current_user["role"] == "admin":
        user_businesses = current_user.get("businesses", [])
        if user_businesses:
            query["$or"] = [
                {"businesses": {"$in": user_businesses}},
                {"id": {"$in": await get_business_user_ids(user_businesses)}}
            ]
        else:
            query["id"] = current_user["id"]  # Only see themselves if no businesses
    elif current_user["role"] in ["business", "staff"]:
        user_businesses = current_user.get("businesses", [])
        if user_businesses:
            query["businesses"] = {"$in": user_businesses}
        else:
            query["id"] = current_user["id"]
    
    # Apply role filter (but respect super_admin hiding)
    if role:
        if current_user["role"] != "super_admin" and role == "super_admin":
            return []  # Cannot request super_admin list
        if "role" in query and isinstance(query["role"], dict):
            query["role"]["$eq"] = role
        else:
            query["role"] = role
    
    if business_id:
        # Validate user has access to this business
        if current_user["role"] != "super_admin":
            if business_id not in current_user.get("businesses", []):
                raise HTTPException(status_code=403, detail="No access to this business")
        query["businesses"] = business_id
    
    if is_active is not None:
        query["is_active"] = is_active
    
    users = await db.users.find(query, {"_id": 0, "password_hash": 0}).to_list(1000)
    return [UserResponse(**u) for u in users]

async def get_business_user_ids(business_ids: List[str]) -> List[str]:
    businesses = await db.businesses.find({"id": {"$in": business_ids}}, {"_id": 0, "owner_id": 1}).to_list(100)
    return [b["owner_id"] for b in businesses]

@users_router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, current_user: dict = Depends(require_roles(["super_admin", "admin", "business", "staff"]))):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # CRITICAL: Hide super_admin from non-super_admin users
    if user.get("role") == "super_admin" and current_user["role"] != "super_admin":
        raise HTTPException(status_code=404, detail="User not found")
    
    # Data isolation: verify access to this user
    if current_user["role"] != "super_admin":
        user_businesses = current_user.get("businesses", [])
        target_businesses = user.get("businesses", [])
        has_access = bool(set(user_businesses) & set(target_businesses)) or user_id == current_user["id"]
        if not has_access:
            raise HTTPException(status_code=403, detail="No access to this user")
    
    return UserResponse(**user)

@users_router.post("/", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    role: str = "client",
    business_ids: Optional[str] = None,
    current_user: dict = Depends(require_roles(["super_admin", "admin", "business", "staff"]))
):
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Role permission validation
    if current_user["role"] != "super_admin":
        if role in ["super_admin", "admin"]:
            raise HTTPException(status_code=403, detail="Cannot create users with this role")
        # Business and staff can only create clients
        if current_user["role"] in ["business", "staff"] and role not in ["client"]:
            raise HTTPException(status_code=403, detail="Can only create client users")
    
    # Parse business_ids from comma-separated string
    business_list = []
    if business_ids:
        business_list = [bid.strip() for bid in business_ids.split(",") if bid.strip()]
    
    # Data isolation: non-super_admin can only assign to their own businesses
    if current_user["role"] != "super_admin" and business_list:
        user_businesses = current_user.get("businesses", [])
        for bid in business_list:
            if bid not in user_businesses:
                raise HTTPException(status_code=403, detail=f"No access to business {bid}")
    
    # If no business_ids provided, assign to current user's first business (for non-super_admin)
    if not business_list and current_user["role"] != "super_admin" and role == "client":
        user_businesses = current_user.get("businesses", [])
        if user_businesses:
            business_list = [user_businesses[0]]
    
    user = User(
        email=user_data.email,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        phone=user_data.phone,
        role=role,
        businesses=business_list
    )
    user_dict = user.model_dump()
    user_dict["password_hash"] = get_password_hash(user_data.password)
    user_dict["created_at"] = user_dict["created_at"].isoformat()
    
    await db.users.insert_one(user_dict)
    return UserResponse(**user.model_dump())

@users_router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    update_data: UserUpdate,
    current_user: dict = Depends(require_roles(["super_admin", "admin", "business"]))
):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # CRITICAL: Cannot modify super_admin unless you are super_admin
    if user.get("role") == "super_admin" and current_user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Cannot modify this user")
    
    # Data isolation check
    if current_user["role"] != "super_admin":
        user_businesses = current_user.get("businesses", [])
        target_businesses = user.get("businesses", [])
        has_access = bool(set(user_businesses) & set(target_businesses))
        if not has_access and user_id != current_user["id"]:
            raise HTTPException(status_code=403, detail="No access to this user")
    
    update_fields = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    # Role change validation
    if "role" in update_fields:
        if current_user["role"] != "super_admin":
            # Non-super_admin cannot change to super_admin or admin
            if update_fields["role"] in ["super_admin", "admin"]:
                raise HTTPException(status_code=403, detail="Cannot assign this role")
            # Non-super_admin cannot change their own role
            if user_id == current_user["id"]:
                del update_fields["role"]
        else:
            # Super admin can change any role, but validate it's a valid role
            if update_fields["role"] not in ROLES:
                raise HTTPException(status_code=400, detail="Invalid role")
    
    if update_fields:
        await db.users.update_one({"id": user_id}, {"$set": update_fields})
    
    updated = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return UserResponse(**updated)

@users_router.put("/{user_id}/businesses")
async def assign_user_to_businesses(
    user_id: str,
    business_ids: List[str],
    current_user: dict = Depends(require_roles(["super_admin", "admin"]))
):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.users.update_one({"id": user_id}, {"$set": {"businesses": business_ids}})
    return {"message": "Businesses assigned", "business_ids": business_ids}

# ============== BUSINESSES ROUTES ==============
@businesses_router.get("/")
async def get_businesses(
    is_active: Optional[bool] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    
    if current_user["role"] == "super_admin":
        pass
    elif current_user["role"] in ["admin", "business"]:
        query["$or"] = [
            {"owner_id": current_user["id"]},
            {"id": {"$in": current_user.get("businesses", [])}}
        ]
    else:
        query["is_active"] = True
    
    if is_active is not None:
        query["is_active"] = is_active
    
    businesses = await db.businesses.find(query, {"_id": 0}).to_list(1000)
    return [serialize_doc(b) for b in businesses]

@businesses_router.get("/{business_id}")
async def get_business(business_id: str, current_user: dict = Depends(get_current_user)):
    business = await db.businesses.find_one({"id": business_id}, {"_id": 0})
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    return serialize_doc(business)

@businesses_router.post("/")
async def create_business(
    business_data: BusinessCreate,
    current_user: dict = Depends(require_roles(["super_admin", "admin"]))
):
    business = Business(
        name=business_data.name,
        description=business_data.description,
        address=business_data.address,
        phone=business_data.phone,
        email=business_data.email,
        owner_id=current_user["id"]
    )
    business_dict = business.model_dump()
    business_dict["created_at"] = business_dict["created_at"].isoformat()
    
    await db.businesses.insert_one(business_dict)
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$addToSet": {"businesses": business.id}}
    )
    
    return serialize_doc(business_dict)

@businesses_router.put("/{business_id}")
async def update_business(
    business_id: str,
    update_data: BusinessUpdate,
    current_user: dict = Depends(require_roles(["super_admin", "admin", "business"]))
):
    business = await db.businesses.find_one({"id": business_id}, {"_id": 0})
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    if current_user["role"] != "super_admin" and business["owner_id"] != current_user["id"]:
        if business_id not in current_user.get("businesses", []):
            raise HTTPException(status_code=403, detail="Not authorized")
    
    update_fields = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if update_fields:
        await db.businesses.update_one({"id": business_id}, {"$set": update_fields})
    
    updated = await db.businesses.find_one({"id": business_id}, {"_id": 0})
    return serialize_doc(updated)

@businesses_router.put("/{business_id}/payment-config")
async def update_payment_config(
    business_id: str,
    payment_config: Dict,
    current_user: dict = Depends(require_roles(["super_admin", "admin", "business"]))
):
    business = await db.businesses.find_one({"id": business_id}, {"_id": 0})
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    await db.businesses.update_one(
        {"id": business_id},
        {"$set": {"payment_config": payment_config}}
    )
    return {"message": "Payment config updated"}

# ============== SERVICES ROUTES ==============
@services_router.get("/")
async def get_services(
    business_id: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    
    if business_id:
        # Data isolation check
        if current_user["role"] not in ["super_admin", "client"]:
            if business_id not in current_user.get("businesses", []):
                raise HTTPException(status_code=403, detail="No access to this business")
        query["business_id"] = business_id
    elif current_user["role"] not in ["super_admin", "client"]:
        user_businesses = current_user.get("businesses", [])
        if user_businesses:
            query["business_id"] = {"$in": user_businesses}
        else:
            return []  # No businesses assigned
    
    if is_active is not None:
        query["is_active"] = is_active
    
    services = await db.services.find(query, {"_id": 0}).to_list(1000)
    return [serialize_doc(s) for s in services]

@services_router.get("/{service_id}")
async def get_service(service_id: str, current_user: dict = Depends(get_current_user)):
    service = await db.services.find_one({"id": service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Data isolation check (clients and super_admin can see all active services)
    if current_user["role"] not in ["super_admin", "client"]:
        if service["business_id"] not in current_user.get("businesses", []):
            raise HTTPException(status_code=403, detail="No access to this service")
    
    return serialize_doc(service)

@services_router.post("/")
async def create_service(
    service_data: ServiceCreate,
    current_user: dict = Depends(require_roles(["super_admin", "admin", "business"]))
):
    # Data isolation check
    if current_user["role"] != "super_admin":
        if service_data.business_id not in current_user.get("businesses", []):
            raise HTTPException(status_code=403, detail="No access to this business")
    
    business = await db.businesses.find_one({"id": service_data.business_id}, {"_id": 0})
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    service = Service(
        name=service_data.name,
        description=service_data.description,
        duration_minutes=service_data.duration_minutes,
        price=service_data.price,
        business_id=service_data.business_id,
        staff_ids=service_data.staff_ids
    )
    service_dict = service.model_dump()
    service_dict["created_at"] = service_dict["created_at"].isoformat()
    
    await db.services.insert_one(service_dict)
    return serialize_doc(service_dict)

@services_router.put("/{service_id}")
async def update_service(
    service_id: str,
    update_data: ServiceUpdate,
    current_user: dict = Depends(require_roles(["super_admin", "admin", "business"]))
):
    service = await db.services.find_one({"id": service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Data isolation check
    if current_user["role"] != "super_admin":
        if service["business_id"] not in current_user.get("businesses", []):
            raise HTTPException(status_code=403, detail="No access to this service")
    
    update_fields = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if update_fields:
        await db.services.update_one({"id": service_id}, {"$set": update_fields})
    
    updated = await db.services.find_one({"id": service_id}, {"_id": 0})
    return serialize_doc(updated)

# ============== STAFF ROUTES ==============
@staff_router.get("/")
async def get_staff(
    business_id: Optional[str] = None,
    service_id: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    
    if business_id:
        # Data isolation check (clients and super_admin can see staff for booking)
        if current_user["role"] not in ["super_admin", "client"]:
            if business_id not in current_user.get("businesses", []):
                raise HTTPException(status_code=403, detail="No access to this business")
        query["business_id"] = business_id
    elif current_user["role"] not in ["super_admin", "client"]:
        user_businesses = current_user.get("businesses", [])
        if user_businesses:
            query["business_id"] = {"$in": user_businesses}
        else:
            return []
    
    if service_id:
        query["service_ids"] = service_id
    
    if is_active is not None:
        query["is_active"] = is_active
    
    staff_list = await db.staff.find(query, {"_id": 0}).to_list(1000)
    
    result = []
    for s in staff_list:
        user = await db.users.find_one({"id": s["user_id"]}, {"_id": 0, "password_hash": 0})
        if user:
            s["user"] = user
        result.append(serialize_doc(s))
    
    return result

@staff_router.get("/{staff_id}")
async def get_staff_member(staff_id: str, current_user: dict = Depends(get_current_user)):
    staff = await db.staff.find_one({"id": staff_id}, {"_id": 0})
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    # Data isolation check
    if current_user["role"] not in ["super_admin", "client"]:
        if staff["business_id"] not in current_user.get("businesses", []):
            raise HTTPException(status_code=403, detail="No access to this staff")
    
    user = await db.users.find_one({"id": staff["user_id"]}, {"_id": 0, "password_hash": 0})
    if user:
        staff["user"] = user
    
    return serialize_doc(staff)

@staff_router.post("/")
async def create_staff(
    staff_data: StaffCreate,
    current_user: dict = Depends(require_roles(["super_admin", "admin", "business"]))
):
    # Data isolation check
    if current_user["role"] != "super_admin":
        if staff_data.business_id not in current_user.get("businesses", []):
            raise HTTPException(status_code=403, detail="No access to this business")
    
    user = await db.users.find_one({"id": staff_data.user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    business = await db.businesses.find_one({"id": staff_data.business_id}, {"_id": 0})
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    existing = await db.staff.find_one({
        "user_id": staff_data.user_id,
        "business_id": staff_data.business_id
    }, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Staff already exists for this user and business")
    
    staff = Staff(
        user_id=staff_data.user_id,
        business_id=staff_data.business_id,
        service_ids=staff_data.service_ids,
        schedule=staff_data.schedule
    )
    staff_dict = staff.model_dump()
    staff_dict["created_at"] = staff_dict["created_at"].isoformat()
    
    await db.staff.insert_one(staff_dict)
    
    await db.users.update_one(
        {"id": staff_data.user_id},
        {"$set": {"role": "staff"}, "$addToSet": {"businesses": staff_data.business_id}}
    )
    
    result = serialize_doc(staff_dict)
    result["user"] = user
    return result

@staff_router.put("/{staff_id}")
async def update_staff(
    staff_id: str,
    update_data: StaffUpdate,
    current_user: dict = Depends(require_roles(["super_admin", "admin", "business"]))
):
    staff = await db.staff.find_one({"id": staff_id}, {"_id": 0})
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    # Data isolation check
    if current_user["role"] != "super_admin":
        if staff["business_id"] not in current_user.get("businesses", []):
            raise HTTPException(status_code=403, detail="No access to this staff")
    
    update_fields = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if update_fields:
        await db.staff.update_one({"id": staff_id}, {"$set": update_fields})
    
    updated = await db.staff.find_one({"id": staff_id}, {"_id": 0})
    return serialize_doc(updated)

# ============== APPOINTMENTS ROUTES ==============
@appointments_router.get("/")
async def get_appointments(
    business_id: Optional[str] = None,
    staff_id: Optional[str] = None,
    client_id: Optional[str] = None,
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    
    if current_user["role"] == "client":
        query["client_id"] = current_user["id"]
    elif current_user["role"] == "staff":
        staff = await db.staff.find_one({"user_id": current_user["id"]}, {"_id": 0})
        if staff:
            query["staff_id"] = staff["id"]
    elif current_user["role"] in ["business", "admin"]:
        if business_id:
            query["business_id"] = business_id
        else:
            query["business_id"] = {"$in": current_user.get("businesses", [])}
    
    if staff_id:
        query["staff_id"] = staff_id
    if client_id:
        query["client_id"] = client_id
    if status:
        query["status"] = status
    
    if date_from:
        query["date"] = {"$gte": date_from}
    if date_to:
        if "date" in query:
            query["date"]["$lte"] = date_to
        else:
            query["date"] = {"$lte": date_to}
    
    appointments = await db.appointments.find(query, {"_id": 0}).to_list(1000)
    
    result = []
    for apt in appointments:
        service = await db.services.find_one({"id": apt["service_id"]}, {"_id": 0})
        staff = await db.staff.find_one({"id": apt["staff_id"]}, {"_id": 0})
        client = await db.users.find_one({"id": apt["client_id"]}, {"_id": 0, "password_hash": 0})
        
        apt_data = serialize_doc(apt)
        if service:
            apt_data["service"] = serialize_doc(service)
        if staff:
            staff_user = await db.users.find_one({"id": staff["user_id"]}, {"_id": 0, "password_hash": 0})
            apt_data["staff"] = serialize_doc(staff)
            if staff_user:
                apt_data["staff"]["user"] = staff_user
        if client:
            apt_data["client"] = client
        
        result.append(apt_data)
    
    return result

@appointments_router.get("/{appointment_id}")
async def get_appointment(appointment_id: str, current_user: dict = Depends(get_current_user)):
    apt = await db.appointments.find_one({"id": appointment_id}, {"_id": 0})
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    service = await db.services.find_one({"id": apt["service_id"]}, {"_id": 0})
    staff = await db.staff.find_one({"id": apt["staff_id"]}, {"_id": 0})
    client = await db.users.find_one({"id": apt["client_id"]}, {"_id": 0, "password_hash": 0})
    
    apt_data = serialize_doc(apt)
    if service:
        apt_data["service"] = serialize_doc(service)
    if staff:
        staff_user = await db.users.find_one({"id": staff["user_id"]}, {"_id": 0, "password_hash": 0})
        apt_data["staff"] = serialize_doc(staff)
        if staff_user:
            apt_data["staff"]["user"] = staff_user
    if client:
        apt_data["client"] = client
    
    return apt_data

@appointments_router.post("/")
async def create_appointment(
    apt_data: AppointmentCreate,
    current_user: dict = Depends(get_current_user)
):
    service = await db.services.find_one({"id": apt_data.service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    staff = await db.staff.find_one({"id": apt_data.staff_id}, {"_id": 0})
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    client_id = apt_data.client_id or current_user["id"]
    
    appointment = Appointment(
        business_id=apt_data.business_id,
        service_id=apt_data.service_id,
        staff_id=apt_data.staff_id,
        client_id=client_id,
        date=apt_data.date,
        notes=apt_data.notes,
        price_final=service.get("price")
    )
    apt_dict = appointment.model_dump()
    apt_dict["date"] = apt_dict["date"].isoformat()
    apt_dict["created_at"] = apt_dict["created_at"].isoformat()
    
    await db.appointments.insert_one(apt_dict)
    
    # Send notifications
    client = await db.users.find_one({"id": client_id}, {"_id": 0})
    staff_user = await db.users.find_one({"id": staff["user_id"]}, {"_id": 0})
    business = await db.businesses.find_one({"id": apt_data.business_id}, {"_id": 0})
    
    await send_notification(
        client_id,
        "appointment_created",
        "Nueva Cita Creada",
        f"Tu cita para {service['name']} ha sido creada para {apt_data.date.strftime('%d/%m/%Y %H:%M')}"
    )
    
    await send_notification(
        staff["user_id"],
        "appointment_created",
        "Nueva Cita Asignada",
        f"Se te ha asignado una cita para {service['name']} el {apt_data.date.strftime('%d/%m/%Y %H:%M')}"
    )
    
    # Send email
    if client and client.get("email"):
        await send_email_notification(
            client["email"],
            f"Confirmación de Cita - {business['name'] if business else 'TimeFlow'}",
            f"""
            <h2>Cita Confirmada</h2>
            <p>Hola {client['first_name']},</p>
            <p>Tu cita ha sido confirmada:</p>
            <ul>
                <li><strong>Servicio:</strong> {service['name']}</li>
                <li><strong>Fecha:</strong> {apt_data.date.strftime('%d/%m/%Y %H:%M')}</li>
                <li><strong>Profesional:</strong> {staff_user['first_name']} {staff_user['last_name'] if staff_user else ''}</li>
            </ul>
            <p>Gracias por confiar en nosotros.</p>
            """
        )
    
    return serialize_doc(apt_dict)

@appointments_router.put("/{appointment_id}")
async def update_appointment(
    appointment_id: str,
    update_data: AppointmentUpdate,
    current_user: dict = Depends(get_current_user)
):
    apt = await db.appointments.find_one({"id": appointment_id}, {"_id": 0})
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Data isolation check
    if current_user["role"] not in ["super_admin"]:
        if current_user["role"] == "client":
            if apt["client_id"] != current_user["id"]:
                raise HTTPException(status_code=403, detail="Not authorized")
        else:
            if apt["business_id"] not in current_user.get("businesses", []):
                raise HTTPException(status_code=403, detail="Not authorized")
    
    old_status = apt.get("status")
    update_fields = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if "date" in update_fields:
        update_fields["date"] = update_fields["date"].isoformat()
        if old_status != "rescheduled":
            update_fields["status"] = "rescheduled"
    
    if update_fields:
        await db.appointments.update_one({"id": appointment_id}, {"$set": update_fields})
    
    updated = await db.appointments.find_one({"id": appointment_id}, {"_id": 0})
    
    # Notifications for status change
    new_status = updated.get("status")
    if new_status != old_status:
        client = await db.users.find_one({"id": apt["client_id"]}, {"_id": 0})
        staff = await db.staff.find_one({"id": apt["staff_id"]}, {"_id": 0})
        service = await db.services.find_one({"id": apt["service_id"]}, {"_id": 0})
        
        status_messages = {
            "confirmed": "Tu cita ha sido confirmada",
            "cancelled": "Tu cita ha sido cancelada",
            "rescheduled": "Tu cita ha sido reprogramada",
            "attended": "Tu cita ha sido marcada como atendida",
            "no_show": "Se ha registrado que no asististe a tu cita"
        }
        
        message = status_messages.get(new_status, f"El estado de tu cita ha cambiado a {new_status}")
        
        await send_notification(apt["client_id"], f"appointment_{new_status}", "Actualización de Cita", message)
        
        if staff:
            await send_notification(staff["user_id"], f"appointment_{new_status}", "Actualización de Cita", message)
        
        if client and client.get("email") and new_status in ["cancelled", "rescheduled"]:
            await send_email_notification(
                client["email"],
                f"Cita {new_status.capitalize()} - TimeFlow",
                f"<h2>{message}</h2><p>Servicio: {service['name'] if service else 'N/A'}</p>"
            )
    
    return serialize_doc(updated)

# New endpoint for completing appointment with payment
@appointments_router.post("/{appointment_id}/complete")
async def complete_appointment_with_payment(
    appointment_id: str,
    payment_request: AppointmentPaymentRequest,
    current_user: dict = Depends(require_roles(["super_admin", "admin", "business", "staff"]))
):
    apt = await db.appointments.find_one({"id": appointment_id}, {"_id": 0})
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Data isolation check
    if current_user["role"] != "super_admin":
        if apt["business_id"] not in current_user.get("businesses", []):
            raise HTTPException(status_code=403, detail="Not authorized")
    
    if apt.get("status") in ["attended", "cancelled"]:
        raise HTTPException(status_code=400, detail="Appointment already completed or cancelled")
    
    service = await db.services.find_one({"id": apt["service_id"]}, {"_id": 0})
    price = apt.get("price_final") or (service.get("price") if service else 0)
    
    # Update appointment status to attended
    await db.appointments.update_one(
        {"id": appointment_id},
        {"$set": {"status": "attended", "price_final": price}}
    )
    
    # Handle payment based on method
    payment_status = "completed"
    pending_reason = None
    receipt_url = None
    
    if payment_request.payment_method == "cash":
        payment_status = "completed"
    elif payment_request.payment_method == "transfer":
        payment_status = "pending_validation"
        if payment_request.receipt_image:
            # Store base64 image as receipt_url (in production, upload to storage)
            receipt_url = payment_request.receipt_image
    elif payment_request.payment_method == "pending":
        payment_status = "pending_payment"
        pending_reason = payment_request.pending_reason or "Payment pending"
    
    # Create payment record
    payment = {
        "id": str(uuid.uuid4()),
        "business_id": apt["business_id"],
        "appointment_id": appointment_id,
        "amount": price,
        "method": payment_request.payment_method,
        "status": payment_status,
        "pending_reason": pending_reason,
        "receipt_url": receipt_url,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payments.insert_one(payment)
    
    # Notifications
    client = await db.users.find_one({"id": apt["client_id"]}, {"_id": 0})
    staff = await db.staff.find_one({"id": apt["staff_id"]}, {"_id": 0})
    
    await send_notification(
        apt["client_id"],
        "appointment_attended",
        "Cita Atendida",
        f"Tu cita ha sido completada exitosamente"
    )
    
    if staff:
        await send_notification(
            staff["user_id"],
            "appointment_attended",
            "Cita Completada",
            f"Has completado una cita"
        )
    
    return {
        "message": "Appointment completed",
        "appointment_id": appointment_id,
        "payment_id": payment["id"],
        "payment_status": payment_status,
        "amount": price
    }

# Validate pending transfer payment
@appointments_router.post("/{appointment_id}/validate-payment")
async def validate_payment(
    appointment_id: str,
    approved: bool = True,
    current_user: dict = Depends(require_roles(["super_admin", "admin", "business"]))
):
    apt = await db.appointments.find_one({"id": appointment_id}, {"_id": 0})
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Data isolation check
    if current_user["role"] != "super_admin":
        if apt["business_id"] not in current_user.get("businesses", []):
            raise HTTPException(status_code=403, detail="Not authorized")
    
    payment = await db.payments.find_one({"appointment_id": appointment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if payment.get("status") != "pending_validation":
        raise HTTPException(status_code=400, detail="Payment is not pending validation")
    
    new_status = "completed" if approved else "rejected"
    await db.payments.update_one(
        {"id": payment["id"]},
        {"$set": {"status": new_status, "validated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": f"Payment {'approved' if approved else 'rejected'}", "payment_id": payment["id"]}

# Confirm pending payment
@appointments_router.post("/{appointment_id}/confirm-payment")
async def confirm_pending_payment(
    appointment_id: str,
    payment_method: str,
    receipt_image: Optional[str] = None,
    current_user: dict = Depends(require_roles(["super_admin", "admin", "business", "staff"]))
):
    apt = await db.appointments.find_one({"id": appointment_id}, {"_id": 0})
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Data isolation check
    if current_user["role"] != "super_admin":
        if apt["business_id"] not in current_user.get("businesses", []):
            raise HTTPException(status_code=403, detail="Not authorized")
    
    payment = await db.payments.find_one({"appointment_id": appointment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if payment.get("status") != "pending_payment":
        raise HTTPException(status_code=400, detail="Payment is not pending")
    
    new_status = "completed" if payment_method == "cash" else "pending_validation"
    update_data = {
        "status": new_status,
        "method": payment_method,
        "confirmed_at": datetime.now(timezone.utc).isoformat()
    }
    
    if receipt_image:
        update_data["receipt_url"] = receipt_image
    
    await db.payments.update_one({"id": payment["id"]}, {"$set": update_data})
    
    return {"message": "Payment confirmed", "payment_id": payment["id"], "status": new_status}

@appointments_router.delete("/{appointment_id}")
async def cancel_appointment(appointment_id: str, current_user: dict = Depends(get_current_user)):
    apt = await db.appointments.find_one({"id": appointment_id}, {"_id": 0})
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    if current_user["role"] == "client" and apt["client_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.appointments.update_one({"id": appointment_id}, {"$set": {"status": "cancelled"}})
    
    # Notifications
    client = await db.users.find_one({"id": apt["client_id"]}, {"_id": 0})
    staff = await db.staff.find_one({"id": apt["staff_id"]}, {"_id": 0})
    
    await send_notification(apt["client_id"], "appointment_cancelled", "Cita Cancelada", "Tu cita ha sido cancelada")
    if staff:
        await send_notification(staff["user_id"], "appointment_cancelled", "Cita Cancelada", "Una cita ha sido cancelada")
    
    return {"message": "Appointment cancelled"}

# ============== PUBLIC ROUTES ==============
@public_router.get("/businesses")
async def get_public_businesses():
    businesses = await db.businesses.find({"is_active": True}, {"_id": 0, "payment_config": 0}).to_list(100)
    return [serialize_doc(b) for b in businesses]

@public_router.get("/businesses/{business_id}/services")
async def get_public_services(business_id: str):
    services = await db.services.find({"business_id": business_id, "is_active": True}, {"_id": 0}).to_list(100)
    return [serialize_doc(s) for s in services]

@public_router.get("/services/{service_id}/staff")
async def get_public_staff(service_id: str):
    staff_list = await db.staff.find({"service_ids": service_id, "is_active": True}, {"_id": 0}).to_list(100)
    
    result = []
    for s in staff_list:
        user = await db.users.find_one({"id": s["user_id"]}, {"_id": 0, "email": 0, "password_hash": 0, "businesses": 0})
        if user:
            s["user"] = user
        result.append(serialize_doc(s))
    
    return result

@public_router.get("/staff/{staff_id}/availability")
async def get_staff_availability(staff_id: str, date: str):
    staff = await db.staff.find_one({"id": staff_id}, {"_id": 0})
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    # Get appointments for this staff on this date
    appointments = await db.appointments.find({
        "staff_id": staff_id,
        "date": {"$regex": f"^{date}"},
        "status": {"$nin": ["cancelled"]}
    }, {"_id": 0}).to_list(100)
    
    booked_times = [apt["date"].split("T")[1][:5] for apt in appointments if "T" in apt.get("date", "")]
    
    return {
        "staff_id": staff_id,
        "date": date,
        "schedule": staff.get("schedule", {}),
        "booked_times": booked_times
    }

@public_router.post("/book")
async def public_booking(booking: PublicBookingRequest):
    # Validate business, service, staff exist
    business = await db.businesses.find_one({"id": booking.business_id, "is_active": True}, {"_id": 0})
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    service = await db.services.find_one({"id": booking.service_id, "is_active": True}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    staff = await db.staff.find_one({"id": booking.staff_id, "is_active": True}, {"_id": 0})
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    # Find or create client
    client = await db.users.find_one({"email": booking.client_email}, {"_id": 0})
    if not client:
        client = User(
            email=booking.client_email,
            first_name=booking.client_name.split()[0],
            last_name=" ".join(booking.client_name.split()[1:]) if len(booking.client_name.split()) > 1 else "",
            phone=booking.client_phone,
            role="client"
        )
        client_dict = client.model_dump()
        client_dict["password_hash"] = get_password_hash(str(uuid.uuid4())[:8])
        client_dict["created_at"] = client_dict["created_at"].isoformat()
        await db.users.insert_one(client_dict)
        client = client_dict
    
    # Create appointment
    appointment = Appointment(
        business_id=booking.business_id,
        service_id=booking.service_id,
        staff_id=booking.staff_id,
        client_id=client["id"],
        date=booking.date,
        notes=booking.notes,
        price_final=service.get("price")
    )
    apt_dict = appointment.model_dump()
    apt_dict["date"] = apt_dict["date"].isoformat()
    apt_dict["created_at"] = apt_dict["created_at"].isoformat()
    
    await db.appointments.insert_one(apt_dict)
    
    # Notifications
    staff_user = await db.users.find_one({"id": staff["user_id"]}, {"_id": 0})
    
    await send_notification(
        client["id"],
        "appointment_created",
        "Nueva Cita Creada",
        f"Tu cita para {service['name']} ha sido creada"
    )
    
    await send_notification(
        staff["user_id"],
        "appointment_created",
        "Nueva Cita Asignada",
        f"Se te ha asignado una nueva cita"
    )
    
    # Send confirmation email
    await send_email_notification(
        booking.client_email,
        f"Confirmación de Cita - {business['name']}",
        f"""
        <h2>¡Tu cita ha sido confirmada!</h2>
        <p>Hola {booking.client_name},</p>
        <p>Detalles de tu cita:</p>
        <ul>
            <li><strong>Negocio:</strong> {business['name']}</li>
            <li><strong>Servicio:</strong> {service['name']}</li>
            <li><strong>Fecha:</strong> {booking.date.strftime('%d/%m/%Y %H:%M')}</li>
            <li><strong>Profesional:</strong> {staff_user['first_name']} {staff_user['last_name'] if staff_user else ''}</li>
        </ul>
        <p>Gracias por confiar en nosotros.</p>
        """
    )
    
    return {"message": "Booking created", "appointment_id": appointment.id}

# ============== NOTIFICATIONS ROUTES ==============
@notifications_router.get("/")
async def get_notifications(
    unread_only: bool = False,
    current_user: dict = Depends(get_current_user)
):
    query = {"user_id": current_user["id"]}
    if unread_only:
        query["read"] = False
    
    notifications = await db.notifications.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [serialize_doc(n) for n in notifications]

@notifications_router.put("/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.notifications.update_one(
        {"id": notification_id, "user_id": current_user["id"]},
        {"$set": {"read": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification marked as read"}

@notifications_router.put("/read-all")
async def mark_all_read(current_user: dict = Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": current_user["id"]},
        {"$set": {"read": True}}
    )
    return {"message": "All notifications marked as read"}

# ============== FINANCE ROUTES ==============
@finance_router.get("/income/{business_id}")
async def get_business_income(
    business_id: str,
    period: str = "month",
    status: Optional[str] = None,  # completed, pending_validation, pending_payment
    current_user: dict = Depends(require_roles(["super_admin", "admin", "business"]))
):
    # Data isolation check
    if current_user["role"] != "super_admin":
        if business_id not in current_user.get("businesses", []):
            business = await db.businesses.find_one({"id": business_id, "owner_id": current_user["id"]}, {"_id": 0})
            if not business:
                raise HTTPException(status_code=403, detail="Not authorized")
    
    now = datetime.now(timezone.utc)
    if period == "day":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        start_date = now - timedelta(days=now.weekday())
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "month":
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == "year":
        start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        start_date = now - timedelta(days=30)
    
    query = {
        "business_id": business_id,
        "created_at": {"$gte": start_date.isoformat()}
    }
    
    if status:
        query["status"] = status
    
    payments = await db.payments.find(query, {"_id": 0}).to_list(1000)
    
    # Calculate totals by status
    total_completed = sum(p.get("amount", 0) for p in payments if p.get("status") == "completed")
    total_pending_validation = sum(p.get("amount", 0) for p in payments if p.get("status") == "pending_validation")
    total_pending_payment = sum(p.get("amount", 0) for p in payments if p.get("status") == "pending_payment")
    
    # Group by payment method
    by_method = {}
    for p in payments:
        method = p.get("method", "unknown")
        if method not in by_method:
            by_method[method] = {"completed": 0, "pending_validation": 0, "pending_payment": 0}
        by_method[method][p.get("status", "completed")] += p.get("amount", 0)
    
    return {
        "business_id": business_id,
        "period": period,
        "start_date": start_date.isoformat(),
        "total_completed": total_completed,
        "total_pending_validation": total_pending_validation,
        "total_pending_payment": total_pending_payment,
        "total_all": total_completed + total_pending_validation + total_pending_payment,
        "by_method": by_method,
        "payment_count": len(payments),
        "payments": [serialize_doc(p) for p in payments]
    }

# Get payments pending validation
@finance_router.get("/pending-validation/{business_id}")
async def get_pending_validation_payments(
    business_id: str,
    current_user: dict = Depends(require_roles(["super_admin", "admin", "business"]))
):
    # Data isolation check
    if current_user["role"] != "super_admin":
        if business_id not in current_user.get("businesses", []):
            raise HTTPException(status_code=403, detail="Not authorized")
    
    payments = await db.payments.find({
        "business_id": business_id,
        "status": "pending_validation"
    }, {"_id": 0}).to_list(100)
    
    # Enrich with appointment and client info
    result = []
    for p in payments:
        payment_data = serialize_doc(p)
        if p.get("appointment_id"):
            apt = await db.appointments.find_one({"id": p["appointment_id"]}, {"_id": 0})
            if apt:
                client = await db.users.find_one({"id": apt.get("client_id")}, {"_id": 0, "password_hash": 0})
                service = await db.services.find_one({"id": apt.get("service_id")}, {"_id": 0})
                payment_data["appointment"] = serialize_doc(apt)
                if client:
                    payment_data["client"] = client
                if service:
                    payment_data["service"] = serialize_doc(service)
        result.append(payment_data)
    
    return result

@finance_router.post("/payment")
async def record_payment(
    payment_data: PaymentCreate,
    current_user: dict = Depends(require_roles(["super_admin", "admin", "business"]))
):
    payment = Payment(
        business_id=payment_data.business_id,
        appointment_id=payment_data.appointment_id,
        amount=payment_data.amount,
        method=payment_data.method,
        reference=payment_data.reference,
        notes=payment_data.notes
    )
    payment_dict = payment.model_dump()
    payment_dict["created_at"] = payment_dict["created_at"].isoformat()
    
    await db.payments.insert_one(payment_dict)
    return serialize_doc(payment_dict)

@finance_router.get("/platform")
async def get_platform_payments(
    period: str = "month",
    current_user: dict = Depends(require_roles(["super_admin"]))
):
    now = datetime.now(timezone.utc)
    if period == "month":
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == "year":
        start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        start_date = now - timedelta(days=30)
    
    payments = await db.platform_payments.find({
        "created_at": {"$gte": start_date.isoformat()}
    }, {"_id": 0}).to_list(1000)
    
    total = sum(p.get("amount", 0) for p in payments)
    
    return {
        "period": period,
        "start_date": start_date.isoformat(),
        "total_income": total,
        "payment_count": len(payments),
        "payments": [serialize_doc(p) for p in payments]
    }

@finance_router.post("/platform/payment")
async def record_platform_payment(
    business_id: str,
    amount: float,
    method: str,
    reference: Optional[str] = None,
    current_user: dict = Depends(require_roles(["super_admin"]))
):
    payment = PlatformPayment(
        business_id=business_id,
        amount=amount,
        method=method,
        reference=reference
    )
    payment_dict = payment.model_dump()
    payment_dict["created_at"] = payment_dict["created_at"].isoformat()
    
    await db.platform_payments.insert_one(payment_dict)
    return serialize_doc(payment_dict)

# ============== REPORTS ROUTES ==============
@reports_router.get("/appointments")
async def get_appointments_report(
    business_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: dict = Depends(require_roles(["super_admin", "admin", "business"]))
):
    query = {}
    
    if current_user["role"] == "super_admin":
        if business_id:
            query["business_id"] = business_id
    else:
        if business_id:
            query["business_id"] = business_id
        else:
            query["business_id"] = {"$in": current_user.get("businesses", [])}
    
    if date_from:
        query["date"] = {"$gte": date_from}
    if date_to:
        if "date" in query:
            query["date"]["$lte"] = date_to
        else:
            query["date"] = {"$lte": date_to}
    
    appointments = await db.appointments.find(query, {"_id": 0}).to_list(10000)
    
    stats = {
        "total": len(appointments),
        "by_status": {},
        "by_service": {},
        "by_staff": {}
    }
    
    for apt in appointments:
        status = apt.get("status", "unknown")
        stats["by_status"][status] = stats["by_status"].get(status, 0) + 1
        
        service_id = apt.get("service_id")
        stats["by_service"][service_id] = stats["by_service"].get(service_id, 0) + 1
        
        staff_id = apt.get("staff_id")
        stats["by_staff"][staff_id] = stats["by_staff"].get(staff_id, 0) + 1
    
    return stats

@reports_router.get("/income")
async def get_income_report(
    business_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: dict = Depends(require_roles(["super_admin", "admin", "business"]))
):
    query = {}
    
    if current_user["role"] == "super_admin":
        if business_id:
            query["business_id"] = business_id
    else:
        if business_id:
            query["business_id"] = business_id
        else:
            query["business_id"] = {"$in": current_user.get("businesses", [])}
    
    if date_from:
        query["created_at"] = {"$gte": date_from}
    if date_to:
        if "created_at" in query:
            query["created_at"]["$lte"] = date_to
        else:
            query["created_at"] = {"$lte": date_to}
    
    payments = await db.payments.find(query, {"_id": 0}).to_list(10000)
    
    total = sum(p.get("amount", 0) for p in payments)
    by_method = {}
    by_business = {}
    
    for p in payments:
        method = p.get("method", "unknown")
        by_method[method] = by_method.get(method, 0) + p.get("amount", 0)
        
        bid = p.get("business_id")
        by_business[bid] = by_business.get(bid, 0) + p.get("amount", 0)
    
    return {
        "total_income": total,
        "payment_count": len(payments),
        "by_method": by_method,
        "by_business": by_business
    }

@reports_router.get("/clients")
async def get_clients_report(
    business_id: Optional[str] = None,
    current_user: dict = Depends(require_roles(["super_admin", "admin", "business"]))
):
    apt_query = {}
    
    if current_user["role"] == "super_admin":
        if business_id:
            apt_query["business_id"] = business_id
    else:
        if business_id:
            apt_query["business_id"] = business_id
        else:
            apt_query["business_id"] = {"$in": current_user.get("businesses", [])}
    
    appointments = await db.appointments.find(apt_query, {"_id": 0}).to_list(10000)
    
    client_ids = list(set(apt.get("client_id") for apt in appointments if apt.get("client_id")))
    
    client_stats = {}
    for apt in appointments:
        client_id = apt.get("client_id")
        if client_id not in client_stats:
            client_stats[client_id] = {"total": 0, "attended": 0, "cancelled": 0, "no_show": 0}
        
        client_stats[client_id]["total"] += 1
        status = apt.get("status")
        if status == "attended":
            client_stats[client_id]["attended"] += 1
        elif status == "cancelled":
            client_stats[client_id]["cancelled"] += 1
        elif status == "no_show":
            client_stats[client_id]["no_show"] += 1
    
    return {
        "total_clients": len(client_ids),
        "client_stats": client_stats
    }

# ============== SETUP ROUTES ==============
@api_router.get("/")
async def root():
    return {"message": "TimeFlow API v1.0", "status": "running"}

@api_router.post("/setup/super-admin")
async def setup_super_admin():
    existing = await db.users.find_one({"role": "super_admin"}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Super admin already exists")
    
    user = User(
        email="admin@timeflow.com",
        first_name="Super",
        last_name="Admin",
        role="super_admin"
    )
    user_dict = user.model_dump()
    user_dict["password_hash"] = get_password_hash("admin123")
    user_dict["created_at"] = user_dict["created_at"].isoformat()
    
    await db.users.insert_one(user_dict)
    return {"message": "Super admin created", "email": "admin@timeflow.com", "password": "admin123"}

# Include all routers
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(businesses_router)
api_router.include_router(services_router)
api_router.include_router(staff_router)
api_router.include_router(appointments_router)
api_router.include_router(notifications_router)
api_router.include_router(finance_router)
api_router.include_router(reports_router)
api_router.include_router(public_router)

app.include_router(api_router)

# Add HTTPS redirect middleware first
app.add_middleware(HTTPSRedirectMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
