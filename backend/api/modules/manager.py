"""
    file: manager.py
    brief: Property and Category models for State Manager
"""
# Standard library imports
import uuid
import random
import string
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field

# Local imports
from server_utils.database import Database
from firebase_admin import firestore
import flask

INTERNAL_KEYS = {"bedrooms", "bathrooms", "suites", "rooms", "garages", "area", "total", "total_area", "area_unit", "total_area_unit"}

def generate_friendly_id() -> str:
    """Generate a friendly, random alphanumeric ID."""
    return "VE-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=6))

@dataclass
class PropertyAddress:
    private: str = ""
    public: str = ""
    state: str = ""
    city: str = ""
    location: Optional[Dict[str, float]] = None

@dataclass
class PropertyCharacteristics:
    bedrooms: int = 0
    bathrooms: int = 0
    suites: int = 0
    rooms: int = 0
    garages: int = 0
    area: float = 0.0
    total_area: float = 0.0
    area_unit: str = "m2"
    total_area_unit: str = "m2"

@dataclass
class PropertyData:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    friendly_id: str = ""
    title: str = ""
    description: str = ""
    price: float = 0.0
    sale_price: Optional[float] = None
    rent_price: Optional[float] = None
    vacation_price: Optional[float] = None
    launch_price: Optional[float] = None
    property_type: str = "house"
    listing_type: str = "sale"
    status: str = "available"
    currency: str = "BRL"
    rent_period: str = "month"
    vacation_period: str = "day"
    annual_fee: Optional[float] = 0.0
    annual_fee_label: str = "iptu"
    condo_fee: Optional[float] = 0.0
    favorite_count: int = 0
    show_exact_address: bool = False
    
    # Optimization Fields
    search_snippet: Dict[str, Any] = field(default_factory=dict)
    micro_thumb_urls: List[str] = field(default_factory=list)
    
    # Nested Data Classes
    characteristics: PropertyCharacteristics = field(default_factory=PropertyCharacteristics)
    address: PropertyAddress = field(default_factory=PropertyAddress)
    
    # Extras/Amenities
    features: Dict[str, bool] = field(default_factory=dict)
    amenities: List[str] = field(default_factory=list)
    
    images: List[str] = field(default_factory=list)
    layout_image: Optional[str] = None
    owner_id: str = ""
    created_at: Any = None

