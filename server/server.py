"""
FastAPI Backend Server for Antigravity Intelligent Study Assistant
==================================================================
Provides REST APIs for:
1. User Authentication (JWT + Bcrypt + MongoDB)
2. Four Sections Status (General Awareness as primarily active focus)
3. Topic & PYQ Semantic Search using ChromaDB Embeddings & MongoDB
4. Lucent GK Page-by-Page Content & Dynamic Question Generation
5. User Analytics and Performance Tracking in MongoDB

Author: Antigravity Study Assistant
"""

from __future__ import annotations

import datetime
import json
import os
import re
import sys
import types
from pathlib import Path
from typing import Any, Dict, List, Optional

# Bootstrap chromadb thin client safeguard if needed
if "chromadb.is_thin_client" not in sys.modules:
    _m = types.ModuleType("chromadb.is_thin_client")
    _m.is_thin_client = False
    sys.modules["chromadb.is_thin_client"] = _m

import bcrypt
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Header, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
import jwt
from pydantic import BaseModel, Field
import pymongo

# Load environment from project root or current dir
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent if (BASE_DIR.parent / ".env").exists() else BASE_DIR

load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(BASE_DIR / ".env")

# Configuration & Constants
# =====================================================================

DEFAULT_GA_TOPICS = [
    "History (Ancient, Medieval, Modern India)",
    "Geography (India and World)",
    "Polity and Constitution of India",
    "Economics and Banking Awareness",
    "Science (Physics, Chemistry, Biology)",
    "Current Affairs (National and International)",
    "Awards and Honors",
    "Sports and Games",
    "Books and Authors",
    "Important Days and Events",
    "Environment and Ecology",
    "Inventions and Discoveries",
    "Cultural Heritage of India",
    "Abbreviations and Terminology"
]

def load_ga_topics_from_file(topic_file: str | Path = "topic.txt") -> List[str]:
    """Parses topic.txt and extracts General Awareness topics without heavy extractor imports."""
    t_path = Path(topic_file)
    if not t_path.exists():
        return DEFAULT_GA_TOPICS
    try:
        with open(t_path, "r", encoding="utf-8") as f:
            lines = [l.strip() for l in f if l.strip()]
        ga_topics: List[str] = []
        in_ga = False
        major_subjects = {"english", "general intelligence", "quantitative aptitude"}
        for line in lines:
            lower = line.lower()
            if "general awareness" in lower:
                in_ga = True
                continue
            if in_ga:
                if lower in major_subjects:
                    break
                ga_topics.append(line)
        return ga_topics if ga_topics else DEFAULT_GA_TOPICS
    except Exception as e:
        print(f"[!] Warning reading {topic_file}: {e}")
        return DEFAULT_GA_TOPICS

# Import MongoDB connection manager
from connection import MongoDBManager

# =====================================================================
# Configuration & Constants
# =====================================================================

JWT_SECRET = os.getenv("JWT_SECRET", "antigravity_chsl_jwt_super_secret_key_2026_x99")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_DAYS = 7  # Stays logged in for 7 days (> 5 days requirement)

app = FastAPI(
    title="Antigravity Intelligent Study Assistant API",
    description="Backend API powering SSC CHSL Study Assistant with ChromaDB and MongoDB Atlas.",
    version="2.0.0"
)

# Enable CORS for frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database singletons
mongo_mgr = MongoDBManager()


# File path resolution helper supporting local server root, client/dist/assets/, and workspace root
def find_dataset_file(filename_or_subpath: str) -> Path:
    candidates = [
        BASE_DIR / filename_or_subpath,
        PROJECT_ROOT / "server" / filename_or_subpath,
        PROJECT_ROOT / "client" / "dist" / "assets" / filename_or_subpath,
        PROJECT_ROOT / filename_or_subpath,
        Path("client/dist/assets") / filename_or_subpath,
        Path(filename_or_subpath),
        Path("client/public/assets") / filename_or_subpath,
    ]
    for p in candidates:
        if p.exists():
            return p
    return BASE_DIR / filename_or_subpath

# Cache Lucent GK JSON pages in memory for fast lookup
LUCENT_PAGES_CACHE: Dict[int, Dict[str, Any]] = {}

def load_lucent_cache():
    global LUCENT_PAGES_CACHE
    json_path = find_dataset_file("ocr_gk_extraction/lucent_gk_extracted.json")
    if json_path.exists():
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                for page in data.get("pages", []):
                    pno = page.get("page_number")
                    if pno is not None:
                        LUCENT_PAGES_CACHE[int(pno)] = page
            print(f"[+] Cached {len(LUCENT_PAGES_CACHE)} Lucent GK pages in memory from {json_path}.")
        except Exception as e:
            print(f"[!] Error caching Lucent GK pages: {e}")
    else:
        print(f"[!] Lucent GK file not found at {json_path}")

load_lucent_cache()


# Cache clean General Awareness PYQs directly from JSON for instant topic-wise delivery
PYQ_TOPIC_CACHE: Dict[str, List[Dict[str, Any]]] = {}

# Precomputed quick lookup index by topic and keyword for sub-millisecond retrieval
PYQ_KEYWORD_INDEX: Dict[str, List[Dict[str, Any]]] = {}

ENGLISH_LEAK_PATTERNS = [
    'select the', 'in the sentence', 'given below are', 'identify the segment',
    'fill in the blank', 'select the option', 'select the most', 'choose the',
    'one of the following words', 'antonym of', 'synonym of', 'passive form',
    'active form', 'indirect speech', 'direct speech', 'grammatical error',
    'jumbled sentences', 'most appropriate option', 'substitute the underlined',
    'underlined segment', 'spelt word', 'meaning of the given idiom'
]

def clean_pyq_option_text(raw_opt: str) -> str:
    """Strips metadata lines (Question ID, Status, Chosen Option) and leading option prefixes."""
    lines = str(raw_opt).split("\n")
    valid_lines = []
    for l in lines:
        if any(bad in l for bad in ["Question ID :", "Status :", "Chosen Option :", "Comprehension:", "SubQuestion No :"]):
            break
        valid_lines.append(l)
    t = " ".join(" ".join(valid_lines).split()).strip()
    # Strip prefixes like '1. ', '2. ', '(a) ', 'A. ', '1) '
    t = re.sub(r'^(?:\(?\s*[1-4a-dA-D]\s*[\.\)]|\b[1-4a-dA-D]\.\s*)\s*', '', t).strip()
    return t

def parse_pyq_correct_answer(raw_ans: str, clean_opts: List[str]) -> str:
    """Resolves correct answer into the matching clean option string."""
    if not raw_ans:
        return clean_opts[0] if clean_opts else ""
    first_part = str(raw_ans).split("\n")[0].strip()
    m = re.match(r'^(?:\(?\s*([1-4a-dA-D])\s*[\.\)]|\b([1-4a-dA-D])\.\s*)\s*(.*)', first_part)
    if m:
        num_or_let = m.group(1) or m.group(2)
        idx = (int(num_or_let) - 1) if num_or_let.isdigit() else (ord(num_or_let.lower()) - ord('a'))
        if 0 <= idx < len(clean_opts):
            return clean_opts[idx]
    cleaned = clean_pyq_option_text(raw_ans)
    for opt in clean_opts:
        if cleaned.lower() == opt.lower() or opt.lower() in cleaned.lower():
            return opt
    return clean_opts[0] if clean_opts else cleaned

MONTH_MAP = {
    'jan': '01', 'january': '01',
    'feb': '02', 'february': '02',
    'mar': '03', 'march': '03',
    'apr': '04', 'april': '04',
    'may': '05',
    'jun': '06', 'june': '06',
    'jul': '07', 'july': '07',
    'aug': '08', 'august': '08',
    'sep': '09', 'sept': '09', 'september': '09',
    'oct': '10', 'october': '10',
    'nov': '11', 'november': '11',
    'dec': '12', 'december': '12'
}

def extract_formatted_exam_date(filename: str) -> str:
    """Extracts strictly formatted date string (e.g. '07-09-2024') from paper PDF filename."""
    clean = re.sub(r'(\d+)(?:st|nd|rd|th)', r'\1', filename, flags=re.IGNORECASE)
    # Pattern 1: e.g. 11-August-2023 or 9-march-2023
    m1 = re.search(r'(\d{1,2})[-_\s]+([a-zA-Z]+)[-_\s]+(\d{4})', clean)
    if m1:
        d = int(m1.group(1))
        mon_str = m1.group(2).lower()
        yr = m1.group(3)
        if mon_str in MONTH_MAP:
            return f"{d:02d}-{MONTH_MAP[mon_str]}-{yr}"
    # Pattern 2: e.g. 01-07-2024 or 12-10-2020
    m2 = re.search(r'(\d{1,2})[-_](\d{1,2})[-_](\d{4})', clean)
    if m2:
        d = int(m2.group(1))
        m = int(m2.group(2))
        yr = m2.group(3)
        return f"{d:02d}-{m:02d}-{yr}"
    # Pattern 3: e.g. 2024-01-07 or 2019-02-07
    m3 = re.search(r'(\d{4})[-_](\d{1,2})[-_](\d{1,2})', clean)
    if m3:
        yr = m3.group(1)
        m = int(m3.group(2))
        d = int(m3.group(3))
        return f"{d:02d}-{m:02d}-{yr}"
    # Pattern 4: month + day without year (2023 batch) -> e.g. 11-August-shift-4
    m4 = re.search(r'(\d{1,2})[-_\s]+([a-zA-Z]+)', clean)
    if m4:
        d = int(m4.group(1))
        mon_str = m4.group(2).lower()
        if mon_str in MONTH_MAP:
            return f"{d:02d}-{MONTH_MAP[mon_str]}-2023"
    return "01-08-2023"

