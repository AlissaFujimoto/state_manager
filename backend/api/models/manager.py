"""
    file: manager.py
    brief: Property and Category models for State Manager
"""
# Standard library imports
import uuid
from typing import Any, Dict, List, Optional

# Local imports
from server_utils.database import Database

class Property:
    """Class representing a property announcement."""

    def __init__(
        self,
        id: str,
        title: str,
        description: str,
        price: float,
        property_type: str,
        characteristics: Dict[str, Any],
        images: List[str],
        layout_image: Optional[str] = None,
        suites: int = 0,
        rooms: int = 0,
        garages: int = 0,
        location: Optional[Dict[str, float]] = None,
        address: str = "",
        owner_id: str = "",
        created_at: Any = None
    ) -> None:
        """
        Initialize a property.

        Args:
            id (str): Unique ID.
            title (str): Announcement title.
            description (str): Property description.
            price (float): Rental or sale price.
            property_type (str): Type of property.
            characteristics (dict): Dictionary of features (bedrooms, bathrooms, area, etc.).
            images (list): List of image URLs.
            layout_image (str, optional): URL for the building layout. Defaults to None.
            owner_id (str): Firebase UID of the owner.
            created_at (Any): Timestamp of creation.
        """
        self.id = id
        self.title = title
        self.description = description
        self.price = price
        self.property_type = property_type
        self.characteristics = characteristics
        self.images = images
        self.layout_image = layout_image
        self.suites = suites
        self.rooms = rooms
        self.garages = garages
        self.location = location
        self.address = address
        self.owner_id = owner_id
        self.created_at = created_at
        self._validate()

    def _validate(self) -> None:
        """Validate property data."""
        # Fields to check for non-negative values
        fields_to_check = {
            "price": self.price,
            "suites": self.suites,
            "rooms": self.rooms,
            "garages": self.garages
        }
        
        # Also check nested characteristics
        if self.characteristics:
            for field in ["bedrooms", "bathrooms", "area"]:
                val = self.characteristics.get(field)
                if val is not None:
                    try:
                        fields_to_check[field] = float(val)
                    except (ValueError, TypeError):
                        pass

        for name, value in fields_to_check.items():
            if value is not None:
                try:
                    if float(value) < 0:
                        raise ValueError(f"{name.capitalize()} cannot be negative")
                except (ValueError, TypeError):
                    continue

    def to_dict(self, include_location: bool = True) -> Dict[str, Any]:
        """Convert property to dictionary."""
        data = {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "price": self.price,
            "property_type": self.property_type,
            "characteristics": self.characteristics,
            "images": self.images,
            "layout_image": self.layout_image,
            "suites": self.suites,
            "rooms": self.rooms,
            "garages": self.garages,
            "address": self.address or "",
            "owner_id": self.owner_id
        }
        
        if include_location:
            data["location"] = self.location
        
        # Handle created_at serialization
        if self.created_at:
            if hasattr(self.created_at, 'isoformat'):
                data["created_at"] = self.created_at.isoformat()
            elif hasattr(self.created_at, 'to_datetime'):
                data["created_at"] = self.created_at.to_datetime().isoformat()
            else:
                data["created_at"] = str(self.created_at)
        else:
            data["created_at"] = None
            
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Property':
        """Create a property from dictionary."""
        # Get characteristics and ensure they are sanitized
        raw_chars = data.get("characteristics", {}).copy()
        
        # Extract fields that might be either top-level or nested in characteristics
        suites = int(data.get("suites") or raw_chars.pop("suites", 0) or 0)
        rooms = int(data.get("rooms") or raw_chars.pop("rooms", 0) or 0)
        garages = int(data.get("garages") or raw_chars.pop("garages", 0) or 0)
        
        # Build cleansed characteristics but preserve other potential fields
        characteristics = raw_chars.copy()
        characteristics.update({
            "bedrooms": int(raw_chars.get("bedrooms") or 0),
            "bathrooms": int(raw_chars.get("bathrooms") or 0),
            "area": float(raw_chars.get("area") or 0.0)
        })
        
        return cls(
            id=data.get("id", str(uuid.uuid4())),
            title=data.get("title", ""),
            description=data.get("description", ""),
            price=float(data.get("price") or 0.0),
            property_type=data.get("property_type", "house"),
            characteristics=characteristics,
            images=data.get("images", []),
            layout_image=data.get("layout_image"),
            suites=suites,
            rooms=rooms,
            garages=garages,
            location=data.get("location"),
            address=data.get("address") or data.get("zone") or "",
            owner_id=data.get("owner_id", ""),
            created_at=data.get("created_at")
        )

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
            if "min_price" in filters:
                query = query.where("price", ">=", float(filters["min_price"]))
            if "max_price" in filters:
                query = query.where("price", "<=", float(filters["max_price"]))
            # Add more filters as needed (bedrooms, etc.)

        docs = query.get()
        return [Property.from_dict(doc.to_dict()).to_dict(include_location=False) for doc in docs]

    def get_announcement(self, property_id: str) -> Optional[Property]:
        """Get a specific announcement."""
        doc = self.db.collection(self.COLLECTION).document(property_id).get()
        if doc.exists:
            return Property.from_dict(doc.to_dict())
        return None

    def create_announcement(self, property_data: Property) -> str:
        """Create a new announcement."""
        data = property_data.to_dict()
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
        final_data = property_obj.to_dict()
        
        self.db.collection(self.COLLECTION).document(property_id).update(final_data)
        return True

    def delete_announcement(self, property_id: str) -> bool:
        """Delete an announcement."""
        self.db.collection(self.COLLECTION).document(property_id).delete()
        return True

    def get_user_announcements(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all announcements made by a specific user."""
        docs = self.db.collection(self.COLLECTION).where("owner_id", "==", user_id).get()
        return [Property.from_dict(doc.to_dict()).to_dict(include_location=False) for doc in docs]