class Property:
    """Class representing a property announcement."""

    def __init__(self, data: PropertyData) -> None:
        """Initialize a property with data object."""
        self.data = data
        self._validate()

    @property
    def id(self): return self.data.id
    @property
    def owner_id(self): return self.data.owner_id
    
    def _validate(self) -> None:
        """Validate property data."""
        if not self.data.title or not str(self.data.title).strip():
            raise ValueError("Title is required and cannot be empty")

    def to_dict(self, include_location: bool = True, is_owner: bool = False) -> Dict[str, Any]:
        """Convert property to dictionary."""
        d = self.data
        c = d.characteristics
        addr = d.address
        
        # Display Address Logic (Always Public for Preview)
        display_str = ""
        if d.show_exact_address and addr.private:
            display_str = addr.private
        elif addr.public:
            display_str = addr.public
        else:
            display_str = "Location Protected"

        # Privacy Filter for Address Object
        addr_dict = {
            "private": addr.private,
            "public": addr.public,
            "state": addr.state,
            "city": addr.city,
            "location": addr.location
        }
        
        if not is_owner:
            if d.show_exact_address:
                addr_dict["public"] = addr.private
            
            addr_dict["private"] = None
            if not include_location:
                 addr_dict["location"] = None
        
        # Stats Dictionary
        characteristics_dict = {
            "bedrooms": c.bedrooms,
            "bathrooms": c.bathrooms,
            "suites": c.suites,
            "rooms": c.rooms,
            "garages": c.garages,
            "area": c.area,
            "total_area": c.total_area,
            "area_unit": c.area_unit,
            "total_area_unit": c.total_area_unit
        }
        
        # Base Dict
        export = {
            "id": d.id,
            "title": d.title,
            "description": d.description,
            "price": d.price,
            "sale_price": d.sale_price,
            "rent_price": d.rent_price,
            "vacation_price": d.vacation_price,
            "launch_price": d.launch_price,
            "property_type": d.property_type,
            "listing_type": d.listing_type,
            "status": d.status,
            "favorite_count": d.favorite_count,
            
            # Sub-category characteristics (Stats)
            "characteristics": characteristics_dict,
            
            # Features (Extras)
            "features": {k: v for k, v in d.features.items() if k not in INTERNAL_KEYS},
            "amenities": [a for a in d.amenities if a not in INTERNAL_KEYS] if d.amenities else [k for k, v in d.features.items() if v and k not in INTERNAL_KEYS],
            
            "images": d.images,
            "layout_image": d.layout_image,
            "address": addr_dict,
            "display_address": display_str,
            "currency": d.currency,
            "rent_period": d.rent_period,
            "vacation_period": d.vacation_period,
            "annual_fee": d.annual_fee,
            "annual_fee_label": d.annual_fee_label,
            "condo_fee": d.condo_fee,
            "owner_id": d.owner_id,
            "friendly_id": d.friendly_id,
            "show_exact_address": d.show_exact_address,
            "created_at": None,
            "searchSnippet": d.search_snippet,
            "microThumbUrls": d.micro_thumb_urls
        }

        # Date serialization
        if d.created_at:
            if hasattr(d.created_at, 'isoformat'):
                export["created_at"] = d.created_at.isoformat()
            else:
                export["created_at"] = str(d.created_at)
                
        return export

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Property':
        """Create a property from dictionary."""
        # 1. Parse Characteristics (Stats)
        # Check top level or 'characteristics' dict (legacy mixed bag)
        raw_chars = data.get("characteristics", {})
        raw_features = data.get("features", {}) # New field
        
        def get_stat(key, default=0):
            # 1. Try explicit new structure (data.characteristics not passed usually, data is flattened JSON)
            # 2. Try top level key
            # 3. Try inside 'characteristics' (legacy)
            return data.get(key) or raw_chars.get(key) or default

        stats = PropertyCharacteristics(
            bedrooms=int(get_stat("bedrooms")),
            bathrooms=int(get_stat("bathrooms")),
            suites=int(get_stat("suites")),
            rooms=int(get_stat("rooms")),
            garages=int(get_stat("garages")),
            area=float(get_stat("area", 0.0)),
            total_area=float(get_stat("total_area") or get_stat("total") or 0.0),
            area_unit=data.get("area_unit") or raw_chars.get("area_unit") or "m2",
            total_area_unit=data.get("total_area_unit") or raw_chars.get("total_area_unit") or data.get("area_unit") or raw_chars.get("area_unit") or "m2"
        )

        # 2. Parse Features (Extras)
        # If 'features' exists, use it. Else extract from 'characteristics' excluding stats.
        if raw_features:
            features = {k: v for k, v in raw_features.items() if (k not in INTERNAL_KEYS and isinstance(v, bool))}
        else:
            features = {k: v for k, v in raw_chars.items() if (k not in INTERNAL_KEYS and isinstance(v, bool))}
        
        # New amenities list (ordered)
        amenities = data.get("amenities")
        if isinstance(amenities, list):
            # Filter specifically for the problematic keys
            amenities = [a for a in amenities if a not in INTERNAL_KEYS]
        
        if not amenities and features:
            amenities = [k for k, v in features.items() if v]
        if not amenities:
            amenities = []
        
        # 3. Parse Address
        # Check 'address' dict (new layout) or legacy flat fields
        if "address" in data and isinstance(data["address"], dict):
            a_data = data["address"]
            addr = PropertyAddress(
                private=a_data.get("private", ""),
                public=a_data.get("public", ""),
                state=a_data.get("state") or data.get("state", ""),
                city=a_data.get("city") or data.get("city", ""),
                location=a_data.get("location")
            )
        else:
            # Migration
            addr = PropertyAddress(
                private=data.get("private_address") or data.get("address") or "",
                public=data.get("public_address", ""),
                state=data.get("state", ""),
                city=data.get("city", ""),
                location=data.get("location")
            )

        # Parse Prices with safety for empty strings
        def safe_float(val):
            if val is None or (isinstance(val, str) and not val.strip()):
                return None
            try:
                return float(val)
            except (ValueError, TypeError):
                return None

        sale_price = safe_float(data.get("sale_price"))
        rent_price = safe_float(data.get("rent_price"))
        vacation_price = safe_float(data.get("vacation_price"))
        launch_price = safe_float(data.get("launch_price"))
        
        # Primary price logic based on listing_type
        listing_type = data.get("listing_type", "sale")
        price = safe_float(data.get("price")) or 0.0
        
        if listing_type in ["sale", "both", "sale_rent"] and sale_price is not None:
            price = sale_price
        elif listing_type == "rent" and rent_price is not None:
            price = rent_price
        elif listing_type == "vacation" and vacation_price is not None:
            price = vacation_price
        elif listing_type == "launch" and launch_price is not None:
            price = launch_price

        # Prepare IDs
        prop_id = data.get("id")
        is_new = not prop_id or prop_id == "new"
        
        # Only generate friendly_id for truly NEW properties
        friendly_id = data.get("friendly_id", "")
        if not friendly_id and is_new:
            friendly_id = generate_friendly_id()

        # Fee logic enforcement
        rent_period = data.get("rent_period", "month")
        annual_fee = safe_float(data.get("annual_fee", 0.0)) or 0.0
        condo_fee = safe_float(data.get("condo_fee", 0.0)) or 0.0
        
        # If listing doesn't have rent or period is too short (day/week), fees are not applicable
        if listing_type not in ["rent", "both", "sale_rent"] or rent_period in ["day", "week"]:
            annual_fee = 0.0
            condo_fee = 0.0

        prop_data = PropertyData(
            id=prop_id if prop_id and prop_id != "new" else str(uuid.uuid4()),
            friendly_id=friendly_id,
            title=data.get("title", ""),
            description=data.get("description", ""),
            price=price,
            sale_price=sale_price,
            rent_price=rent_price,
            vacation_price=vacation_price,
            launch_price=launch_price,
            property_type=data.get("property_type", "house"),
            listing_type=listing_type,
            status=data.get("status", "available"),
            currency=data.get("currency", "BRL"),
            rent_period=rent_period,
            vacation_period=data.get("vacation_period", "day"),
            annual_fee=annual_fee,
            annual_fee_label=data.get("annual_fee_label", "iptu"),
            condo_fee=condo_fee,
            favorite_count=int(data.get("favorite_count", 0)),
            characteristics=stats,
            address=addr,
            features=features,
            amenities=amenities,
            images=data.get("images", []),
            layout_image=data.get("layout_image"),
            owner_id=data.get("owner_id", ""),
            show_exact_address=data.get("show_exact_address", False),
            created_at=data.get("created_at"),
            search_snippet=data.get("searchSnippet", {}),
            micro_thumb_urls=data.get("microThumbUrls", [])
        )
        return cls(prop_data)