def is_english_question(text: str) -> bool:
    """Returns True if the question is written in English."""
    if not text:
        return False
    ascii_letters = sum(1 for c in text if 'a' <= c.lower() <= 'z')
    devanagari = sum(1 for c in text if '\u0900' <= c <= '\u097f')
    return ascii_letters > devanagari and ascii_letters > len(text) * 0.35

def normalize_question_text(text: str) -> str:
    """Normalizes question string to detect duplicates and count occurrences."""
    return re.sub(r'\s+', ' ', re.sub(r'[^\w\s]', '', text.lower())).strip()

def load_pyq_topic_cache():
    global PYQ_TOPIC_CACHE
    json_path = find_dataset_file("extracted_json/all_extracted_questions.json")
    if not json_path.exists():
        print(f"[!] PYQ file not found: {json_path}")
        return

    try:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        raw_clean_items = []
        text_counts = {}

        for p in data.get("papers", []):
            pdf = p.get("source_pdf", "")
            title = p.get("exam_title", "SSC CHSL")
            exam_date = extract_formatted_exam_date(pdf)

            for q in p.get("questions", []):
                if q.get("subject") != "General Awareness":
                    continue
                q_text = str(q.get("question", "")).strip()

                # Filter out raw OCR placeholders and English section misclassifications
                if len(q_text) < 15 or q_text.lower().startswith("question "):
                    continue
                if any(pfx in q_text.lower() for pfx in ENGLISH_LEAK_PATTERNS):
                    continue

                opts = q.get("options", [])
                if len(opts) != 4:
                    continue

                clean_opts = [clean_pyq_option_text(o) for o in opts]
                if any(not o or o.lower().startswith("option ") or o.isdigit() or len(o) < 2 for o in clean_opts):
                    continue

                raw_ans = q.get("correct_answer", "")
                resolved_ans = parse_pyq_correct_answer(raw_ans, clean_opts)
                topic = q.get("topic", "General Awareness")

                norm_key = normalize_question_text(q_text)
                text_counts[norm_key] = text_counts.get(norm_key, 0) + 1

                raw_clean_items.append({
                    "q_text": q_text,
                    "clean_opts": clean_opts,
                    "resolved_ans": resolved_ans,
                    "topic": topic,
                    "subtopic": q.get("subtopic", ""),
                    "exam_date": exam_date,
                    "title": title,
                    "is_english": is_english_question(q_text),
                    "norm_key": norm_key,
                    "question_number": q.get("question_number", 1)
                })

        # Group and index items by topic
        topic_map: Dict[str, List[Dict[str, Any]]] = {}
        for item in raw_clean_items:
            topic = item["topic"]
            if topic not in topic_map:
                topic_map[topic] = []

            occurrences = text_counts.get(item["norm_key"], 1)
            qid = f"pyq_{len(topic_map[topic]) + 1}_{item['question_number']}"
            topic_map[topic].append({
                "id": qid,
                "question": item["q_text"],
                "options": item["clean_opts"],
                "correct_answer": item["resolved_ans"],
                "subject": "General Awareness",
                "topic": topic,
                "subtopic": item["subtopic"],
                "exam_date": item["exam_date"],
                "exam_title": item["title"],
                "is_english": item["is_english"],
                "repetition_count": occurrences,
                "source": "Verified SSC CHSL PYQ Dataset",
                "similarity_score": 1.0
            })

        # Sort each topic so English questions come FIRST, and repeated questions appear prioritized
        for topic in topic_map:
            topic_map[topic].sort(
                key=lambda x: (
                    0 if x["is_english"] else 1,       # Priority 1: English questions first
                    -x["repetition_count"]              # Priority 2: Repeated questions with higher count first
                )
            )

        PYQ_TOPIC_CACHE = topic_map
        total_indexed = sum(len(v) for v in PYQ_TOPIC_CACHE.values())
        print(f"[+] Loaded {total_indexed} clean, authentic General Awareness PYQs across {len(PYQ_TOPIC_CACHE)} topics (English prioritized & repetition count indexed).")
    except Exception as e:
        print(f"[!] Error loading PYQ cache: {e}")

load_pyq_topic_cache()

# Cache clean English PYQs directly from JSON for instant topic-wise delivery & daily test
ENGLISH_TOPIC_CACHE: Dict[str, List[Dict[str, Any]]] = {}

def load_english_topic_cache():
    global ENGLISH_TOPIC_CACHE
    json_path = find_dataset_file("extracted_json/all_extracted_questions.json")
    if not json_path.exists():
        print(f"[!] English PYQ file not found: {json_path}")
        return

    try:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        topic_map: Dict[str, List[Dict[str, Any]]] = {}
        for p in data.get("papers", []):
            pdf = p.get("source_pdf", "")
            title = p.get("exam_title", "SSC CHSL")
            exam_date = extract_formatted_exam_date(pdf)

            for q in p.get("questions", []):
                if q.get("subject") != "English":
                    continue
                q_text = str(q.get("question", "")).strip()
                if len(q_text) < 10 or q_text.lower().startswith("question "):
                    continue

                opts = q.get("options", [])
                if len(opts) != 4:
                    continue

                clean_opts = [clean_pyq_option_text(o) for o in opts]
                if any(not o for o in clean_opts):
                    continue

                resolved_ans = parse_pyq_correct_answer(q.get("correct_answer", ""), clean_opts)
                if not resolved_ans:
                    continue

                topic = (q.get("topic") or "General English").strip()
                if topic not in topic_map:
                    topic_map[topic] = []

                qid = f"eng_{len(topic_map[topic]) + 1}_{q.get('question_number', 1)}"
                topic_map[topic].append({
                    "id": qid,
                    "question": q_text,
                    "options": clean_opts,
                    "correct_answer": resolved_ans,
                    "subject": "English",
                    "topic": topic,
                    "subtopic": q.get("subtopic") or topic,
                    "exam_date": exam_date,
                    "exam_title": title,
                    "source": "Verified SSC CHSL PYQ Dataset",
                    "explanation": f"From verified SSC CHSL English examination held on {exam_date}. Official key: {resolved_ans}"
                })

        ENGLISH_TOPIC_CACHE = topic_map
        total_eng = sum(len(v) for v in ENGLISH_TOPIC_CACHE.values())
        print(f"[+] Loaded {total_eng} clean, authentic English PYQs across {len(ENGLISH_TOPIC_CACHE)} topics.")
    except Exception as e:
        print(f"[!] Error loading English cache: {e}")

load_english_topic_cache()


# =====================================================================
# Pydantic Request & Response Models
# =====================================================================

class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="User's unique login username")
    password: str = Field(..., min_length=4, description="Account password")
    confirm_password: str = Field(..., min_length=4, description="Confirmation password to prevent typos")

class LoginRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="Registered username")
    password: str = Field(..., min_length=4, description="Account password")

class AuthResponse(BaseModel):
    token: str
    user_id: str
    username: str
    client_ip: str
    expires_in_days: int = 7
    full_name: Optional[str] = None
    email: Optional[str] = None
    target_exam: Optional[str] = "SSC CHSL 2024 Tier I"

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    target_exam: Optional[str] = None
    daily_goal_questions: Optional[int] = None

class AttemptLogRequest(BaseModel):
    question_id: str
    question_type: str = "pyq" # "pyq" or "lucent_generated"
    subject: str = "General Awareness"
    topic: str
    user_selected_option: str
    correct_option: str
    is_correct: bool
    time_spent_seconds: float = 0.0
    question_text: Optional[str] = None
    options: Optional[List[str]] = None
    exam_date: Optional[str] = None
    repetition_count: Optional[int] = 1

class LucentGenerateRequest(BaseModel):
    page_number: int = Field(..., ge=1, le=672)
    count: int = Field(default=3, ge=1, le=10)

class DailyTestSubmitRequest(BaseModel):
    daily_test_id: str
    answers: Dict[str, str] = Field(default_factory=dict, description="Map of question id -> chosen option string")
    duration_seconds: int = 0

class DialogueAcknowledgeRequest(BaseModel):
    activity_date: str



# =====================================================================
# IP Address & JWT Auth Utilities
# =====================================================================

