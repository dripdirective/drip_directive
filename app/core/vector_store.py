"""
Vector store abstraction layer.
Supports ChromaDB (local testing) and pgvector (production).
"""
import json
import os
from typing import List, Optional, Tuple, Dict
from abc import ABC, abstractmethod

from app.config import settings


class VectorStore(ABC):
    """Abstract base class for vector stores"""
    
    @abstractmethod
    def add_user_profile(self, user_id: int, user_email: str, embedding: List[float], metadata: dict):
        """Store user profile embedding"""
        pass
    
    @abstractmethod
    def add_wardrobe_item(self, item_id: int, user_email: str, embedding: List[float], metadata: dict):
        """Store wardrobe item embedding"""
        pass
    
    @abstractmethod
    def add_recommendation(self, rec_id: int, user_email: str, embedding: List[float], metadata: dict):
        """Store recommendation embedding"""
        pass
    
    @abstractmethod
    def search_wardrobe_items(
        self, 
        user_id: int, 
        user_email: str,
        query_embedding: List[float], 
        limit: int = 20,
        exclude_ids: Optional[List[int]] = None
    ) -> List[Tuple[int, float]]:
        """Search wardrobe items by similarity. Returns [(item_id, similarity_score), ...]"""
        pass
    
    @abstractmethod
    def get_recent_recommendations(
        self, 
        user_id: int,
        user_email: str,
        limit: int = 5
    ) -> List[Tuple[int, List[float]]]:
        """Get recent recommendation embeddings. Returns [(rec_id, embedding), ...]"""
        pass


class ChromaDBVectorStore(VectorStore):
    """ChromaDB implementation - perfect for local testing"""
    
    def __init__(self):
        try:
            import chromadb
            from chromadb.config import Settings as ChromaSettings
            
            # Initialize ChromaDB client
            try:
                # For newer ChromaDB versions (0.4.0+)
                self.client = chromadb.PersistentClient(
                    path=settings.CHROMADB_PATH,
                    settings=ChromaSettings(anonymized_telemetry=False)
                )
            except AttributeError:
                # Fallback for older versions
                self.client = chromadb.Client(ChromaSettings(
                    persist_directory=settings.CHROMADB_PATH,
                    anonymized_telemetry=False
                ))
            
            print(f"✓ ChromaDB initialized at {settings.CHROMADB_PATH}")
            
        except ImportError:
            raise ImportError(
                "ChromaDB is not installed. Install it with: pip install chromadb"
            )
            
    def _get_collection(self, user_email: str, collection_type: str):
        """Get or create a collection for a specific user"""
        prefix = settings.CHROMADB_COLLECTION_PREFIX
        # Remove suffix from email (everything after @)
        user_prefix = user_email.split('@')[0] if user_email else "default"
        # Sanitize for ChromaDB name requirements (alphanumeric, underscores, hyphens)
        user_prefix = "".join(c if c.isalnum() or c in "_-" else "_" for c in user_prefix)
        
        collection_name = f"{prefix}_{user_prefix}_{collection_type}"
        
        # print(f"   Getting collection: {collection_name}")
        return self.client.get_or_create_collection(
            name=collection_name,
            metadata={"description": f"{collection_type} embeddings for {user_email}"}
        )
    
    def add_user_profile(self, user_id: int, user_email: str, embedding: List[float], metadata: dict):
        """Store user profile embedding in ChromaDB"""
        collection = self._get_collection(user_email, "user_profiles")
        collection.upsert(
            ids=[f"user_{user_id}"],
            embeddings=[embedding],
            metadatas=[{
                "user_id": user_id,
                **metadata
            }]
        )
    
    def add_wardrobe_item(self, item_id: int, user_email: str, embedding: List[float], metadata: dict):
        """Store wardrobe item embedding in ChromaDB"""
        collection = self._get_collection(user_email, "wardrobe_items")
        
        # Store richer metadata for better debugging and inspection
        chroma_metadata = {
            "item_id": item_id,
            "user_id": metadata.get("user_id"),
            "dress_type": metadata.get("dress_type", ""),
            "color": metadata.get("color", ""),
            "style": metadata.get("style", ""),
            "summary_text": metadata.get("summary_text", "")[:500],  # Increased from 100
            # Store comprehensive text snippet used for embedding
            "embedding_source": metadata.get("embedding_source_text", "")[:500]
        }
        
        # Add optional fields if present
        if metadata.get("occasions"):
            chroma_metadata["occasions"] = str(metadata["occasions"])[:100]
        if metadata.get("formality_level"):
            chroma_metadata["formality"] = str(metadata["formality_level"])
        if metadata.get("versatility_score"):
            chroma_metadata["versatility"] = str(metadata["versatility_score"])
        
        collection.upsert(
            ids=[f"item_{item_id}"],
            embeddings=[embedding],
            metadatas=[chroma_metadata]
        )
    
    def add_recommendation(self, rec_id: int, user_email: str, embedding: List[float], metadata: dict):
        """Store recommendation embedding in ChromaDB"""
        collection = self._get_collection(user_email, "recommendations")
        collection.upsert(
            ids=[f"rec_{rec_id}"],
            embeddings=[embedding],
            metadatas=[{
                "rec_id": rec_id,
                "user_id": metadata.get("user_id"),
                "query": metadata.get("query", "")[:500],
                "created_at": metadata.get("created_at", "")
            }]
        )
    
    def search_wardrobe_items(
        self, 
        user_id: int, 
        user_email: str,
        query_embedding: List[float], 
        limit: int = 20,
        exclude_ids: Optional[List[int]] = None
    ) -> List[Tuple[int, float]]:
        """Search wardrobe items by similarity"""
        collection = self._get_collection(user_email, "wardrobe_items")
        
        # Check if collection is empty
        if collection.count() == 0:
            return []

        # Query ChromaDB
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=min(limit + len(exclude_ids or []), collection.count()),
            # No need for where clause on user_id since collection is user-specific
        )
        
        # Parse results
        items = []
        if results and results['ids'] and len(results['ids']) > 0:
            ids = results['ids'][0]
            distances = results['distances'][0]
            metadatas = results['metadatas'][0]
            
            for i, (id_str, distance, metadata) in enumerate(zip(ids, distances, metadatas)):
                # Extract item_id from "item_{id}"
                try:
                    item_id = int(id_str.split('_')[1])
                except (IndexError, ValueError):
                    continue
                
                # Skip excluded items
                if exclude_ids and item_id in exclude_ids:
                    continue
                
                # Convert distance to similarity (ChromaDB uses L2 distance)
                # For normalized vectors: similarity = 1 - (distance^2 / 4)
                similarity = max(0.0, 1.0 - (distance ** 2 / 4))
                
                items.append((item_id, similarity))
                
                if len(items) >= limit:
                    break
        
        return items
    
    def get_recent_recommendations(
        self, 
        user_id: int, 
        user_email: str,
        limit: int = 5
    ) -> List[Tuple[int, List[float]]]:
        """Get recent recommendation embeddings"""
        collection = self._get_collection(user_email, "recommendations")
        
        if collection.count() == 0:
            return []

        # Get all recommendations (or a reasonable limit)
        results = collection.get(
            include=["embeddings", "metadatas"],
            limit=50  # Get recent ones (assuming roughly inserted in order or just grab enough)
        )
        
        recommendations = []
        if results and results['ids']:
            # Sort by created_at if available, else usage original order
            # Since get() doesn't guarantee order, we rely on caller to filter/sort if needed
            # But here we just return them for MMR
            for i, (id_str, embedding) in enumerate(zip(results['ids'], results['embeddings'])):
                try:
                    rec_id = int(id_str.split('_')[1])
                    recommendations.append((rec_id, embedding))
                except (IndexError, ValueError):
                    continue
        
        # Return recent
        return recommendations[:limit]


