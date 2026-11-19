import os
import json
import uuid
import re
import threading
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("lms.database")
logging.basicConfig(level=logging.INFO)

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "library_management_system")

_db_instance = None
_is_atlas_or_real_mongo = False


class MongoInsertResult:
    def __init__(self, inserted_id):
        self.inserted_id = inserted_id


class MongoUpdateResult:
    def __init__(self, matched_count, modified_count, upserted_id=None):
        self.matched_count = matched_count
        self.modified_count = modified_count
        self.upserted_id = upserted_id


class MongoDeleteResult:
    def __init__(self, deleted_count):
        self.deleted_count = deleted_count


class LocalMongoCursor:
    def __init__(self, docs: List[Dict[str, Any]]):
        self._docs = docs
        self._skip_val = 0
        self._limit_val = None

    def sort(self, key_or_list, direction=1):
        if isinstance(key_or_list, list):
            for k, d in reversed(key_or_list):
                self._docs.sort(key=lambda x: (x.get(k) is None, x.get(k, "")), reverse=(d == -1))
        elif isinstance(key_or_list, str):
            self._docs.sort(key=lambda x: (x.get(key_or_list) is None, x.get(key_or_list, "")), reverse=(direction == -1))
        return self

    def skip(self, count: int):
        self._skip_val = max(0, count)
        return self

    def limit(self, count: int):
        if count > 0:
            self._limit_val = count
        return self

    def __iter__(self):
        start = self._skip_val
        end = start + self._limit_val if self._limit_val is not None else len(self._docs)
        for doc in self._docs[start:end]:
            yield dict(doc)

    def to_list(self, length: Optional[int] = None) -> List[Dict[str, Any]]:
        start = self._skip_val
        max_end = start + length if length is not None else len(self._docs)
        if self._limit_val is not None:
            max_end = min(max_end, start + self._limit_val)
        return [dict(doc) for doc in self._docs[start:max_end]]