def normalize_ip(ip: str) -> str:
    """Normalize IP string, standardizing IPv6 loopback and mapped addresses."""
    if not ip:
        return "127.0.0.1"
    ip = ip.strip()
    if ip.startswith("::ffff:"):
        ip = ip[7:]
    if ip in ("::1", "localhost", "testclient"):
        return "127.0.0.1"
    return ip

def get_client_ip(request: Request) -> str:
    """Extract and normalize client IP from proxy headers or connection host."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        raw_ip = forwarded.split(",")[0].strip()
    elif request.client and request.client.host:
        raw_ip = request.client.host
    else:
        raw_ip = "127.0.0.1"
    return normalize_ip(raw_ip)

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def create_jwt_token(payload_data: dict, client_ip: str) -> str:
    now = datetime.datetime.now(datetime.timezone.utc)
    expire = now + datetime.timedelta(days=JWT_EXPIRATION_DAYS)
    payload = {
        **payload_data,
        "ip": normalize_ip(client_ip),
        "iat": now,
        "exp": expire
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def get_current_user(request: Request, authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """Dependency to verify JWT token and retrieve active user from MongoDB."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header. Format: Bearer <token>"
        )

    token = authorization.split(" ")[1].strip()
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token payload invalid.")

        # Optional strict IP check: only active if STRICT_IP_CHECK is explicitly enabled in env
        strict_ip = os.getenv("STRICT_IP_CHECK", "false").lower() in ("true", "1", "yes")
        if strict_ip:
            token_ip = payload.get("ip")
            current_ip = get_client_ip(request)
            if token_ip:
                norm_token_ip = normalize_ip(token_ip)
                if norm_token_ip != current_ip:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail=f"Security Alert: IP address mismatch. Session is bound to IP {norm_token_ip}, but incoming request originated from {current_ip}."
                    )

        client = mongo_mgr.get_client()
        user = client["user_management"]["user_profiles"].find_one({"user_id": user_id})
        if not user:
            # Fallback check in chsl_gnr
            user = client["chsl_gnr"]["user_profiles"].find_one({"user_id": user_id})

        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account not found.")

        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired. Please log in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session token.")


# =====================================================================
# 1. Authentication Endpoints (Simple 2-input Login & 1-extra Confirm Register)
# =====================================================================

@app.post("/api/auth/register", response_model=AuthResponse)
def register(req: RegisterRequest, request: Request):
    if req.password != req.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match. Please ensure Password and Confirm Password are identical."
        )

    clean_username = req.username.strip()
    client = mongo_mgr.get_client()
    user_coll = client["user_management"]["user_profiles"]

    # Check for existing user (case-insensitive)
    existing_user = user_coll.find_one({"username": {"$regex": f"^{re.escape(clean_username)}$", "$options": "i"}})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with that username already exists. Please choose a different username."
        )

    client_ip = get_client_ip(request)
    now = datetime.datetime.now(datetime.timezone.utc)
    user_id = f"usr_{clean_username.lower()}_{int(now.timestamp())}"

    user_doc = {
        "_id": user_id,
        "user_id": user_id,
        "username": clean_username,
        "email": f"{clean_username.lower()}@antigravity.local",
        "password_hash": hash_password(req.password),
        "full_name": clean_username,
        "target_exam": "SSC CHSL 2024 Tier I",
        "registered_ip": client_ip,
        "last_ip": client_ip,
        "created_at": now,
        "last_login": now,
        "status": "active",
        "settings": {
            "daily_goal_questions": 30,
            "preferred_mode": "General Awareness Focus"
        }
    }

    # Save to MongoDB
    user_coll.insert_one(user_doc)

    # Initialize analytics record
    client["user_management"]["user_analytics"].update_one(
        {"user_id": user_id},
        {"$set": {
            "user_id": user_id,
            "total_questions_attempted": 0,
            "total_correct": 0,
            "overall_accuracy_pct": 0.0,
            "subject_breakdown": {
                "General Awareness": {"attempted": 0, "correct": 0, "accuracy_pct": 0.0},
                "English": {"attempted": 0, "correct": 0, "accuracy_pct": 0.0},
                "General Intelligence": {"attempted": 0, "correct": 0, "accuracy_pct": 0.0},
                "Quantitative Aptitude": {"attempted": 0, "correct": 0, "accuracy_pct": 0.0}
            },
            "recent_activity": [],
            "last_updated": now
        }},
        upsert=True
    )

    token = create_jwt_token({
        "user_id": user_id,
        "username": user_doc["username"]
    }, client_ip=client_ip)

    return AuthResponse(
        token=token,
        user_id=user_id,
        username=user_doc["username"],
        client_ip=client_ip,
        expires_in_days=JWT_EXPIRATION_DAYS,
        full_name=user_doc["full_name"],
        email=user_doc["email"],
        target_exam=user_doc["target_exam"]
    )


@app.post("/api/auth/login", response_model=AuthResponse)
def login(req: LoginRequest, request: Request):
    clean_username = req.username.strip()
    client = mongo_mgr.get_client()
    user_coll = client["user_management"]["user_profiles"]

    user = user_coll.find_one({"username": {"$regex": f"^{re.escape(clean_username)}$", "$options": "i"}})
    if not user or not verify_password(req.password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password."
        )

    client_ip = get_client_ip(request)
    now = datetime.datetime.now(datetime.timezone.utc)

    # Update last login and IP
    user_coll.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": now, "last_ip": client_ip}}
    )

    token = create_jwt_token({
        "user_id": user["user_id"],
        "username": user["username"]
    }, client_ip=client_ip)

    return AuthResponse(
        token=token,
        user_id=user["user_id"],
        username=user["username"],
        client_ip=client_ip,
        expires_in_days=JWT_EXPIRATION_DAYS,
        full_name=user.get("full_name", user["username"]),
        email=user.get("email", ""),
        target_exam=user.get("target_exam", "SSC CHSL 2024 Tier I")
    )


@app.get("/api/auth/me")
def get_profile(request: Request, current_user: Dict[str, Any] = Depends(get_current_user)):
    client = mongo_mgr.get_client()
    analytics = client["user_management"]["user_analytics"].find_one({"user_id": current_user["user_id"]})
    client_ip = get_client_ip(request)

    return {
        "user_id": current_user["user_id"],
        "username": current_user["username"],
        "email": current_user.get("email", ""),
        "full_name": current_user.get("full_name", current_user["username"]),
        "target_exam": current_user.get("target_exam", "SSC CHSL 2024 Tier I"),
        "client_ip": client_ip,
        "session_expires_days": JWT_EXPIRATION_DAYS,
        "created_at": current_user.get("created_at"),
        "settings": current_user.get("settings", {}),
        "analytics": {
            "total_questions_attempted": analytics.get("total_questions_attempted", 0) if analytics else 0,
            "total_correct": analytics.get("total_correct", 0) if analytics else 0,
            "overall_accuracy_pct": analytics.get("overall_accuracy_pct", 0.0) if analytics else 0.0,
            "subject_breakdown": analytics.get("subject_breakdown", {}) if analytics else {},
            "recent_activity": analytics.get("recent_activity", [])[-10:] if analytics else []
        }
    }


# =====================================================================
# 2. Four Sections Endpoint (Active Focus Indicator)
# =====================================================================

@app.get("/api/sections")
def get_sections():
    """
    Returns the four syllabus sections.
    Explicitly flags General Awareness as the PRIMARY ACTIVE FOCUS.
    """
    ga_topics = load_ga_topics_from_file(find_dataset_file("topic.txt"))

    return {
        "active_focus_section": "General Awareness",
        "description": "General Awareness is the primarily active focus right now, with study material exclusively sourced from the Lucent GK book (672 pages) and verified SSC CHSL previous year questions (12,968 questions).",
        "sections": [
            {
                "id": "general_awareness",
                "name": "General Awareness",
                "status": "Active Focus",
                "is_active": True,
                "weightage": "25 Questions (50 Marks)",
                "sources": [
                    "Lucent General Knowledge (Complete 2026 English Edition)",
                    "12,968 Verified SSC CHSL Previous Year Questions"
                ],
                "topics_count": len(ga_topics),
                "topics": ga_topics
            },
            {
                "id": "english",
                "name": "English Language",
                "status": "Active Focus",
                "is_active": True,
                "weightage": "25 Questions (50 Marks)",
                "sources": ["3,198 Verified SSC CHSL English PYQs"],
                "topics_count": len(ENGLISH_TOPIC_CACHE),
                "topics": list(ENGLISH_TOPIC_CACHE.keys()),
                "notice": "Active module with verified authentic questions and official answer keys."
            },
            {
                "id": "general_intelligence",
                "name": "General Intelligence",
                "status": "Coming Soon",
                "is_active": False,
                "weightage": "25 Questions (50 Marks)",
                "sources": ["SSC CHSL Tier I PYQs"],
                "topics_count": 18,
                "notice": "Curriculum listed; currently in preparation while General Awareness is prioritized."
            },
            {
                "id": "quantitative_aptitude",
                "name": "Quantitative Aptitude",
                "status": "Coming Soon",
                "is_active": False,
                "weightage": "25 Questions (50 Marks)",
                "sources": ["SSC CHSL Tier I PYQs"],
                "topics_count": 20,
                "notice": "Curriculum listed; currently in preparation while General Awareness is prioritized."
            }
        ]
    }


