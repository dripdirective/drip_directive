"""
Vector search utilities for semantic recommendations.

Supports both SQLite (with JSON embeddings) and Postgres (with pgvector).
"""
import json
import math
from typing import List, Dict, Optional, Tuple
from sqlalchemy.orm import Session

from app.models import WardrobeItem, Recommendation, ProcessingStatus


def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """Calculate cosine similarity between two vectors"""
    if not vec1 or not vec2 or len(vec1) != len(vec2):
        return 0.0
    
    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    magnitude1 = math.sqrt(sum(a * a for a in vec1))
    magnitude2 = math.sqrt(sum(b * b for b in vec2))
    
    if magnitude1 == 0 or magnitude2 == 0:
        return 0.0
    
    return dot_product / (magnitude1 * magnitude2)


def parse_embedding(embedding_str: Optional[str]) -> Optional[List[float]]:
    """Parse embedding from JSON string"""
    if not embedding_str:
        return None
    try:
        return json.loads(embedding_str)
    except (json.JSONDecodeError, TypeError):
        return None


def vector_search_wardrobe_items(
    db: Session,
    user_id: int,
    query_embedding: List[float],
    limit: int = 20,
    exclude_ids: Optional[List[int]] = None,
    min_similarity: float = 0.0
) -> List[Tuple[WardrobeItem, float]]:
    """
    Search wardrobe items using vector similarity.
    
    Returns list of (item, similarity_score) tuples, sorted by similarity descending.
    """
    # Get all processed wardrobe items for user
    query = db.query(WardrobeItem).filter(
        WardrobeItem.user_id == user_id,
        WardrobeItem.processing_status == ProcessingStatus.COMPLETED,
        WardrobeItem.item_embedding.isnot(None)  # Only items with embeddings
    )
    
    if exclude_ids:
        query = query.filter(~WardrobeItem.id.in_(exclude_ids))
    
    items = query.all()
    
    # Calculate similarity for each item
    results = []
    for item in items:
        item_embedding = parse_embedding(item.item_embedding)
        if item_embedding:
            similarity = cosine_similarity(query_embedding, item_embedding)
            if similarity >= min_similarity:
                results.append((item, similarity))
    
    # Sort by similarity descending
    results.sort(key=lambda x: x[1], reverse=True)
    
    return results[:limit]


def apply_mmr(
    candidates: List[Tuple[WardrobeItem, float]],
    query_embedding: List[float],
    recent_embeddings: List[str],
    k: int = 20,
    lambda_param: float = 0.7
) -> List[Tuple[WardrobeItem, float]]:
    """
    Apply Maximal Marginal Relevance for diversity.
    
    Args:
        candidates: List of (item, similarity) from initial retrieval
        query_embedding: The query vector
        recent_embeddings: Recent recommendation embeddings to diversify against
        k: Number of items to select
        lambda_param: Balance between relevance (1.0) and diversity (0.0)
    
    Returns:
        Selected diverse items
    """
    if not candidates:
        return []
    
    # Parse recent embeddings
    recent_vecs = []
    for emb_str in recent_embeddings:
        vec = parse_embedding(emb_str)
        if vec:
            recent_vecs.append(vec)
    
    selected = []
    remaining = list(candidates)
    
    while remaining and len(selected) < k:
        best_score = -1
        best_idx = 0
        
        for idx, (item, relevance) in enumerate(remaining):
            item_vec = parse_embedding(item.item_embedding)
            if not item_vec:
                continue
            
            # Calculate max similarity to already selected items
            max_sim_selected = 0.0
            for selected_item, _ in selected:
                selected_vec = parse_embedding(selected_item.item_embedding)
                if selected_vec:
                    sim = cosine_similarity(item_vec, selected_vec)
                    max_sim_selected = max(max_sim_selected, sim)
            
            # Calculate max similarity to recent recommendations
            max_sim_recent = 0.0
            for recent_vec in recent_vecs:
                sim = cosine_similarity(item_vec, recent_vec)
                max_sim_recent = max(max_sim_recent, sim)
            
            # MMR score: balance relevance and diversity
            diversity_penalty = max(max_sim_selected, max_sim_recent)
            mmr_score = lambda_param * relevance - (1 - lambda_param) * diversity_penalty
            
            if mmr_score > best_score:
                best_score = mmr_score
                best_idx = idx
        
        # Add best item to selected
        selected.append(remaining.pop(best_idx))
    
    return selected


def get_recent_recommendation_embeddings(
    db: Session,
    user_id: int,
    limit: int = 5
) -> List[str]:
    """Get embeddings from recent recommendations for diversity"""
    recent_recs = db.query(Recommendation).filter(
        Recommendation.user_id == user_id,
        Recommendation.recommendation_embedding.isnot(None)
    ).order_by(Recommendation.created_at.desc()).limit(limit).all()
    
    return [rec.recommendation_embedding for rec in recent_recs if rec.recommendation_embedding]


def get_recently_used_item_ids(
    db: Session,
    user_id: int,
    num_recommendations: int = 3,
    max_items: int = 15
) -> List[int]:
    """Get wardrobe item IDs used in recent recommendations"""
    recent_recs = db.query(Recommendation).filter(
        Recommendation.user_id == user_id
    ).order_by(Recommendation.created_at.desc()).limit(num_recommendations).all()
    
    used_ids = set()
    for rec in recent_recs:
        if rec.wardrobe_item_ids:
            try:
                item_id_lists = json.loads(rec.wardrobe_item_ids)
                for outfit_ids in item_id_lists:
                    if isinstance(outfit_ids, list):
                        used_ids.update(outfit_ids)
            except (json.JSONDecodeError, TypeError):
                pass
    
    return list(used_ids)[:max_items]


def create_recommendation_embedding(
    query: str,
    outfit_descriptions: List[str],
    item_ids: List[int]
) -> str:
    """
    Create a combined text representation of a recommendation for embedding.
    
    This will be embedded and stored for future diversity comparisons.
    """
    text_parts = [
        f"Query: {query}",
        "Outfits recommended:",
        *outfit_descriptions,
        f"Items used: {', '.join(map(str, item_ids))}"
    ]
    return " | ".join(text_parts)