class LocalMongoCollection:
    def __init__(self, name: str, parent_db):
        self.name = name
        self.parent_db = parent_db

    def _matches_cond(self, doc_val, cond_val) -> bool:
        if isinstance(cond_val, dict):
            for op, target in cond_val.items():
                if op == "$eq" and not (doc_val == target):
                    return False
                elif op == "$ne" and not (doc_val != target):
                    return False
                elif op == "$gt" and not (doc_val is not None and doc_val > target):
                    return False
                elif op == "$gte" and not (doc_val is not None and doc_val >= target):
                    return False
                elif op == "$lt" and not (doc_val is not None and doc_val < target):
                    return False
                elif op == "$lte" and not (doc_val is not None and doc_val <= target):
                    return False
                elif op == "$in" and doc_val not in target:
                    return False
                elif op == "$nin" and doc_val in target:
                    return False
                elif op == "$regex":
                    flags = 0
                    if cond_val.get("$options") == "i":
                        flags = re.IGNORECASE
                    pattern = str(target)
                    if not re.search(pattern, str(doc_val or ""), flags):
                        return False
            return True
        return str(doc_val) == str(cond_val) if (isinstance(cond_val, str) and not isinstance(doc_val, bool)) else doc_val == cond_val

    def _matches_filter(self, doc: Dict[str, Any], filter_dict: Dict[str, Any]) -> bool:
        if not filter_dict:
            return True

        if "$or" in filter_dict:
            conditions = filter_dict["$or"]
            if not any(self._matches_filter(doc, c) for c in conditions):
                return False

        if "$and" in filter_dict:
            conditions = filter_dict["$and"]
            if not all(self._matches_filter(doc, c) for c in conditions):
                return False

        for k, v in filter_dict.items():
            if k in ("$or", "$and"):
                continue
            doc_val = doc.get(k)
            if not self._matches_cond(doc_val, v):
                return False

        return True

    def find(self, filter_dict: Optional[Dict[str, Any]] = None, sort=None) -> LocalMongoCursor:
        filter_dict = filter_dict or {}
        with self.parent_db.lock:
            docs = [dict(d) for d in self.parent_db.data.get(self.name, []) if self._matches_filter(d, filter_dict)]
        cursor = LocalMongoCursor(docs)
        if sort:
            cursor.sort(sort)
        return cursor

    def find_one(self, filter_dict: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        filter_dict = filter_dict or {}
        with self.parent_db.lock:
            for doc in self.parent_db.data.get(self.name, []):
                if self._matches_filter(doc, filter_dict):
                    return dict(doc)
        return None

    def insert_one(self, doc: Dict[str, Any]) -> MongoInsertResult:
        with self.parent_db.lock:
            item = dict(doc)
            if "_id" not in item:
                item["_id"] = str(uuid.uuid4())
            else:
                item["_id"] = str(item["_id"])
            if "created_at" not in item:
                item["created_at"] = datetime.utcnow().isoformat()
            
            if self.name not in self.parent_db.data:
                self.parent_db.data[self.name] = []
            
            self.parent_db.data[self.name].append(item)
            self.parent_db.save()
            return MongoInsertResult(item["_id"])

    def insert_many(self, docs: List[Dict[str, Any]]) -> List[str]:
        inserted_ids = []
        with self.parent_db.lock:
            if self.name not in self.parent_db.data:
                self.parent_db.data[self.name] = []
            for doc in docs:
                item = dict(doc)
                if "_id" not in item:
                    item["_id"] = str(uuid.uuid4())
                else:
                    item["_id"] = str(item["_id"])
                if "created_at" not in item:
                    item["created_at"] = datetime.utcnow().isoformat()
                self.parent_db.data[self.name].append(item)
                inserted_ids.append(item["_id"])
            self.parent_db.save()
        return inserted_ids

    def update_one(self, filter_dict: Dict[str, Any], update_dict: Dict[str, Any], upsert: bool = False) -> MongoUpdateResult:
        with self.parent_db.lock:
            docs = self.parent_db.data.get(self.name, [])
            for doc in docs:
                if self._matches_filter(doc, filter_dict):
                    self._apply_update(doc, update_dict)
                    doc["updated_at"] = datetime.utcnow().isoformat()
                    self.parent_db.save()
                    return MongoUpdateResult(1, 1)

            if upsert:
                new_doc = dict(filter_dict)
                self._apply_update(new_doc, update_dict)
                if "_id" not in new_doc:
                    new_doc["_id"] = str(uuid.uuid4())
                if "created_at" not in new_doc:
                    new_doc["created_at"] = datetime.utcnow().isoformat()
                if self.name not in self.parent_db.data:
                    self.parent_db.data[self.name] = []
                self.parent_db.data[self.name].append(new_doc)
                self.parent_db.save()
                return MongoUpdateResult(0, 0, upserted_id=new_doc["_id"])

            return MongoUpdateResult(0, 0)

    def update_many(self, filter_dict: Dict[str, Any], update_dict: Dict[str, Any]) -> MongoUpdateResult:
        matched = 0
        modified = 0
        with self.parent_db.lock:
            for doc in self.parent_db.data.get(self.name, []):
                if self._matches_filter(doc, filter_dict):
                    matched += 1
                    self._apply_update(doc, update_dict)
                    doc["updated_at"] = datetime.utcnow().isoformat()
                    modified += 1
            if modified > 0:
                self.parent_db.save()
        return MongoUpdateResult(matched, modified)

    def delete_one(self, filter_dict: Dict[str, Any]) -> MongoDeleteResult:
        with self.parent_db.lock:
            docs = self.parent_db.data.get(self.name, [])
            for idx, doc in enumerate(docs):
                if self._matches_filter(doc, filter_dict):
                    docs.pop(idx)
                    self.parent_db.save()
                    return MongoDeleteResult(1)
        return MongoDeleteResult(0)

    def delete_many(self, filter_dict: Dict[str, Any]) -> MongoDeleteResult:
        with self.parent_db.lock:
            docs = self.parent_db.data.get(self.name, [])
            initial_len = len(docs)
            self.parent_db.data[self.name] = [d for d in docs if not self._matches_filter(d, filter_dict)]
            deleted = initial_len - len(self.parent_db.data[self.name])
            if deleted > 0:
                self.parent_db.save()
        return MongoDeleteResult(deleted)

    def count_documents(self, filter_dict: Optional[Dict[str, Any]] = None) -> int:
        filter_dict = filter_dict or {}
        with self.parent_db.lock:
            count = sum(1 for d in self.parent_db.data.get(self.name, []) if self._matches_filter(d, filter_dict))
            return count

    def create_index(self, keys, **kwargs):
        # Index hint for local fallback
        return str(keys)

    def _apply_update(self, doc: Dict[str, Any], update_dict: Dict[str, Any]):
        if "$set" in update_dict:
            for k, v in update_dict["$set"].items():
                doc[k] = v
        if "$inc" in update_dict:
            for k, v in update_dict["$inc"].items():
                doc[k] = doc.get(k, 0) + v
        if "$push" in update_dict:
            for k, v in update_dict["$push"].items():
                if k not in doc or not isinstance(doc[k], list):
                    doc[k] = []
                doc[k].append(v)
        if "$unset" in update_dict:
            for k in update_dict["$unset"].keys():
                doc.pop(k, None)


class LocalMongoDatabase:
    def __init__(self, file_path: str):
        self.file_path = Path(file_path)
        self.lock = threading.RLock()
        self.data: Dict[str, List[Dict[str, Any]]] = {}
        self.collections: Dict[str, LocalMongoCollection] = {}
        self._load()

    def _load(self):
        with self.lock:
            if self.file_path.exists():
                try:
                    with open(self.file_path, "r", encoding="utf-8") as f:
                        self.data = json.load(f)
                except Exception as e:
                    logger.warning(f"Could not load local database file, starting fresh: {e}")
                    self.data = {}
            else:
                self.file_path.parent.mkdir(parents=True, exist_ok=True)
                self.data = {}
                self.save()

    def save(self):
        with self.lock:
            try:
                self.file_path.parent.mkdir(parents=True, exist_ok=True)
                with open(self.file_path, "w", encoding="utf-8") as f:
                    json.dump(self.data, f, indent=2, default=str)
            except Exception as e:
                logger.error(f"Error saving local database: {e}")

    def __getitem__(self, name: str) -> LocalMongoCollection:
        if name not in self.collections:
            self.collections[name] = LocalMongoCollection(name, self)
        return self.collections[name]


def init_db():
    global _db_instance, _is_atlas_or_real_mongo
    if _db_instance is not None:
        return _db_instance

    url = os.getenv("MONGODB_URL", "")
    db_name = os.getenv("MONGODB_DB_NAME", "library_management_system")

    # Try connecting to real MongoDB / MongoDB Atlas if URL configured
    if url and not url.startswith("mock://") and ("mongodb.net" in url or "mongodb://" in url or "mongodb+srv://" in url):
        try:
            import pymongo
            import certifi
            timeout_ms = 8000 if ("mongodb.net" in url or "mongodb+srv://" in url) else 1000
            client_kwargs = {
                "serverSelectionTimeoutMS": timeout_ms,
                "connectTimeoutMS": timeout_ms
            }
            if "mongodb.net" in url or "mongodb+srv://" in url:
                client_kwargs["tlsCAFile"] = certifi.where()

            client = pymongo.MongoClient(url, **client_kwargs)
            client.admin.command("ping")
            _db_instance = client[db_name]
            _is_atlas_or_real_mongo = True
            safe_url = url.split("@")[-1] if "@" in url else "local"
            logger.info(f"Successfully connected to MongoDB Atlas ({safe_url}). Database: {db_name}")
            return _db_instance
        except Exception as e:
            logger.warning(f"Unable to connect to live MongoDB server ({e}). Falling back to local persistent document store.")

    # Fallback to local persistent JSON-backed MongoDB-compatible store
    data_dir = Path(__file__).resolve().parent.parent.parent / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    db_file = data_dir / "db.json"
    _db_instance = LocalMongoDatabase(str(db_file))
    _is_atlas_or_real_mongo = False
    logger.info(f"Initialized persistent local document database at {db_file}")
    return _db_instance


def get_db():
    global _db_instance
    if _db_instance is None:
        return init_db()
    return _db_instance


def is_connected_to_atlas() -> bool:
    return _is_atlas_or_real_mongo