# =====================================================================
# 3. Topic & Semantic PYQ Retrieval (Direct JSON + ChromaDB + MongoDB)
# =====================================================================

@app.get("/api/pyqs/search")
def search_pyqs(
    query: Optional[str] = Query(None, description="Topic, keyword, or concept to search for"),
    topic_filter: Optional[str] = Query(None, description="Optional GA topic filter"),
    shift_filter: Optional[str] = Query(None, description="Optional shift filter"),
    n_results: int = Query(500, ge=1, le=2000)
):
    """
    Retrieves authentic, clean General Awareness PYQs directly from memory with zero latency.
    - If topic_filter is provided (or user clicked a topic chip), instantly serves questions from in-memory cache.
    - Fast keyword matching within the cached clean questions (instant response).
    """
    clean_query = str(query).strip() if (query is not None and not hasattr(query, "default")) else ""
    t_filter = str(topic_filter).strip() if (topic_filter is not None and not hasattr(topic_filter, "default")) else None
    s_filter = str(shift_filter).strip() if (shift_filter is not None and not hasattr(shift_filter, "default")) else None
    limit = int(n_results) if (n_results is not None and not hasattr(n_results, "default")) else 500

    results_list: List[Dict[str, Any]] = []
    seen_ids = set()

    # 1. Direct Topic Fetch from Clean In-Memory JSON Cache
    if t_filter and t_filter in PYQ_TOPIC_CACHE:
        topic_pool = PYQ_TOPIC_CACHE[t_filter]
        
        # If user searched a keyword within this topic, filter by query
        if clean_query and clean_query.lower() not in (t_filter.lower(), "general awareness"):
            kw = clean_query.lower()
            matched = [q for q in topic_pool if kw in q["question"].lower() or any(kw in opt.lower() for opt in q["options"])]
            unmatched = [q for q in topic_pool if q not in matched]
            candidates = matched + unmatched
        else:
            candidates = topic_pool

        # Apply shift filter if specified
        if s_filter:
            candidates = [q for q in candidates if s_filter.lower() in q.get("shift", "").lower()]

        for item in candidates[:limit]:
            seen_ids.add(item["id"])
            results_list.append(item)

    # 2. Fast In-Memory keyword matching across all topics before hitting slower disk/network DB
    elif clean_query and clean_query.lower() != "general awareness":
        kw = clean_query.lower()
        for t_name, q_list in PYQ_TOPIC_CACHE.items():
            for item in q_list:
                if item["id"] in seen_ids:
                    continue
                if kw in item["question"].lower() or any(kw in opt.lower() for opt in item["options"]):
                    seen_ids.add(item["id"])
                    results_list.append(item)
                if len(results_list) >= limit:
                    break
            if len(results_list) >= limit:
                break

    # 3. Global fallback across all cached topics if still empty
    if not results_list:
        for t_name, q_list in PYQ_TOPIC_CACHE.items():
            for q_item in q_list:
                if q_item["id"] not in seen_ids:
                    seen_ids.add(q_item["id"])
                    results_list.append(q_item)
                if len(results_list) >= limit:
                    break
            if len(results_list) >= limit:
                break

    return {
        "query": clean_query or (t_filter or "General Awareness"),
        "total_retrieved": len(results_list),
        "questions": results_list
    }


# =====================================================================
# 3.1. English PYQs & Topic-wise Endpoint
# =====================================================================

@app.get("/api/english/topics")
def get_english_topics():
    """
    Returns available English topics with question counts.
    """
    topics_list = [
        {"topic": topic, "count": len(questions)}
        for topic, questions in sorted(ENGLISH_TOPIC_CACHE.items(), key=lambda x: -len(x[1]))
    ]
    return {
        "total_topics": len(topics_list),
        "total_questions": sum(t["count"] for t in topics_list),
        "topics": topics_list
    }

@app.get("/api/english/search")
def search_english_pyqs(
    query: Optional[str] = Query(None, description="Topic, keyword, or sentence"),
    topic_filter: Optional[str] = Query(None, description="English topic filter"),
    n_results: int = Query(500, ge=1, le=2000)
):
    """
    Retrieves authentic SSC CHSL English PYQs from in-memory cache.
    """
    clean_query = str(query).strip() if (query is not None and not hasattr(query, "default")) else ""
    t_filter = str(topic_filter).strip() if (topic_filter is not None and not hasattr(topic_filter, "default")) else None
    limit = int(n_results) if (n_results is not None and not hasattr(n_results, "default")) else 500

    results_list: List[Dict[str, Any]] = []
    seen_ids = set()

    # 1. Filter by specific topic
    if t_filter and t_filter in ENGLISH_TOPIC_CACHE:
        topic_pool = ENGLISH_TOPIC_CACHE[t_filter]
        if clean_query and clean_query.lower() not in (t_filter.lower(), "english"):
            kw = clean_query.lower()
            matched = [q for q in topic_pool if kw in q["question"].lower() or any(kw in opt.lower() for opt in q["options"])]
            unmatched = [q for q in topic_pool if q not in matched]
            candidates = matched + unmatched
        else:
            candidates = topic_pool

        for item in candidates[:limit]:
            seen_ids.add(item["id"])
            results_list.append(item)

    # 2. Search across all English topics by keyword
    elif clean_query and clean_query.lower() != "english":
        kw = clean_query.lower()
        for t_name, q_list in ENGLISH_TOPIC_CACHE.items():
            for item in q_list:
                if item["id"] in seen_ids:
                    continue
                if kw in item["question"].lower() or any(kw in opt.lower() for opt in item["options"]):
                    seen_ids.add(item["id"])
                    results_list.append(item)
                if len(results_list) >= limit:
                    break
            if len(results_list) >= limit:
                break

    # 3. Default fallback: broad mix across English topics
    if not results_list:
        for t_name, q_list in ENGLISH_TOPIC_CACHE.items():
            for q_item in q_list[:30]:
                if q_item["id"] not in seen_ids:
                    seen_ids.add(q_item["id"])
                    results_list.append(q_item)
                if len(results_list) >= limit:
                    break
            if len(results_list) >= limit:
                break

    return {
        "query": clean_query or (t_filter or "English"),
        "total_retrieved": len(results_list),
        "questions": results_list
    }


# =====================================================================
# 4. Lucent GK Page Access & Intelligent Question Generator
# =====================================================================

@app.get("/api/lucent/page/{page_number}")
def get_lucent_page(page_number: int):
    """
    Fetches raw extracted text, headings, and topics for a specific Lucent GK page.
    """
    # 1. Check in-memory cache
    if page_number in LUCENT_PAGES_CACHE:
        return LUCENT_PAGES_CACHE[page_number]

    # 2. Check MongoDB
    try:
        client = mongo_mgr.get_client()
        page_doc = client["chsl_gnr"]["lucent_gk"].find_one({"page_number": page_number})
        if page_doc:
            return {
                "page_number": page_doc["page_number"],
                "relative_headings": page_doc.get("relative_headings", []),
                "corresponding_topics": page_doc.get("corresponding_topics", []),
                "text": page_doc.get("text", ""),
                "source_pdf": page_doc.get("source_pdf", "Lucent GK")
            }
    except Exception:
        pass

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Page {page_number} not found in Lucent GK extraction."
    )


def extract_key_facts_from_page(text: str, headings: List[str]) -> List[Dict[str, Any]]:
    """
    Intelligently extracts factual knowledge nuggets from Lucent GK page text.
    Handles colon-separated facts, dates, sites, terms, definitions, and articles.
    """
    lines = [l.strip() for l in text.splitlines() if len(l.strip()) > 15]
    facts = []

    for line in lines:
        # Pattern 1: Fact with colon or dash: 'The oldest name ~ Indus Civilization'
        if ":" in line or "~" in line or "-" in line:
            parts = re.split(r"[:~-]", line, maxsplit=1)
            subject_part = parts[0].strip(" ._")
            detail_part = parts[1].strip(" ._")
            if len(subject_part) >= 4 and len(detail_part) >= 4:
                facts.append({"subject": subject_part, "detail": detail_part, "raw": line})

        # Pattern 2: Year or dating: '2500 BC-1750 BC (by Carbon-14 dating)'
        if re.search(r"\b\d{3,4}\s*(?:BC|AD|BCE|CE)\b", line, re.IGNORECASE):
            facts.append({"subject": "Chronology/Period", "detail": line, "raw": line})

        # Pattern 3: Discovery or personality
        if any(w in line.lower() for w in ["scholar", "first", "discovered", "founded", "written by", "authored", "established"]):
            facts.append({"subject": "Key Figure/Discovery", "detail": line, "raw": line})

    return facts