class PropertyManager:
    """Manager for property operations."""

    COLLECTION = "announcements"

    def __init__(self) -> None:
        """Initialize PropertyManager."""
        self.db = Database()

    def get_all_announcements(self, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Get all property announcements with optional filtering.
        """
        query = self.db.collection(self.COLLECTION)
        
        if not filters:
            filters = {}

        # 1. Apply BASIC Equality Filters in Firestore (Fast & Index-safe)
        if filters.get("property_type") and filters["property_type"] != "all":
            query = query.where("property_type", "==", filters["property_type"])
        
        if filters.get("listing_type") and filters["listing_type"] != "all":
            query = query.where("listing_type", "==", filters["listing_type"])

        if filters.get("state") and filters["state"] != "all":
            query = query.where("address.state", "==", filters["state"])
            
        if filters.get("city") and filters["city"] != "all":
            query = query.where("address.city", "==", filters["city"])

        # 2. Fetch a batch to handle complex filters and sorting in hardware/memory
        # We fetch up to 1000 items (reasonable for Firestore and memory)
        # We don't use Firestore sorting/inequality here to avoid "Index Needed" errors.
        docs = query.limit(1000).get()
        results = []
        
        search_query = filters.get("search", "").lower()
        limit_val = int(filters.get("limit", 20))
        
        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id # Ensure ID is present
            
            # 3. In-Memory Filtering
            # Search
            if search_query:
                title = data.get("title", "").lower()
                desc = data.get("description", "").lower()
                addr = data.get("display_address", "").lower()
                fid = data.get("friendly_id", "").lower()
                if search_query not in title and search_query not in desc and search_query not in addr and search_query not in fid:
                    continue

            # Price Range
            price = float(data.get("price", 0))
            if filters.get("min_price") and price < float(filters["min_price"]): continue
            if filters.get("max_price") and price > float(filters["max_price"]): continue

            # Area Range
            area = float(data.get("characteristics", {}).get("area", 0))
            if filters.get("min_area") and area < float(filters["min_area"]): continue
            if filters.get("max_area") and area > float(filters["max_area"]): continue

            # Bed/Bath/etc.
            chars = data.get("characteristics", {})
            if filters.get("bedrooms") and int(chars.get("bedrooms", 0)) < int(filters["bedrooms"]): continue
            if filters.get("bathrooms") and int(chars.get("bathrooms", 0)) < int(filters["bathrooms"]): continue
            if filters.get("suites") and int(chars.get("suites", 0)) < int(filters["suites"]): continue
            if filters.get("garages") and int(chars.get("garages", 0)) < int(filters["garages"]): continue

            # Amenities
            requested_amenities = filters.get("amenities", [])
            if isinstance(requested_amenities, str):
                requested_amenities = [a.strip() for a in requested_amenities.split(",") if a.strip()]
            
            if requested_amenities:
                prop_amenities = data.get("amenities", [])
                if not all(item in prop_amenities for item in requested_amenities):
                    continue

            results.append(data)

        # 4. Sorting logic (In-Memory)
        sort_by = filters.get("sort_by", "newest")
        
        def get_sort_key(item):
            try:
                if sort_by.startswith("price"):
                    # Handle both full objects and snippets
                    price = item.get("price")
                    if price is None:
                        # Fallback for snippets if not at top level
                        price = item.get("searchSnippet", {}).get("price", 0)
                    return float(price or 0)
                
                # Dates
                dt = item.get("created_at")
                if dt is None: return 0.0
                if hasattr(dt, 'timestamp'): return float(dt.timestamp())
                if isinstance(dt, (int, float)): return float(dt)
                return 0.0
            except Exception:
                return 0.0

        is_reverse = sort_by in ["newest", "price_desc"]
        results.sort(key=get_sort_key, reverse=is_reverse)

        # 5. Pagination (Limit and Offset)
        # Note: True pagination with start_after is harder in-memory, 
        # but for this scale we can just slice.
        start_index = 0
        if filters.get("start_after"):
            for i, res in enumerate(results):
                if res["id"] == filters["start_after"]:
                    start_index = i + 1
                    break
        
        paginated_results = results[start_index : start_index + limit_val]
        
        # 6. Snippet conversion
        final_results = []
        snippet_only = filters.get("snippet_only", "false").lower() == "true"
        
        for data in paginated_results:
            try:
                if snippet_only:
                    snippet = data.get("searchSnippet")
                    if not snippet:
                        # Fallback construction
                        price = data.get("price", 0)
                        images = data.get("images", [])
                        first_image = images[0] if images else None
                        snippet = {
                            "id": data["id"],
                            "title": data.get("title", ""),
                            "price": price,
                            "currency": data.get("currency", "BRL"),
                            "listing_type": data.get("listing_type", "sale"),
                            "property_type": data.get("property_type", "apartment"),
                            "status": data.get("status", "available"),
                            "first_image": first_image,
                            "short_desc": (data.get("description") or "")[:100],
                            "microThumbUrls": data.get("microThumbUrls", []),
                            "characteristics": data.get("characteristics", {}),
                            "display_address": data.get("display_address", ""),
                            "friendly_id": data.get("friendly_id", ""),
                            "created_at": data.get("created_at") if not hasattr(data.get("created_at"), "isoformat") else data.get("created_at").isoformat(),
                            "favorite_count": data.get("favorite_count", 0),
                            "owner_id": data.get("owner_id")
                        }
                    final_results.append(snippet)
                else:
                    prop = Property.from_dict(data)
                    final_results.append(prop.to_dict(include_location=False))
            except Exception as e:
                print(f"[ERROR] Skipping corrupt property {data.get('id')}: {e}")
                continue
        
        return final_results

    def get_announcement(self, property_id: str) -> Optional[Property]:
        """Get a specific announcement."""
        doc = self.db.collection(self.COLLECTION).document(property_id).get()
        if doc.exists:
            return Property.from_dict(doc.to_dict())
        return None

    def create_announcement(self, property_data: Property) -> str:
        """Create a new announcement."""
        # Ensure ID is a UUID (catch 'new' from frontend)
        if property_data.id == "new":
             property_data.data.id = str(uuid.uuid4())

        # Uniqueness check for friendly_id (statistical fallback)
        existing_friendly = self.db.collection(self.COLLECTION).where("friendly_id", "==", property_data.data.friendly_id).get()
        if len(existing_friendly) > 0:
            property_data.data.friendly_id = generate_friendly_id()
            return self.create_announcement(property_data)

        # Always save full data to DB (is_owner=True)
        data = property_data.to_dict(include_location=True, is_owner=True)
        data["created_at"] = self.db.SERVER_TIMESTAMP
        print(f"[DEBUG] Saving NEW announcement {property_data.id} ({property_data.data.friendly_id})")
        self.db.collection(self.COLLECTION).document(property_data.id).set(data)
        return property_data.id

    def update_announcement(self, property_id: str, data: Dict[str, Any]) -> bool:
        """Update an existing announcement."""
        # Pass through model to ensure consistency and sanitization
        existing_doc = self.db.collection(self.COLLECTION).document(property_id).get()
        if not existing_doc.exists:
            return False
            
        merged_data = existing_doc.to_dict()
        merged_data.update(data)
        
        property_obj = Property.from_dict(merged_data)
        # Always save full data to DB (is_owner=True)
        final_data = property_obj.to_dict(include_location=True, is_owner=True)
        
        self.db.collection(self.COLLECTION).document(property_id).update(final_data)
        return True

    def delete_announcement(self, property_id: str) -> bool:
        """Delete an announcement."""
        self.db.collection(self.COLLECTION).document(property_id).delete()
        return True

    def get_user_announcements(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all announcements made by a specific user."""
        docs = self.db.collection(self.COLLECTION).where("owner_id", "==", user_id).get()
        # Owner calling their own announcements -> is_owner=True
        return [Property.from_dict(doc.to_dict()).to_dict(include_location=True, is_owner=True) for doc in docs]
