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
        property_type: str,  # house, apartment, etc.
        characteristics: Dict[str, Any],
        images: List[str],
        layout_image: Optional[str] = None,
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
        self.owner_id = owner_id
        self.created_at = created_at

    def to_dict(self) -> Dict[str, Any]:
        """Convert property to dictionary."""
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "price": self.price,
            "property_type": self.property_type,
            "characteristics": self.characteristics,
            "images": self.images,
            "layout_image": self.layout_image,
            "owner_id": self.owner_id,
            "created_at": self.created_at
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Property':
        """Create a property from dictionary."""
        return cls(
            id=data.get("id", str(uuid.uuid4())),
            title=data.get("title", ""),
            description=data.get("description", ""),
            price=data.get("price", 0.0),
            property_type=data.get("property_type", "house"),
            characteristics=data.get("characteristics", {}),
            images=data.get("images", []),
            layout_image=data.get("layout_image"),
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
        return [doc.to_dict() for doc in docs]

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
        self.db.collection(self.COLLECTION).document(property_data.id).set(data)
        return property_data.id

    def update_announcement(self, property_id: str, data: Dict[str, Any]) -> bool:
        """Update an existing announcement."""
        self.db.collection(self.COLLECTION).document(property_id).update(data)
        return True

    def delete_announcement(self, property_id: str) -> bool:
        """Delete an announcement."""
        self.db.collection(self.COLLECTION).document(property_id).delete()
        return True

    def get_user_announcements(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all announcements made by a specific user."""
        docs = self.db.collection(self.COLLECTION).where("owner_id", "==", user_id).get()
        return [doc.to_dict() for doc in docs]