@app.post("/api/lucent/generate-questions")
def generate_questions_from_page(req: LucentGenerateRequest):
    """
    Generates new SSC-style multiple choice questions dynamically from the
    specified Lucent GK page number.
    """
    page_data = LUCENT_PAGES_CACHE.get(req.page_number)
    if not page_data:
        try:
            client = mongo_mgr.get_client()
            page_data = client["chsl_gnr"]["lucent_gk"].find_one({"page_number": req.page_number})
        except Exception:
            pass

    if not page_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Page {req.page_number} not found in Lucent GK dataset."
        )

    text = page_data.get("text", "")
    headings = page_data.get("relative_headings", [])
    topics = page_data.get("corresponding_topics", ["General Awareness"])
    primary_topic = topics[0] if topics else "General Awareness"
    primary_heading = headings[0] if headings else "Lucent GK"

    if len(text.strip()) < 50:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Page {req.page_number} does not contain sufficient text to generate questions."
        )

    facts = extract_key_facts_from_page(text, headings)
    generated_questions = []

    # Distractor bank for plausible SSC-style choices
    distractors_pool = {
        "cities": ["Mohenjodaro", "Harappa", "Lothal", "Kalibangan", "Dholavira", "Banawali", "Rakhigarhi", "Chanhudaro"],
        "dates": ["2500 BC – 1750 BC", "1500 BC – 1000 BC", "1000 BC – 600 BC", "320 AD – 550 AD", "1857 AD"],
        "names": ["John Marshall", "Daya Ram Sahni", "R.D. Bannerji", "Mortimer Wheeler", "Alexander Cunningham", "Amalanand Ghosh"],
        "terms": ["Chalcolithic Period", "Neolithic Period", "Mesolithic Period", "Paleolithic Period", "Iron Age"]
    }

    # Generate up to requested count
    for i, fact in enumerate(facts[:req.count]):
        raw_fact = fact["raw"]
        subj = fact["subject"]
        det = fact["detail"]

        # Formulate MCQ
        q_prompt = f"According to Lucent GK (Page {req.page_number}, {primary_heading}), which of the following statements correctly identifies: '{subj}'?"
        correct_ans = f"(a) {det[:85]}"

        # Craft 3 plausible distractors
        alt_options = [
            f"(b) Associated with later Vedic age traditions",
            f"(c) First discovered during post-Mauryan excavations",
            f"(d) Belongs strictly to the Neolithic stone tools era"
        ]

        if "dating" in det.lower() or "period" in det.lower():
            alt_options = [
                f"(b) 1500 BC – 1000 BC (Rigvedic period)",
                f"(c) 1000 BC – 600 BC (Later Vedic era)",
                f"(d) 320 AD – 550 AD (Gupta period)"
            ]
        elif any(name in det for name in ["Marshall", "Sahni", "Bannerji", "Wheeler"]):
            alt_options = [
                f"(b) Alexander Cunningham",
                f"(c) James Prinsep",
                f"(d) Sir William Jones"
            ]

        options = [correct_ans] + alt_options

        generated_questions.append({
            "id": f"gen_p{req.page_number}_q{i+1}",
            "question_number": i + 1,
            "page_number": req.page_number,
            "source_heading": primary_heading,
            "topic": primary_topic,
            "question": q_prompt,
            "options": options,
            "correct_answer": correct_ans,
            "explanation": f"Source: Lucent GK Book, Page {req.page_number}. Section: '{primary_heading}'. Excerpt: \"{raw_fact[:150]}...\""
        })

    # If heuristic facts were fewer than requested count, construct a comprehensive question from full text
    if not generated_questions:
        sample_line = [l for l in text.splitlines() if len(l) > 30][0] if text.splitlines() else "General content"
        generated_questions.append({
            "id": f"gen_p{req.page_number}_q1",
            "question_number": 1,
            "page_number": req.page_number,
            "source_heading": primary_heading,
            "topic": primary_topic,
            "question": f"Consider the historical and general awareness content on Page {req.page_number} under '{primary_heading}'. Which of the following is highlighted?",
            "options": [
                f"(a) {sample_line[:80]}",
                f"(b) Establishment of the Indian National Congress in 1885",
                f"(c) Direct Tax code amendments under GST council",
                f"(d) Drafting of Article 370 in the Indian Constitution"
            ],
            "correct_answer": f"(a) {sample_line[:80]}",
            "explanation": f"Source: Lucent GK Page {req.page_number}. Relevant text: \"{sample_line[:120]}\""
        })

    return {
        "page_number": req.page_number,
        "headings": headings,
        "topic": primary_topic,
        "total_generated": len(generated_questions),
        "questions": generated_questions
    }


# =====================================================================
# 5. User Performance Logging
# =====================================================================

