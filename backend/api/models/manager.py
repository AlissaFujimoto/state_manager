"""
    file: manager.py
    brief: Property and Category models for State Manager
"""
# Standard library imports
import uuid
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field

# Local imports
from server_utils.database import Database

@dataclass
class PropertyAddress:
    private: str = ""
    public: str = ""
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

@dataclass
class PropertyData:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    title: str = ""
    description: str = ""
    price: float = 0.0
    property_type: str = "house"
    listing_type: str = "sale"
    status: str = "available"
    
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
        if addr.public:
            display_str = addr.public
        else:
            display_str = "Location Protected"

        # Privacy Filter for Address Object
        addr_dict = {
            "private": addr.private,
            "public": addr.public,
            "location": addr.location
        }
        
        if not is_owner:
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
            "total_area": c.total_area
        }
        
        # Base Dict
        export = {
            "id": d.id,
            "title": d.title,
            "description": d.description,
            "price": d.price,
            "property_type": d.property_type,
            "listing_type": d.listing_type,
            "status": d.status,
            
            # Sub-category characteristics (Stats)
            "characteristics": characteristics_dict,
            
            # Features (Extras)
            "features": d.features,
            "amenities": d.amenities if d.amenities else [k for k, v in d.features.items() if v],
            
            "images": d.images,
            "layout_image": d.layout_image,
            "address": addr_dict,
            "display_address": display_str,
            "location": addr_dict["location"],
            "owner_id": d.owner_id,
            "created_at": None
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
            total_area=float(get_stat("total_area") or get_stat("total") or 0.0)
        )

        # 2. Parse Features (Extras)
        # If 'features' exists, use it. Else extract from 'characteristics' excluding stats.
        if raw_features:
            features = raw_features
        else:
            stats_keys = {"bedrooms", "bathrooms", "suites", "rooms", "garages", "area", "total", "total_area"}
            features = {k: v for k, v in raw_chars.items() if k not in stats_keys}
        
        # New amenities list (ordered)
        amenities = data.get("amenities")
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
                location=a_data.get("location")
            )
        else:
            # Migration
            addr = PropertyAddress(
                private=data.get("private_address") or data.get("address") or "",
                public=data.get("public_address", ""),
                location=data.get("location")
            )

        prop_data = PropertyData(
            id=data.get("id", str(uuid.uuid4())),
            title=data.get("title", ""),
            description=data.get("description", ""),
            price=float(data.get("price") or 0.0),
            property_type=data.get("property_type", "house"),
            listing_type=data.get("listing_type", "sale"),
            status=data.get("status", "available"),
            characteristics=stats,
            address=addr,
            features=features,
            amenities=amenities,
            images=data.get("images", []),
            layout_image=data.get("layout_image"),
            owner_id=data.get("owner_id", ""),
            created_at=data.get("created_at")
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

        Args:
            filters (dict, optional): Filtering criteria. Defaults to None.

        Returns:
            list: List of property dictionaries.
        """
        query = self.db.collection(self.COLLECTION)
        
        if filters:
            if "type" in filters:
                query = query.where("property_type", "==", filters["type"])
            if "listing_type" in filters:
                query = query.where("listing_type", "==", filters["listing_type"])
            if "min_price" in filters:
                query = query.where("price", ">=", float(filters["min_price"]))
            if "max_price" in filters:
                query = query.where("price", "<=", float(filters["max_price"]))
            # Add more filters as needed (bedrooms, etc.)

        docs = query.get()
        results = []
        for doc in docs:
            try:
                # Safely attempt to convert each document
                prop = Property.from_dict(doc.to_dict())
                results.append(prop.to_dict(include_location=False))
            except Exception as e:
                # Log bad document but don't crash the endpoint
                print(f"[ERROR] Skipping corrupt property {doc.id}: {e}")
                continue
        return results

    def get_announcement(self, property_id: str) -> Optional[Property]:
        """Get a specific announcement."""
        doc = self.db.collection(self.COLLECTION).document(property_id).get()
        if doc.exists:
            return Property.from_dict(doc.to_dict())
        return None

    def create_announcement(self, property_data: Property) -> str:
        """Create a new announcement."""
        # Always save full data to DB (is_owner=True)
        data = property_data.to_dict(include_location=True, is_owner=True)
        data["created_at"] = self.db.SERVER_TIMESTAMP
        print(f"[DEBUG] Saving NEW announcement {property_data.id} with address: {data.get('address')}")
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