class DummyVectorStore(VectorStore):
    """Dummy implementation when vector store is disabled"""
    
    def __init__(self):
        print("⚠️  Vector store disabled (VECTOR_STORE=none)")
    
    def add_user_profile(self, user_id: int, user_email: str, embedding: List[float], metadata: dict):
        pass
    
    def add_wardrobe_item(self, item_id: int, user_email: str, embedding: List[float], metadata: dict):
        pass
    
    def add_recommendation(self, rec_id: int, user_email: str, embedding: List[float], metadata: dict):
        pass
    
    def search_wardrobe_items(
        self, 
        user_id: int, 
        user_email: str,
        query_embedding: List[float], 
        limit: int = 20,
        exclude_ids: Optional[List[int]] = None
    ) -> List[Tuple[int, float]]:
        return []
    
    def get_recent_recommendations(
        self, 
        user_id: int, 
        user_email: str,
        limit: int = 5
    ) -> List[Tuple[int, List[float]]]:
        return []


# Factory function to get the appropriate vector store
_vector_store_instance = None

def get_vector_store() -> VectorStore:
    """Get or create vector store instance based on settings"""
    global _vector_store_instance
    
    if _vector_store_instance is not None:
        return _vector_store_instance
    
    vector_store_type = settings.VECTOR_STORE.lower()
    
    if vector_store_type == "chromadb":
        _vector_store_instance = ChromaDBVectorStore()
    elif vector_store_type == "pgvector":
        # For now, fall back to dummy (pgvector will be implemented for production)
        print("⚠️  pgvector not yet implemented, using dummy store")
        _vector_store_instance = DummyVectorStore()
    elif vector_store_type == "none":
        _vector_store_instance = DummyVectorStore()
    else:
        print(f"⚠️  Unknown VECTOR_STORE: {vector_store_type}, using dummy")
        _vector_store_instance = DummyVectorStore()
    
    return _vector_store_instance