@app.post("/api/user/record-attempt")
def record_attempt(
    req: AttemptLogRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    client = mongo_mgr.get_client()
    now = datetime.datetime.now(datetime.timezone.utc)
    user_id = current_user["user_id"]

    # 1. Upsert / update record in user_attempted_questions collection for Revise Your Progress
    attempt_detail = {
        "user_id": user_id,
        "question_id": req.question_id,
        "question_type": req.question_type,
        "subject": req.subject,
        "topic": req.topic,
        "user_selected_option": req.user_selected_option,
        "correct_option": req.correct_option,
        "is_correct": req.is_correct,
        "question_text": req.question_text or "",
        "options": req.options or [],
        "exam_date": req.exam_date or "",
        "repetition_count": req.repetition_count or 1,
        "time_spent_seconds": req.time_spent_seconds,
        "attempted_at": now
    }
    client["user_management"]["user_attempted_questions"].update_one(
        {"user_id": user_id, "question_id": req.question_id},
        {
            "$set": attempt_detail,
            "$inc": {"attempt_count": 1}
        },
        upsert=True
    )

    # Also log history in user_performance
    client["user_management"]["user_performance"].insert_one(attempt_detail)

    # 2. Update user_analytics in MongoDB
    analytics = client["user_management"]["user_analytics"].find_one({"user_id": user_id})
    if not analytics:
        analytics = {
            "user_id": user_id,
            "total_questions_attempted": 0,
            "total_correct": 0,
            "overall_accuracy_pct": 0.0,
            "subject_breakdown": {},
            "recent_activity": []
        }

    total_att = analytics.get("total_questions_attempted", 0) + 1
    total_corr = analytics.get("total_correct", 0) + (1 if req.is_correct else 0)
    acc = round((total_corr / total_att) * 100.0, 1)

    breakdown = analytics.get("subject_breakdown", {})
    sub_data = breakdown.get(req.subject, {"attempted": 0, "correct": 0, "accuracy_pct": 0.0})
    sub_att = sub_data.get("attempted", 0) + 1
    sub_corr = sub_data.get("correct", 0) + (1 if req.is_correct else 0)
    sub_acc = round((sub_corr / sub_att) * 100.0, 1)

    breakdown[req.subject] = {
        "attempted": sub_att,
        "correct": sub_corr,
        "accuracy_pct": sub_acc
    }

    recent = analytics.get("recent_activity", [])
    recent.append({
        "question_id": req.question_id,
        "topic": req.topic,
        "is_correct": req.is_correct,
        "timestamp": now.isoformat()
    })

    client["user_management"]["user_analytics"].update_one(
        {"user_id": user_id},
        {"$set": {
            "total_questions_attempted": total_att,
            "total_correct": total_corr,
            "overall_accuracy_pct": acc,
            "subject_breakdown": breakdown,
            "recent_activity": recent[-20:],
            "last_updated": now
        }},
        upsert=True
    )

    return {
        "status": "success",
        "is_correct": req.is_correct,
        "total_attempted": total_att,
        "accuracy_pct": acc
    }


# =====================================================================
# 6. Attempted Questions & Revision Section (Revise Your Progress)
# =====================================================================

@app.get("/api/user/attempted-questions")
def get_user_attempted_questions(
    filter_status: Optional[str] = Query("all", description="'all', 'incorrect', or 'correct'"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Returns all questions attempted by the logged-in candidate with full details,
    allowing reattempting and progress revision.
    """
    client = mongo_mgr.get_client()
    user_id = current_user["user_id"]
    query: Dict[str, Any] = {"user_id": user_id}

    if filter_status == "incorrect":
        query["is_correct"] = False
    elif filter_status == "correct":
        query["is_correct"] = True

    cursor = client["user_management"]["user_attempted_questions"].find(query).sort("attempted_at", -1)
    attempted_list = []
    for doc in cursor:
        doc["_id"] = str(doc["_id"])
        if isinstance(doc.get("attempted_at"), datetime.datetime):
            doc["attempted_at"] = doc["attempted_at"].isoformat()
        attempted_list.append(doc)

    return {
        "total": len(attempted_list),
        "filter": filter_status,
        "questions": attempted_list
    }


@app.delete("/api/user/attempted-questions/{question_id}")
def clear_attempted_question(
    question_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Removes a question from the attempted list so user can re-study it fresh in the main bank.
    """
    client = mongo_mgr.get_client()
    user_id = current_user["user_id"]
    client["user_management"]["user_attempted_questions"].delete_one({
        "user_id": user_id,
        "question_id": question_id
    })
    return {"status": "success", "question_id": question_id}


# =====================================================================
# 7. Daily Test & Gamification System (Streaks, Points, Penalties, Dialogue)
# =====================================================================

DAILY_TEST_CONFIG = {
    "english_count": 10,
    "ga_count": 10,
    "lucent_count": 10,
    "duration_minutes": 30,
    "points_completion": 20,
    "points_per_correct": 2,
    "points_7day_streak_bonus": 50,
    "points_all_sections_bonus": 10,
    "points_80pct_accuracy_bonus": 15,
    "missed_penalty_points": 10
}

def generate_daily_questions_for_user(user_id: str, date_str: str) -> List[Dict[str, Any]]:
    """Generates deterministic, diversified 30-question daily test for a given date."""
    seed_str = f"{user_id}_{date_str}_ssc_chsl_daily"
    rng = random.Random(seed_str)

    # 1. English PYQs (10 diverse questions)
    eng_pool = []
    for top, qs in sorted(ENGLISH_TOPIC_CACHE.items()):
        if qs:
            eng_pool.append(rng.choice(qs))
    rng.shuffle(eng_pool)
    while len(eng_pool) < DAILY_TEST_CONFIG["english_count"]:
        all_eng = [q for qs in ENGLISH_TOPIC_CACHE.values() for q in qs]
        eng_pool.append(rng.choice(all_eng))
    selected_eng = eng_pool[:DAILY_TEST_CONFIG["english_count"]]

    # 2. General Awareness PYQs (10 diverse questions)
    ga_pool = []
    for top, qs in sorted(PYQ_TOPIC_CACHE.items()):
        if qs:
            ga_pool.append(rng.choice(qs))
    rng.shuffle(ga_pool)
    while len(ga_pool) < DAILY_TEST_CONFIG["ga_count"]:
        all_ga = [q for qs in PYQ_TOPIC_CACHE.values() for q in qs]
        ga_pool.append(rng.choice(all_ga))
    selected_ga = ga_pool[:DAILY_TEST_CONFIG["ga_count"]]

    # 3. Lucent Generated Questions (10 distinct pages)
    valid_pages = [p for p in sorted(LUCENT_PAGES_CACHE.keys()) if len(LUCENT_PAGES_CACHE[p].get("text", "")) > 200]
    luc_pages = rng.sample(valid_pages, min(DAILY_TEST_CONFIG["lucent_count"], len(valid_pages)))
    selected_luc = []
    for idx, p in enumerate(luc_pages):
        pdata = LUCENT_PAGES_CACHE[p]
        facts = extract_key_facts_from_page(pdata.get("text", ""), pdata.get("relative_headings", []))
        headings = pdata.get("relative_headings", ["Lucent GK"])
        h = headings[0] if headings else "Lucent GK"
        topic = pdata.get("corresponding_topics", ["General Awareness"])[0]

        if facts:
            fact = facts[0]
            subj = fact.get("subject", "Concept")
            det = fact.get("detail", "")
            q_prompt = f"According to Lucent GK (Page {p}, {h}), which of the following correctly identifies: '{subj}'?"
            correct_ans = f"(a) {det[:85]}"
        else:
            sample_line = [l for l in pdata.get("text", "").splitlines() if len(l) > 30]
            sample_text = sample_line[0] if sample_line else "Factual concept"
            q_prompt = f"According to Lucent GK (Page {p}, {h}), which factual concept is established?"
            correct_ans = f"(a) {sample_text[:85]}"

        alt_options = [
            "(b) Associated with later Vedic age traditions",
            "(c) First discovered during post-Mauryan excavations",
            "(d) Belongs strictly to the Neolithic stone tools era"
        ]
        options = [correct_ans] + alt_options
        rng.shuffle(options)

        selected_luc.append({
            "id": f"daily_luc_p{p}_{idx+1}",
            "question": q_prompt,
            "options": options,
            "correct_answer": correct_ans,
            "subject": "General Awareness",
            "topic": topic,
            "source": f"Lucent GK Book Page {p}",
            "explanation": f"Sourced directly from Lucent GK page {p} under section '{h}'."
        })

    # Assemble structured 30 questions
    test_questions = []
    q_counter = 1
    for q in selected_eng:
        item = dict(q)
        item["q_index"] = q_counter
        item["section"] = "English"
        test_questions.append(item)
        q_counter += 1

    for q in selected_ga:
        item = dict(q)
        item["q_index"] = q_counter
        item["section"] = "General Awareness"
        test_questions.append(item)
        q_counter += 1

    for q in selected_luc:
        item = dict(q)
        item["q_index"] = q_counter
        item["section"] = "Lucent Generator"
        test_questions.append(item)
        q_counter += 1

    return test_questions


def check_and_apply_missed_test_penalties(user_id: str, client: pymongo.MongoClient) -> Optional[Dict[str, Any]]:
    """
    Checks if the candidate missed yesterday's daily test.
    If missed and penalty not yet applied:
      - Deducts 10 points (idempotent, point balance won't drop below 0).
      - Resets current streak to 0.
      - Logs a point_transaction and records daily_activity.
      - Returns penalty dialogue information for the user companion.
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    today_date = now.strftime("%Y-%m-%d")
    yesterday = (now - datetime.timedelta(days=1)).strftime("%Y-%m-%d")

    # Get user progress
    prog_coll = client["user_management"]["user_progress"]
    prog = prog_coll.find_one({"user_id": user_id})
    if not prog:
        # Initialize initial progress
        prog = {
            "user_id": user_id,
            "total_points": 0,
            "current_streak": 0,
            "longest_streak": 0,
            "last_completed_date": None,
            "total_tests_completed": 0,
            "total_questions_attempted": 0,
            "overall_accuracy": 0.0,
            "created_at": now,
            "updated_at": now
        }
        prog_coll.insert_one(prog)

    last_comp = prog.get("last_completed_date")
    # If user already completed yesterday or today, no penalty
    if last_comp in (today_date, yesterday):
        return None

    # Check daily_activity record for yesterday
    act_coll = client["user_management"]["daily_activities"]
    y_act = act_coll.find_one({"user_id": user_id, "activity_date": yesterday})

    if not y_act:
        # Check if user had created an account before yesterday
        user_doc = client["user_management"]["user_profiles"].find_one({"user_id": user_id})
        created_at = user_doc.get("created_at") if user_doc else None
        created_date = created_at.strftime("%Y-%m-%d") if isinstance(created_at, datetime.datetime) else "2026-01-01"

        if created_date >= today_date:
            return None  # New user created today

        # Apply missed penalty once
        curr_points = prog.get("total_points", 0)
        penalty = min(DAILY_TEST_CONFIG["missed_penalty_points"], curr_points)
        new_points = max(0, curr_points - penalty)

        prog_coll.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "total_points": new_points,
                    "current_streak": 0,
                    "updated_at": now
                }
            }
        )

        if penalty > 0:
            client["user_management"]["point_transactions"].insert_one({
                "user_id": user_id,
                "points": -penalty,
                "transaction_type": "missed_test_penalty",
                "reason": f"Missed daily test on {yesterday}",
                "related_id": yesterday,
                "created_at": now
            })

        act_coll.insert_one({
            "user_id": user_id,
            "activity_date": yesterday,
            "status": "missed",
            "penalty_applied": True,
            "points_deducted": penalty,
            "dialogue_acknowledged": False,
            "created_at": now,
            "updated_at": now
        })

        return {
            "missed_date": yesterday,
            "points_deducted": penalty,
            "dialogue": "⚠ You missed yesterday's daily challenge. Consistency matters more than motivation. You've lost 10 points, but you can still get back on track. Complete today's test and rebuild your streak!",
            "acknowledged": False
        }

    elif y_act.get("penalty_applied") and not y_act.get("dialogue_acknowledged"):
        return {
            "missed_date": yesterday,
            "points_deducted": y_act.get("points_deducted", 10),
            "dialogue": "⚠ You missed yesterday's daily challenge. Consistency matters more than motivation. You've lost 10 points, but you can still get back on track. Complete today's test and rebuild your streak!",
            "acknowledged": False
        }

    return None


@app.get("/api/dashboard/summary")
def get_dashboard_summary(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Retrieves full dashboard stats, today's daily test status, streak, points,
    subject breakdown, recent tests, and any active missed-test alert.
    """
    client = mongo_mgr.get_client()
    user_id = current_user["user_id"]
    now = datetime.datetime.now(datetime.timezone.utc)
    today_date = now.strftime("%Y-%m-%d")

    # Check for missed test penalty
    penalty_alert = check_and_apply_missed_test_penalties(user_id, client)

    # Fetch User Progress
    prog_coll = client["user_management"]["user_progress"]
    prog = prog_coll.find_one({"user_id": user_id}) or {}

    # Check today's Daily Test
    dt_coll = client["user_management"]["daily_tests"]
    today_test = dt_coll.find_one({"user_id": user_id, "test_date": today_date})

    # Recent completed tests
    att_coll = client["user_management"]["test_attempts"]
    recent_attempts_cursor = att_coll.find({"user_id": user_id}).sort("completed_at", -1).limit(5)
    recent_attempts = []
    for att in recent_attempts_cursor:
        recent_attempts.append({
            "id": str(att["_id"]),
            "daily_test_id": att.get("daily_test_id"),
            "test_date": att.get("test_date", today_date),
            "score": att.get("score", 0),
            "total_questions": att.get("total_questions", 30),
            "accuracy_pct": att.get("accuracy_pct", 0),
            "duration_seconds": att.get("duration_seconds", 0),
            "completed_at": att.get("completed_at").isoformat() if isinstance(att.get("completed_at"), datetime.datetime) else str(att.get("completed_at"))
        })

    # Calculate weekly completion (last 7 days)
    seven_days_ago = (now - datetime.timedelta(days=7)).strftime("%Y-%m-%d")
    weekly_completed_count = dt_coll.count_documents({
        "user_id": user_id,
        "test_date": {"$gte": seven_days_ago},
        "status": "completed"
    })
    weekly_rate = round((weekly_completed_count / 7.0) * 100)

    # General Analytics
    analytics = client["user_management"]["user_analytics"].find_one({"user_id": user_id}) or {}

    return {
        "greeting": f"Welcome back, {current_user.get('full_name') or current_user['username']}!",
        "today_date": today_date,
        "target_exam": current_user.get("target_exam", "SSC CHSL 2026"),
        "points": prog.get("total_points", 0),
        "current_streak": prog.get("current_streak", 0),
        "longest_streak": prog.get("longest_streak", 0),
        "total_tests_completed": prog.get("total_tests_completed", 0),
        "total_questions_attempted": prog.get("total_questions_attempted", analytics.get("total_questions_attempted", 0)),
        "overall_accuracy_pct": prog.get("overall_accuracy", analytics.get("overall_accuracy_pct", 0)),
        "weekly_completion_rate": weekly_rate,
        "daily_test_status": today_test.get("status") if today_test else "not_started",
        "today_test_id": str(today_test["_id"]) if today_test else None,
        "penalty_alert": penalty_alert,
        "recent_activity": recent_attempts,
        "subject_progress": {
            "general_awareness": {
                "name": "General Awareness",
                "questions_bank": sum(len(qs) for qs in PYQ_TOPIC_CACHE.values()),
                "topics_count": len(PYQ_TOPIC_CACHE),
                "is_active": True
            },
            "english": {
                "name": "English",
                "questions_bank": sum(len(qs) for qs in ENGLISH_TOPIC_CACHE.values()),
                "topics_count": len(ENGLISH_TOPIC_CACHE),
                "is_active": True
            },
            "lucent_gk": {
                "name": "Lucent GK Pages",
                "pages_count": len(LUCENT_PAGES_CACHE),
                "is_active": True
            }
        }
    }


@app.post("/api/dashboard/acknowledge-penalty")
def acknowledge_missed_dialogue(
    req: DialogueAcknowledgeRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Marks the missed-test warning dialogue as acknowledged."""
    client = mongo_mgr.get_client()
    user_id = current_user["user_id"]
    client["user_management"]["daily_activities"].update_one(
        {"user_id": user_id, "activity_date": req.activity_date},
        {"$set": {"dialogue_acknowledged": True}}
    )
    return {"status": "success", "acknowledged_date": req.activity_date}


@app.get("/api/daily-test/today")
def get_or_create_daily_test(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Retrieves or initializes today's structured 30-question daily test.
    Guarantees deterministic questions per calendar day without changing on refresh.
    """
    client = mongo_mgr.get_client()
    user_id = current_user["user_id"]
    now = datetime.datetime.now(datetime.timezone.utc)
    today_date = now.strftime("%Y-%m-%d")

    dt_coll = client["user_management"]["daily_tests"]
    existing = dt_coll.find_one({"user_id": user_id, "test_date": today_date})

    if not existing:
        # Generate 30 questions (10 English + 10 GA + 10 Lucent)
        questions = generate_daily_questions_for_user(user_id, today_date)
        deadline = datetime.datetime(now.year, now.month, now.day, 23, 59, 59, tzinfo=datetime.timezone.utc)

        doc = {
            "user_id": user_id,
            "test_date": today_date,
            "status": "available",
            "section_distribution": {
                "English": DAILY_TEST_CONFIG["english_count"],
                "General Awareness": DAILY_TEST_CONFIG["ga_count"],
                "Lucent Generator": DAILY_TEST_CONFIG["lucent_count"]
            },
            "total_questions": len(questions),
            "duration_minutes": DAILY_TEST_CONFIG["duration_minutes"],
            "deadline": deadline,
            "questions": questions,
            "started_at": None,
            "submitted_at": None,
            "created_at": now
        }
        res = dt_coll.insert_one(doc)
        doc["_id"] = str(res.inserted_id)
        test_obj = doc
    else:
        test_obj = existing
        test_obj["_id"] = str(test_obj["_id"])

    # Sanitize questions for candidate: hide correct_answer until submitted
    is_submitted = (test_obj.get("status") == "completed")
    sanitized_questions = []
    for q in test_obj.get("questions", []):
        q_copy = dict(q)
        if not is_submitted:
            q_copy.pop("correct_answer", None)
            q_copy.pop("explanation", None)
        sanitized_questions.append(q_copy)

    # Format dates
    if isinstance(test_obj.get("deadline"), datetime.datetime):
        test_obj["deadline"] = test_obj["deadline"].isoformat()
    if isinstance(test_obj.get("started_at"), datetime.datetime):
        test_obj["started_at"] = test_obj["started_at"].isoformat()
    if isinstance(test_obj.get("submitted_at"), datetime.datetime):
        test_obj["submitted_at"] = test_obj["submitted_at"].isoformat()
    if isinstance(test_obj.get("created_at"), datetime.datetime):
        test_obj["created_at"] = test_obj["created_at"].isoformat()

    test_obj["questions"] = sanitized_questions
    return test_obj


@app.post("/api/daily-test/start")
def start_daily_test(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Marks today's test as in_progress and records start timestamp."""
    client = mongo_mgr.get_client()
    user_id = current_user["user_id"]
    now = datetime.datetime.now(datetime.timezone.utc)
    today_date = now.strftime("%Y-%m-%d")

    dt_coll = client["user_management"]["daily_tests"]
    test_doc = dt_coll.find_one({"user_id": user_id, "test_date": today_date})
    if not test_doc:
        raise HTTPException(status_code=404, detail="Today's daily test is not created yet.")

    if test_doc.get("status") == "available":
        dt_coll.update_one(
            {"_id": test_doc["_id"]},
            {"$set": {"status": "in_progress", "started_at": now}}
        )

    return {"status": "in_progress", "started_at": now.isoformat()}


@app.post("/api/daily-test/submit")
def submit_daily_test(
    req: DailyTestSubmitRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Submits answers for today's daily test.
    Calculates correct, incorrect, skipped, score, and points.
    Idempotent: prevents duplicate submission points.
    Awards streaks and bonus rewards with contextual dialogues.
    """
    client = mongo_mgr.get_client()
    user_id = current_user["user_id"]
    now = datetime.datetime.now(datetime.timezone.utc)
    today_date = now.strftime("%Y-%m-%d")

    from bson import ObjectId
    try:
        dt_oid = ObjectId(req.daily_test_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid daily test ID.")

    dt_coll = client["user_management"]["daily_tests"]
    daily_test = dt_coll.find_one({"_id": dt_oid, "user_id": user_id})
    if not daily_test:
        raise HTTPException(status_code=404, detail="Daily test not found or does not belong to this user.")

    # Prevent duplicate submission calculation
    if daily_test.get("status") == "completed":
        # Return existing attempt results
        att = client["user_management"]["test_attempts"].find_one({"daily_test_id": req.daily_test_id})
        if att:
            att["_id"] = str(att["_id"])
            if isinstance(att.get("completed_at"), datetime.datetime):
                att["completed_at"] = att["completed_at"].isoformat()
            return att

    # Evaluate answers against true answer keys
    questions = daily_test.get("questions", [])
    user_answers = req.answers or {}

    correct_count = 0
    incorrect_count = 0
    skipped_count = 0
    section_breakdown = {
        "English": {"total": 0, "correct": 0, "incorrect": 0, "skipped": 0},
        "General Awareness": {"total": 0, "correct": 0, "incorrect": 0, "skipped": 0},
        "Lucent Generator": {"total": 0, "correct": 0, "incorrect": 0, "skipped": 0}
    }

    eval_details = []
    for q in questions:
        qid = q["id"]
        sec = q.get("section", "General Awareness")
        if sec not in section_breakdown:
            section_breakdown[sec] = {"total": 0, "correct": 0, "incorrect": 0, "skipped": 0}
        section_breakdown[sec]["total"] += 1

        selected = user_answers.get(qid)
        correct_ans = q.get("correct_answer", "")

        is_correct = False
        is_skipped = not selected

        if is_skipped:
            skipped_count += 1
            section_breakdown[sec]["skipped"] += 1
        else:
            # Check correctness (handles prefixes like "(a) " or plain text)
            clean_sel = clean_pyq_option_text(selected).lower()
            clean_cor = clean_pyq_option_text(correct_ans).lower()
            if clean_sel == clean_cor or selected == correct_ans:
                is_correct = True
                correct_count += 1
                section_breakdown[sec]["correct"] += 1
            else:
                incorrect_count += 1
                section_breakdown[sec]["incorrect"] += 1

        eval_details.append({
            "id": qid,
            "question": q.get("question"),
            "section": sec,
            "topic": q.get("topic"),
            "options": q.get("options"),
            "user_selected": selected,
            "correct_answer": correct_ans,
            "is_correct": is_correct,
            "is_skipped": is_skipped,
            "explanation": q.get("explanation", f"Correct Option: {correct_ans}")
        })

    total_q = len(questions)
    accuracy_pct = round((correct_count / total_q) * 100) if total_q > 0 else 0

    # Calculate points and gamification bonuses
    points_earned = DAILY_TEST_CONFIG["points_completion"] + (correct_count * DAILY_TEST_CONFIG["points_per_correct"])
    bonus_reasons = []

    # All 3 sections attempted
    all_sections_touched = all(s["correct"] + s["incorrect"] > 0 for s in section_breakdown.values())
    if all_sections_touched:
        points_earned += DAILY_TEST_CONFIG["points_all_sections_bonus"]
        bonus_reasons.append("All Sections Attempted (+10)")

    # 80%+ accuracy bonus
    if accuracy_pct >= 80:
        points_earned += DAILY_TEST_CONFIG["points_80pct_accuracy_bonus"]
        bonus_reasons.append("80%+ Accuracy Mastery (+15)")

    # Update Streak in User Progress
    prog_coll = client["user_management"]["user_progress"]
    prog = prog_coll.find_one({"user_id": user_id}) or {}
    last_comp = prog.get("last_completed_date")
    curr_streak = prog.get("current_streak", 0)

    yesterday = (now - datetime.timedelta(days=1)).strftime("%Y-%m-%d")
    if last_comp == yesterday:
        curr_streak += 1
    elif last_comp == today_date:
        pass  # Already counted for today
    else:
        curr_streak = 1  # Streak restarts with today's test

    # 7-day streak bonus
    if curr_streak > 0 and curr_streak % 7 == 0:
        points_earned += DAILY_TEST_CONFIG["points_7day_streak_bonus"]
        bonus_reasons.append("7-Day Streak Achieved (+50)")

    longest_streak = max(prog.get("longest_streak", 0), curr_streak)
    total_points = prog.get("total_points", 0) + points_earned
    total_tests = prog.get("total_tests_completed", 0) + 1
    total_q_att = prog.get("total_questions_attempted", 0) + total_q

    # Contextual Dialogue Generation
    if accuracy_pct == 100:
        dialogue = f"Outstanding! A perfect score today. You're getting closer to your SSC CHSL goal. +{points_earned} points unlocked!"
    elif curr_streak == 7 or curr_streak % 7 == 0:
        dialogue = f"Seven days of consistency! That's a serious commitment. You've earned your weekly streak bonus! Total +{points_earned} points added!"
    elif accuracy_pct >= 85:
        dialogue = f"Excellent work! You completed today's challenge with {accuracy_pct}% accuracy. Your consistency is building your confidence. Keep going!"
    elif accuracy_pct >= 60:
        dialogue = f"Good effort! You answered {correct_count}/{total_q} correctly ({accuracy_pct}%). Review your incorrect answers to lock in the knowledge."
    else:
        dialogue = f"Today's challenge completed. Every test is a stepping stone. Spend 10 minutes reviewing your incorrect items to bridge the gaps!"

    # Save Test Attempt
    attempt_doc = {
        "user_id": user_id,
        "daily_test_id": req.daily_test_id,
        "test_date": today_date,
        "total_questions": total_q,
        "correct_answers": correct_count,
        "incorrect_answers": incorrect_count,
        "skipped_answers": skipped_count,
        "accuracy_pct": accuracy_pct,
        "score": correct_count * 2,
        "points_earned": points_earned,
        "bonus_reasons": bonus_reasons,
        "dialogue": dialogue,
        "duration_seconds": req.duration_seconds,
        "section_breakdown": section_breakdown,
        "evaluation": eval_details,
        "completed_at": now
    }
    att_res = client["user_management"]["test_attempts"].insert_one(attempt_doc)

    # Update Daily Test Status
    dt_coll.update_one(
        {"_id": dt_oid},
        {
            "$set": {
                "status": "completed",
                "submitted_at": now,
                "score": correct_count * 2,
                "accuracy_pct": accuracy_pct,
                "points_earned": points_earned
            }
        }
    )

    # Update User Progress
    prog_coll.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "total_points": total_points,
                "current_streak": curr_streak,
                "longest_streak": longest_streak,
                "last_completed_date": today_date,
                "total_tests_completed": total_tests,
                "total_questions_attempted": total_q_att,
                "overall_accuracy": round((total_points / (total_tests * 30)) * 100, 1) if total_tests > 0 else accuracy_pct,
                "updated_at": now
            }
        },
        upsert=True
    )

    # Insert Point Transaction
    client["user_management"]["point_transactions"].insert_one({
        "user_id": user_id,
        "points": points_earned,
        "transaction_type": "daily_test_completion",
        "reason": f"Completed Daily Test for {today_date} ({accuracy_pct}% accuracy)",
        "related_id": req.daily_test_id,
        "created_at": now
    })

    # Record Daily Activity
    client["user_management"]["daily_activities"].update_one(
        {"user_id": user_id, "activity_date": today_date},
        {
            "$set": {
                "status": "completed",
                "score": correct_count * 2,
                "accuracy_pct": accuracy_pct,
                "penalty_applied": False,
                "updated_at": now
            }
        },
        upsert=True
    )

    attempt_doc["_id"] = str(att_res.inserted_id)
    attempt_doc["completed_at"] = now.isoformat()
    return attempt_doc


@app.get("/api/daily-test/history")
def get_daily_test_history(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Fetches user's past daily test results and evaluations."""
    client = mongo_mgr.get_client()
    user_id = current_user["user_id"]
    cursor = client["user_management"]["test_attempts"].find({"user_id": user_id}).sort("completed_at", -1).limit(30)

    history = []
    for doc in cursor:
        doc["_id"] = str(doc["_id"])
        if isinstance(doc.get("completed_at"), datetime.datetime):
            doc["completed_at"] = doc["completed_at"].isoformat()
        history.append(doc)

    return {"total": len(history), "attempts": history}


@app.get("/api/gamification/progress")
def get_gamification_progress(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Retrieves candidate's points, streaks, achievements, and transaction log."""
    client = mongo_mgr.get_client()
    user_id = current_user["user_id"]

    prog = client["user_management"]["user_progress"].find_one({"user_id": user_id}) or {}
    tx_cursor = client["user_management"]["point_transactions"].find({"user_id": user_id}).sort("created_at", -1).limit(20)

    transactions = []
    for tx in tx_cursor:
        tx["_id"] = str(tx["_id"])
        if isinstance(tx.get("created_at"), datetime.datetime):
            tx["created_at"] = tx["created_at"].isoformat()
        transactions.append(tx)

    pts = prog.get("total_points", 0)
    streak = prog.get("current_streak", 0)

    # Derived achievements
    achievements = [
        {"id": "first_step", "title": "First Step", "desc": "Complete your first Daily Test", "unlocked": prog.get("total_tests_completed", 0) >= 1},
        {"id": "streak_3", "title": "3-Day Dynamo", "desc": "Maintain a 3-day active streak", "unlocked": streak >= 3 or prog.get("longest_streak", 0) >= 3},
        {"id": "streak_7", "title": "Week Warrior", "desc": "Achieve a full 7-day streak", "unlocked": streak >= 7 or prog.get("longest_streak", 0) >= 7},
        {"id": "century", "title": "Centurion", "desc": "Earn 100+ preparation points", "unlocked": pts >= 100},
        {"id": "sharpshooter", "title": "Sharpshooter", "desc": "Score 80%+ accuracy on any test", "unlocked": prog.get("overall_accuracy", 0) >= 80},
        {"id": "veteran", "title": "Tier-1 Contender", "desc": "Complete 10 Daily Tests", "unlocked": prog.get("total_tests_completed", 0) >= 10}
    ]

    return {
        "points": pts,
        "current_streak": streak,
        "longest_streak": prog.get("longest_streak", 0),
        "total_tests_completed": prog.get("total_tests_completed", 0),
        "achievements": achievements,
        "recent_transactions": transactions
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    print(f"[*] Starting Antigravity Study Assistant Server on http://127.0.0.1:{port}")
    uvicorn.run("server:app", host="127.0.0.1", port=port, reload=True)
