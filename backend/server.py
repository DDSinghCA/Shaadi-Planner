from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import bcrypt
import jwt
import secrets

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 120
REFRESH_TOKEN_EXPIRE_DAYS = 7

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ─── Password Helpers ───
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

# ─── JWT Helpers ───
def create_access_token(user_id: str, username: str, role: str) -> str:
    payload = {
        "sub": user_id, "username": username, "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        "type": "access"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        "type": "refresh"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

# ─── Auth Dependency ───
async def get_current_user(request: Request) -> dict:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth_header[7:]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["id"] = str(user["_id"])
        del user["_id"]
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_role(*roles):
    async def checker(request: Request):
        user = await get_current_user(request)
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return checker

# ─── Pydantic Models ───
class LoginRequest(BaseModel):
    username: str
    password: str

class ChangePasswordRequest(BaseModel):
    current_password: Optional[str] = None
    new_password: str

class CreateUserRequest(BaseModel):
    username: str
    password: str
    name: str
    role: str = "contributor"

class UpdateUserRequest(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None

class TaskCreate(BaseModel):
    title: str
    assigned_to: Optional[str] = None
    deadline: Optional[str] = None
    status: str = "pending"
    notes: Optional[str] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    assigned_to: Optional[str] = None
    deadline: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class GuestCreate(BaseModel):
    name: str
    side: str = "bride"
    group: str = "family"
    assigned_handler: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    room_required: Optional[bool] = None
    event_ids: Optional[List[str]] = None
    guest_count: Optional[int] = None
    room_type: Optional[str] = None

class GuestUpdate(BaseModel):
    name: Optional[str] = None
    side: Optional[str] = None
    group: Optional[str] = None
    assigned_handler: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    room_required: Optional[bool] = None
    event_ids: Optional[List[str]] = None
    guest_count: Optional[int] = None
    room_type: Optional[str] = None

class BudgetItemCreate(BaseModel):
    category: str
    description: Optional[str] = None
    planned_amount: float = 0
    actual_amount: float = 0
    event_id: Optional[str] = None

class BudgetItemUpdate(BaseModel):
    category: Optional[str] = None
    description: Optional[str] = None
    planned_amount: Optional[float] = None
    actual_amount: Optional[float] = None
    event_id: Optional[str] = None

class EventCreate(BaseModel):
    name: str
    date: str
    time: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    transport_notes: Optional[str] = None
    maps_link: Optional[str] = None

class EventUpdate(BaseModel):
    name: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    transport_notes: Optional[str] = None
    maps_link: Optional[str] = None

# ─── Helper: serialize doc ───
def serialize_doc(doc):
    if doc is None:
        return None
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    # Convert datetime objects to ISO strings
    for key, val in doc.items():
        if isinstance(val, datetime):
            doc[key] = val.isoformat()
    return doc

# ─── AUTH ROUTES ───
@api_router.post("/auth/login")
async def login(req: LoginRequest):
    username = req.username.strip().lower()
    # Brute force check
    attempt_key = f"login:{username}"
    attempt = await db.login_attempts.find_one({"identifier": attempt_key})
    if attempt and attempt.get("locked_until"):
        if datetime.now(timezone.utc) < attempt["locked_until"]:
            raise HTTPException(status_code=429, detail="Too many attempts. Try again in 15 minutes.")
        else:
            await db.login_attempts.delete_one({"identifier": attempt_key})

    user = await db.users.find_one({"username": username})
    if not user or not verify_password(req.password, user["password_hash"]):
        # Increment attempts
        if attempt:
            new_count = attempt.get("attempts", 0) + 1
            update = {"$set": {"attempts": new_count, "last_attempt": datetime.now(timezone.utc)}}
            if new_count >= 5:
                update["$set"]["locked_until"] = datetime.now(timezone.utc) + timedelta(minutes=15)
            await db.login_attempts.update_one({"identifier": attempt_key}, update)
        else:
            await db.login_attempts.insert_one({
                "identifier": attempt_key, "attempts": 1,
                "last_attempt": datetime.now(timezone.utc)
            })
        raise HTTPException(status_code=401, detail="Invalid username or password")

    # Clear attempts on success
    await db.login_attempts.delete_many({"identifier": attempt_key})

    user_id = str(user["_id"])
    access_token = create_access_token(user_id, user["username"], user["role"])
    refresh_token = create_refresh_token(user_id)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {
            "id": user_id,
            "username": user["username"],
            "name": user["name"],
            "role": user["role"],
            "force_password_change": user.get("force_password_change", False)
        }
    }

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {"user": user}

@api_router.post("/auth/change-password")
async def change_password(req: ChangePasswordRequest, user: dict = Depends(get_current_user)):
    db_user = await db.users.find_one({"_id": ObjectId(user["id"])})
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    # If not force change, verify current password
    if not db_user.get("force_password_change", False):
        if not req.current_password:
            raise HTTPException(status_code=400, detail="Current password required")
        if not verify_password(req.current_password, db_user["password_hash"]):
            raise HTTPException(status_code=400, detail="Current password is incorrect")

    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    await db.users.update_one(
        {"_id": ObjectId(user["id"])},
        {"$set": {"password_hash": hash_password(req.new_password), "force_password_change": False}}
    )
    return {"message": "Password changed successfully"}

@api_router.post("/auth/refresh")
async def refresh_token(request: Request):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No refresh token")
    token = auth_header[7:]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user_id = str(user["_id"])
        new_access = create_access_token(user_id, user["username"], user["role"])
        return {"access_token": new_access}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

# ─── USER MANAGEMENT (Admin only) ───
@api_router.post("/users")
async def create_user(req: CreateUserRequest, admin: dict = Depends(require_role("admin"))):
    username = req.username.strip().lower()
    if await db.users.find_one({"username": username}):
        raise HTTPException(status_code=400, detail="Username already exists")
    if req.role not in ["admin", "contributor", "viewer"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    user_doc = {
        "username": username,
        "password_hash": hash_password(req.password),
        "name": req.name,
        "role": req.role,
        "force_password_change": True,
        "created_by": admin["id"],
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.users.insert_one(user_doc)
    return {"id": str(result.inserted_id), "username": username, "name": req.name, "role": req.role}

@api_router.get("/users")
async def list_users(user: dict = Depends(require_role("admin"))):
    users = await db.users.find({}, {"password_hash": 0}).to_list(500)
    return [serialize_doc(u) for u in users]

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, req: UpdateUserRequest, admin: dict = Depends(require_role("admin"))):
    update_data = {}
    if req.name is not None:
        update_data["name"] = req.name
    if req.role is not None:
        if req.role not in ["admin", "contributor", "viewer"]:
            raise HTTPException(status_code=400, detail="Invalid role")
        update_data["role"] = req.role
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User updated"}

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(require_role("admin"))):
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    result = await db.users.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted"}

# ─── TASK ROUTES ───
@api_router.post("/tasks")
async def create_task(req: TaskCreate, user: dict = Depends(require_role("admin", "contributor"))):
    task_doc = {
        "title": req.title,
        "assigned_to": req.assigned_to,
        "deadline": req.deadline,
        "status": req.status,
        "notes": req.notes,
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    result = await db.tasks.insert_one(task_doc)
    task_doc["id"] = str(result.inserted_id)
    task_doc.pop("_id", None)
    for k, v in task_doc.items():
        if isinstance(v, datetime):
            task_doc[k] = v.isoformat()
    return task_doc

@api_router.get("/tasks")
async def get_tasks(user: dict = Depends(get_current_user)):
    query = {}
    if user["role"] != "admin":
        query = {"$or": [{"assigned_to": user["id"]}, {"created_by": user["id"]}]}
    tasks = await db.tasks.find(query).sort("deadline", 1).to_list(1000)
    return [serialize_doc(t) for t in tasks]

@api_router.get("/tasks/my")
async def get_my_tasks(user: dict = Depends(get_current_user)):
    tasks = await db.tasks.find({"assigned_to": user["id"]}).sort("deadline", 1).to_list(1000)
    return [serialize_doc(t) for t in tasks]

@api_router.get("/tasks/all")
async def get_all_tasks(user: dict = Depends(require_role("admin"))):
    tasks = await db.tasks.find({}).sort("deadline", 1).to_list(1000)
    return [serialize_doc(t) for t in tasks]

@api_router.put("/tasks/{task_id}")
async def update_task(task_id: str, req: TaskUpdate, user: dict = Depends(require_role("admin", "contributor"))):
    update_data = {k: v for k, v in req.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    update_data["updated_at"] = datetime.now(timezone.utc)
    result = await db.tasks.update_one({"_id": ObjectId(task_id)}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    updated = await db.tasks.find_one({"_id": ObjectId(task_id)})
    return serialize_doc(updated)

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user: dict = Depends(require_role("admin"))):
    result = await db.tasks.delete_one({"_id": ObjectId(task_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted"}

# ─── GUEST ROUTES ───
@api_router.post("/guests")
async def create_guest(req: GuestCreate, user: dict = Depends(require_role("admin", "contributor"))):
    doc = {
        **req.dict(),
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.guests.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    for k, v in doc.items():
        if isinstance(v, datetime):
            doc[k] = v.isoformat()
    return doc

@api_router.get("/guests")
async def get_guests(side: Optional[str] = None, group: Optional[str] = None, user: dict = Depends(require_role("admin", "contributor"))):
    query = {}
    if side:
        query["side"] = side
    if group:
        query["group"] = group
    guests = await db.guests.find(query).sort("name", 1).to_list(2000)
    return [serialize_doc(g) for g in guests]

@api_router.put("/guests/{guest_id}")
async def update_guest(guest_id: str, req: GuestUpdate, user: dict = Depends(require_role("admin", "contributor"))):
    update_data = {}
    req_dict = req.dict()
    for k, v in req_dict.items():
        if v is not None:
            update_data[k] = v
        elif k == "event_ids" and req.event_ids is not None:
            update_data[k] = v
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await db.guests.update_one({"_id": ObjectId(guest_id)}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Guest not found")
    updated = await db.guests.find_one({"_id": ObjectId(guest_id)})
    return serialize_doc(updated)

@api_router.delete("/guests/{guest_id}")
async def delete_guest(guest_id: str, user: dict = Depends(require_role("admin"))):
    result = await db.guests.delete_one({"_id": ObjectId(guest_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Guest not found")
    return {"message": "Guest deleted"}

# ─── BUDGET ROUTES ───
@api_router.post("/budget")
async def create_budget_item(req: BudgetItemCreate, user: dict = Depends(require_role("admin"))):
    doc = {
        **req.dict(),
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.budget_items.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    for k, v in doc.items():
        if isinstance(v, datetime):
            doc[k] = v.isoformat()
    return doc

@api_router.get("/budget")
async def get_budget(user: dict = Depends(get_current_user)):
    if user["role"] == "viewer":
        raise HTTPException(status_code=403, detail="No access to budget")
    if user["role"] == "admin":
        items = await db.budget_items.find({}).to_list(1000)
        serialized = [serialize_doc(i) for i in items]
        total_planned = sum(i.get("planned_amount", 0) for i in serialized)
        total_actual = sum(i.get("actual_amount", 0) for i in serialized)
        return {"items": serialized, "total_planned": total_planned, "total_actual": total_actual}
    else:
        # Contributor: summary only
        pipeline = [
            {"$group": {
                "_id": "$category",
                "planned": {"$sum": "$planned_amount"},
                "actual": {"$sum": "$actual_amount"}
            }}
        ]
        categories = await db.budget_items.aggregate(pipeline).to_list(100)
        total_planned = sum(c["planned"] for c in categories)
        total_actual = sum(c["actual"] for c in categories)
        return {
            "items": [],
            "categories": [{"category": c["_id"], "planned": c["planned"], "actual": c["actual"]} for c in categories],
            "total_planned": total_planned,
            "total_actual": total_actual,
            "summary_only": True
        }

@api_router.put("/budget/{item_id}")
async def update_budget_item(item_id: str, req: BudgetItemUpdate, user: dict = Depends(require_role("admin"))):
    update_data = {k: v for k, v in req.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await db.budget_items.update_one({"_id": ObjectId(item_id)}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Budget item not found")
    updated = await db.budget_items.find_one({"_id": ObjectId(item_id)})
    return serialize_doc(updated)

@api_router.delete("/budget/{item_id}")
async def delete_budget_item(item_id: str, user: dict = Depends(require_role("admin"))):
    result = await db.budget_items.delete_one({"_id": ObjectId(item_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Budget item not found")
    return {"message": "Budget item deleted"}

# ─── EVENT/ITINERARY ROUTES ───
@api_router.post("/events")
async def create_event(req: EventCreate, user: dict = Depends(require_role("admin"))):
    doc = {
        **req.dict(),
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.events.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    for k, v in doc.items():
        if isinstance(v, datetime):
            doc[k] = v.isoformat()
    return doc

@api_router.get("/events")
async def get_events(user: dict = Depends(get_current_user)):
    events = await db.events.find({}).sort("date", 1).to_list(500)
    return [serialize_doc(e) for e in events]

@api_router.put("/events/{event_id}")
async def update_event(event_id: str, req: EventUpdate, user: dict = Depends(require_role("admin"))):
    update_data = {k: v for k, v in req.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await db.events.update_one({"_id": ObjectId(event_id)}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    updated = await db.events.find_one({"_id": ObjectId(event_id)})
    return serialize_doc(updated)

@api_router.delete("/events/{event_id}")
async def delete_event(event_id: str, user: dict = Depends(require_role("admin"))):
    result = await db.events.delete_one({"_id": ObjectId(event_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Event deleted"}

# ─── DASHBOARD ───
@api_router.get("/dashboard")
async def get_dashboard(user: dict = Depends(get_current_user)):
    # My pending tasks
    my_tasks = await db.tasks.find({"assigned_to": user["id"], "status": "pending"}).sort("deadline", 1).to_list(20)

    # Upcoming events (next 7 days or all future)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    events = await db.events.find({"date": {"$gte": today}}).sort("date", 1).to_list(10)

    # Budget summary
    budget_summary = {"total_planned": 0, "total_actual": 0}
    if user["role"] in ["admin", "contributor"]:
        pipeline = [{"$group": {"_id": None, "planned": {"$sum": "$planned_amount"}, "actual": {"$sum": "$actual_amount"}}}]
        result = await db.budget_items.aggregate(pipeline).to_list(1)
        if result:
            budget_summary = {"total_planned": result[0]["planned"], "total_actual": result[0]["actual"]}

    # Guest count - both entries and total headcount
    guest_entries = await db.guests.count_documents({})
    headcount_pipeline = [
        {"$group": {"_id": None, "total": {"$sum": {"$ifNull": ["$guest_count", 1]}}}}
    ]
    headcount_result = await db.guests.aggregate(headcount_pipeline).to_list(1)
    guest_headcount = headcount_result[0]["total"] if headcount_result else 0

    return {
        "my_tasks": [serialize_doc(t) for t in my_tasks],
        "upcoming_events": [serialize_doc(e) for e in events],
        "budget_summary": budget_summary,
        "guest_count": guest_entries,
        "guest_headcount": guest_headcount
    }

# ─── HEALTH ───
@api_router.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Startup: Seed admin + indexes ───
@app.on_event("startup")
async def startup():
    # Create indexes
    await db.users.create_index("username", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.tasks.create_index("assigned_to")
    await db.tasks.create_index("deadline")
    await db.guests.create_index("side")
    await db.guests.create_index("group")
    await db.events.create_index("date")

    # Seed admin
    admin_username = os.environ.get("ADMIN_USERNAME", "superadmin").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "Temp@123")
    existing = await db.users.find_one({"username": admin_username})
    if existing is None:
        await db.users.insert_one({
            "username": admin_username,
            "password_hash": hash_password(admin_password),
            "name": "Super Admin",
            "role": "admin",
            "force_password_change": True,
            "created_at": datetime.now(timezone.utc)
        })
        logger.info(f"Admin user '{admin_username}' seeded successfully")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"username": admin_username},
            {"$set": {"password_hash": hash_password(admin_password)}}
        )
        logger.info(f"Admin password updated for '{admin_username}'")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
