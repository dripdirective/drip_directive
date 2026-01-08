"""
Recommendation business logic.
"""
import json
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import (
    User, UserImage, UserProfile, WardrobeItem, WardrobeImage, 
    Recommendation, ProcessingStatus
)
from app.ai_service import ai_service
from app.core.utils import parse_json_safe
from app.core.vector_search import (
    apply_mmr,
    get_recently_used_item_ids,
    create_recommendation_embedding
)
from app.core.vector_store import get_vector_store


async def generate_recommendation_task(
    user_id: int,
    query: str,
    recommendation_type: str
) -> None:
    """Background task to generate AI-powered outfit recommendations using vector search"""
    db = SessionLocal()
    try:
        print(f"\n🔄 Starting recommendation generation for user {user_id}")
        print(f"   Query: {query}")
        print(f"   Type: {recommendation_type}")
        
        # Get user and profile with AI analysis
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise Exception(f"User {user_id} not found")
        
        user_email = user.email
        
        user_profile = db.query(UserProfile).filter(
            UserProfile.user_id == user_id
        ).first()
        
        profile_data = {}
        profile_summary = ""
        if user_profile and user_profile.additional_info:
            profile_info = parse_json_safe(user_profile.additional_info)
            ai_analysis = profile_info.get("ai_profile_analysis", {})
            profile_data = ai_analysis.get("analysis", {})
            profile_summary = user_profile.profile_summary_text or ""
            print(f"   ✓ Loaded user AI profile")
        
        # Get user images (for potential try-on)
        user_images = db.query(UserImage).filter(
            UserImage.user_id == user_id,
            UserImage.processing_status == ProcessingStatus.COMPLETED
        ).all()
        
        user_image_path = None
        if user_images:
            user_image_path = user_images[0].image_path
            print(f"   ✓ Found {len(user_images)} user images")
        
        # Create query embedding for vector search
        query_context = f"{query}. User style: {profile_summary[:500] if profile_summary else 'General style'}"
        print(f"\n{'='*70}")
        print(f"🔍 CREATING QUERY EMBEDDING FOR VECTOR SEARCH")
        print(f"{'='*70}")
        print(f"   Query: {query}")
        print(f"   Context length: {len(query_context)} characters")
        print(f"   Context preview: {query_context[:200]}...")
        
        query_embedding_vec = await ai_service.generate_embedding(query_context)
        
        if query_embedding_vec:
            print(f"   ✓ Query embedding created: {len(query_embedding_vec)} dimensions")
            print(f"   📊 Embedding stats: min={min(query_embedding_vec):.4f}, max={max(query_embedding_vec):.4f}")
        else:
            print(f"   ✗ Failed to create query embedding")
        print(f"{'='*70}\n")
        
        wardrobe_data = []
        
        if query_embedding_vec:
            print(f"\n{'='*70}")
            print(f"🔍 VECTOR SEARCH IN CHROMADB")
            print(f"{'='*70}")
            print(f"   Collection: drip_directive_{user_email.split('@')[0]}_wardrobe_items")
            print(f"   Query embedding: {len(query_embedding_vec)} dimensions")
            
            # Get recently used items to exclude
            recently_used_ids = get_recently_used_item_ids(db, user_id, num_recommendations=3)
            print(f"   Excluding recently used: {len(recently_used_ids)} items")
            if recently_used_ids:
                print(f"      Item IDs: {recently_used_ids[:10]}")
            
            # Search vector store for candidate items
            try:
                vector_store = get_vector_store()
                print(f"   Searching for top 40 similar items...")
                candidate_results = vector_store.search_wardrobe_items(
                    user_id=user_id,
                    user_email=user_email,
                    query_embedding=query_embedding_vec,
                    limit=40,
                    exclude_ids=recently_used_ids[:15]  # Hard exclude last N
                )
                
                print(f"   ✓ Found {len(candidate_results)} candidate items")
                if candidate_results:
                    print(f"   📊 Top 5 matches:")
                    for i, (item_id, similarity) in enumerate(candidate_results[:5], 1):
                        print(f"      {i}. Item #{item_id}: similarity = {similarity:.3f}")
                
                # Convert (item_id, similarity) to (WardrobeItem, similarity)
                candidates = []
                for item_id, similarity in candidate_results:
                    item = db.query(WardrobeItem).filter(WardrobeItem.id == item_id).first()
                    if item and similarity >= 0.3:  # Minimum relevance threshold
                        candidates.append((item, similarity))
                
                # Get recent recommendation embeddings for diversity
                print(f"\n   🎨 Applying diversity algorithm (MMR)...")
                recent_recs = vector_store.get_recent_recommendations(user_id, user_email, limit=5)
                recent_embeddings = [emb for _, emb in recent_recs]
                print(f"      Recent recommendations: {len(recent_recs)}")
                print(f"      Lambda (relevance weight): 0.7 (70% relevance, 30% diversity)")
                
                # Apply MMR for diversity
                diverse_candidates = apply_mmr(
                    candidates=candidates,
                    query_embedding=query_embedding_vec,
                    recent_embeddings=[json.dumps(emb) for emb in recent_embeddings],
                    k=20,  # Final count for LLM
                    lambda_param=0.7  # Balance relevance (70%) vs diversity (30%)
                )
                
                print(f"   ✓ Selected {len(diverse_candidates)} diverse items after MMR")
                if diverse_candidates:
                    print(f"   📊 Top 5 diverse items:")
                    for i, (item, score) in enumerate(diverse_candidates[:5], 1):
                        print(f"      {i}. Item #{item.id} ({item.dress_type.value if item.dress_type else 'N/A'}): score = {score:.3f}")
                print(f"{'='*70}\n")
                
                # Keep items WITH scores for ranking (don't discard!)
                wardrobe_items_with_scores = diverse_candidates
                wardrobe_items = [item for item, score in diverse_candidates]
            except Exception as e:
                print(f"   ⚠️  Vector search failed: {e}, falling back to all items")
                wardrobe_items = db.query(WardrobeItem).filter(
                    WardrobeItem.user_id == user_id,
                    WardrobeItem.processing_status == ProcessingStatus.COMPLETED
                ).limit(20).all()
        else:
            # Fallback: use all wardrobe items (old behavior)
            print(f"   ⚠️  No embedding available, using all wardrobe items")
            wardrobe_items = db.query(WardrobeItem).filter(
                WardrobeItem.user_id == user_id,
                WardrobeItem.processing_status == ProcessingStatus.COMPLETED
            ).limit(20).all()
        
        print(f"   ✓ Using {len(wardrobe_items)} items for recommendation")
        
        if not wardrobe_items:
            raise Exception("No processed wardrobe items found. Please process your wardrobe first.")
        
        # Build wardrobe data with images AND scores
        # Create a score map for quick lookup
        item_scores = {}
        if query_embedding_vec and 'wardrobe_items_with_scores' in locals():
            item_scores = {item.id: score for item, score in wardrobe_items_with_scores}
        
        wardrobe_data = _build_wardrobe_data(db, wardrobe_items, item_scores)
        
        # Generate recommendations using AI
        print(f"\n{'='*70}")
        print(f"🤖 GENERATING OUTFITS WITH LLM")
        print(f"{'='*70}")
        print(f"   Sending to LLM:")
        print(f"      - User profile: {len(str(profile_data))} bytes")
        print(f"      - Query: {query}")
        print(f"      - Wardrobe items: {len(wardrobe_data)} items")
        print(f"      - Items with vector scores: {sum(1 for item in wardrobe_data if 'vector_relevance' in item)}")
        
        recommendations = await ai_service.generate_recommendations(
            user_id=user_id,
            query=query,
            user_profile=profile_data,
            wardrobe_items=wardrobe_data,
            user_image_path=user_image_path
        )
        print(f"   ✓ LLM generated {len(recommendations.get('recommended_outfits', []))} outfits")
        print(f"{'='*70}\n")
        
        # Extract outfit IDs and descriptions
        outfit_ids = []
        outfit_descriptions = []
        all_used_item_ids = set()
        
        # Calculate data-driven ranking for each outfit
        for outfit in recommendations.get("recommended_outfits", []):
            item_ids = outfit.get("wardrobe_item_ids", [])
            outfit_ids.append(item_ids)
            all_used_item_ids.update(item_ids)
            outfit_descriptions.append(outfit.get("outfit_name", "") + ": " + outfit.get("items_description", ""))
            
            # Calculate average vector relevance for items in this outfit
            if item_scores and item_ids:
                relevant_scores = [item_scores.get(iid, 0.0) for iid in item_ids]
                avg_vector_relevance = sum(relevant_scores) / len(relevant_scores) if relevant_scores else 0.0
            else:
                avg_vector_relevance = 0.5  # Default if no scores
            
            # Get LLM's confidence score
            llm_confidence = outfit.get("confidence_score", 0.5)
            
            # Combined score: 60% vector relevance + 40% LLM confidence
            combined_score = 0.6 * avg_vector_relevance + 0.4 * llm_confidence
            
            # Add scores to outfit
            outfit["vector_relevance"] = round(avg_vector_relevance, 3)
            outfit["llm_confidence"] = round(llm_confidence, 3)
            outfit["combined_score"] = round(combined_score, 3)
        
        # Sort outfits by combined score (descending)
        print(f"\n{'='*70}")
        print(f"📊 CALCULATING DATA-DRIVEN RANKINGS")
        print(f"{'='*70}")
        print(f"   Ranking formula: 0.6 × vector_relevance + 0.4 × llm_confidence")
        print(f"   Sorting {len(recommendations.get('recommended_outfits', []))} outfits by combined score...")
        
        recommendations.get("recommended_outfits", []).sort(
            key=lambda x: x.get("combined_score", 0),
            reverse=True
        )
        
        # Assign explicit ranks after sorting
        print(f"\n   🏆 FINAL RANKINGS:")
        for rank, outfit in enumerate(recommendations.get("recommended_outfits", []), 1):
            outfit["rank"] = rank
            outfit["outfit_id"] = rank  # Update outfit_id to match rank
            print(f"   {rank}. {outfit.get('outfit_name')}")
            print(f"      Combined Score: {outfit.get('combined_score'):.3f}")
            print(f"      ├─ Vector Relevance: {outfit.get('vector_relevance'):.3f} (60% weight)")
            print(f"      └─ LLM Confidence: {outfit.get('llm_confidence'):.3f} (40% weight)")
            print(f"      Items: {outfit.get('wardrobe_item_ids')}")
        print(f"{'='*70}\n")
        
        # Create recommendation embedding for future diversity
        rec_text = create_recommendation_embedding(query, outfit_descriptions, list(all_used_item_ids))
        rec_embedding_vec = await ai_service.generate_embedding(rec_text)
        rec_embedding = json.dumps(rec_embedding_vec) if rec_embedding_vec else None
        
        # Create recommendation record
        recommendation = Recommendation(
            user_id=user_id,
            query=query,
            recommendation_type=recommendation_type or recommendations.get("metadata", {}).get("occasion_detected"),
            generated_images=json.dumps(recommendations.get("generated_images", [])),
            wardrobe_item_ids=json.dumps(outfit_ids),
            ai_metadata=json.dumps(recommendations.get("metadata", {})),
            recommendation_embedding=rec_embedding
        )
        db.add(recommendation)
        db.commit()
        
        # Store in vector store for future diversity
        if rec_embedding_vec:
            try:
                vector_store = get_vector_store()
                vector_store.add_recommendation(
                    rec_id=recommendation.id,
                    user_email=user_email,
                    embedding=rec_embedding_vec,
                    metadata={
                        "user_id": user_id,
                        "query": query,
                        "created_at": str(recommendation.created_at)
                    }
                )
                print(f"   ✓ Stored recommendation embedding in ChromaDB collection: {user_email.split('@')[0]}_recommendations")
            except Exception as e:
                print(f"   ⚠️  Failed to store recommendation in vector store: {e}")
                import traceback
                traceback.print_exc()
        
        print(f"   ✓ Recommendation saved with ID: {recommendation.id}")
        print(f"   ✓ Generated {len(recommendations.get('recommended_outfits', []))} outfits")
    
    except Exception as e:
        print(f"   ✗ Recommendation generation failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


def _build_wardrobe_data(db: Session, wardrobe_items: List[WardrobeItem], item_scores: Dict[int, float] = None) -> List[Dict[str, Any]]:
    """Build wardrobe data list with images and relevance scores for AI processing"""
    wardrobe_data = []
    for item in wardrobe_items:
        # Get images for this item
        images = db.query(WardrobeImage).filter(
            WardrobeImage.wardrobe_item_id == item.id,
            WardrobeImage.is_original == True
        ).all()
        
        image_paths = [img.image_path for img in images]
        metadata = parse_json_safe(item.ai_metadata)
        
        item_data = {
            "id": item.id,
            "dress_type": item.dress_type.value if item.dress_type else None,
            "style": item.style.value if item.style else None,
            "color": item.color,
            "metadata": metadata,
            "image_path": image_paths[0] if image_paths else None,
            "image_paths": image_paths
        }
        
        # Include vector similarity score if available
        if item_scores and item.id in item_scores:
            item_data["vector_relevance"] = round(item_scores[item.id], 3)
        
        wardrobe_data.append(item_data)
    
    return wardrobe_data


def get_user_recommendations(
    db: Session,
    user_id: int,
    limit: int = 10
) -> List[Recommendation]:
    """Get all recommendations for a user"""
    return db.query(Recommendation).filter(
        Recommendation.user_id == user_id
    ).order_by(Recommendation.created_at.desc()).limit(limit).all()


def get_recommendation_by_id(
    db: Session,
    user_id: int,
    recommendation_id: int
) -> Optional[Recommendation]:
    """Get a specific recommendation by ID"""
    return db.query(Recommendation).filter(
        Recommendation.id == recommendation_id,
        Recommendation.user_id == user_id
    ).first()


def get_recommendation_outfits(
    db: Session,
    user_id: int,
    recommendation: Recommendation
) -> Dict[str, Any]:
    """Get detailed outfit information for a recommendation including wardrobe item images"""
    metadata = parse_json_safe(recommendation.ai_metadata)
    
    # Get outfit details with actual wardrobe images
    outfits_with_images = []
    for outfit in metadata.get("recommended_outfits", []):
        item_ids = outfit.get("wardrobe_item_ids", [])
        items_with_images = []
        
        for item_id in item_ids:
            wardrobe_item = db.query(WardrobeItem).filter(
                WardrobeItem.id == item_id,
                WardrobeItem.user_id == user_id
            ).first()
            
            if wardrobe_item:
                images = db.query(WardrobeImage).filter(
                    WardrobeImage.wardrobe_item_id == item_id,
                    WardrobeImage.is_original == True
                ).all()
                
                items_with_images.append({
                    "id": wardrobe_item.id,
                    "dress_type": wardrobe_item.dress_type.value if wardrobe_item.dress_type else None,
                    "style": wardrobe_item.style.value if wardrobe_item.style else None,
                    "color": wardrobe_item.color,
                    "images": [img.image_path for img in images]
                })
        
        outfits_with_images.append({
            **outfit,
            "items_with_images": items_with_images
        })
    
    return {
        "recommendation_id": recommendation.id,
        "query": recommendation.query,
        "recommendation_type": recommendation.recommendation_type,
        "outfits": outfits_with_images,
        "metadata": metadata,
        "created_at": recommendation.created_at
    }


async def generate_tryon_for_outfit(
    db: Session,
    user_id: int,
    recommendation: Recommendation,
    outfit_index: int
) -> Tuple[bool, str, Optional[str]]:
    """
    Generate a virtual try-on image for a specific outfit.
    
    Returns:
        Tuple of (success, error_message, image_path)
    """
    metadata = parse_json_safe(recommendation.ai_metadata)
    outfits = metadata.get("recommended_outfits", [])
    
    if outfit_index < 0 or outfit_index >= len(outfits):
        return False, "Invalid outfit index", None
    
    outfit = outfits[outfit_index]
    
    # Get user profile (for try-on prompt context)
    user_profile = {}
    user_profile_row = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if user_profile_row and user_profile_row.additional_info:
        profile_info = parse_json_safe(user_profile_row.additional_info)
        user_profile = profile_info.get("ai_profile_analysis", {})
    
    # Get user image to use for try-on
    user_image = db.query(UserImage).filter(
        UserImage.user_id == user_id,
        UserImage.processing_status == ProcessingStatus.COMPLETED
    ).first()
    
    if not user_image:
        return False, "No processed user image available for try-on. Please process a user image first.", None
    
    # Build wardrobe items data for this outfit
    wardrobe_item_ids = outfit.get("wardrobe_item_ids", [])
    wardrobe_items = []
    
    for item_id in wardrobe_item_ids:
        item = db.query(WardrobeItem).filter(
            WardrobeItem.id == item_id,
            WardrobeItem.user_id == user_id
        ).first()
        if item:
            images = db.query(WardrobeImage).filter(
                WardrobeImage.wardrobe_item_id == item.id,
                WardrobeImage.is_original == True
            ).all()
            
            image_path = images[0].image_path if images else None
            metadata_obj = parse_json_safe(item.ai_metadata)
            
            wardrobe_items.append({
                "id": item.id,
                "image_path": image_path,
                "metadata": metadata_obj
            })
    
    # Generate virtual try-on image
    try:
        tryon_result = await ai_service.generate_virtual_tryon(
            user_image_path=user_image.image_path,
            outfit_description=outfit.get("items_description", ""),
            outfit_name=outfit.get("outfit_name", f"Outfit {outfit_index + 1}"),
            user_profile=user_profile,
            wardrobe_items=wardrobe_items
        )
        
        image_path = tryon_result.get("image_path")
        
        # Save back to metadata for future fetches
        if image_path:
            outfits[outfit_index]["tryon_image_path"] = image_path
            metadata["recommended_outfits"] = outfits
            recommendation.ai_metadata = json.dumps(metadata)
            db.add(recommendation)
            db.commit()
        
        return True, "", image_path
        
    except Exception as e:
        print(f"   ✗ Try-on generation failed: {e}")
        import traceback
        traceback.print_exc()
        return False, "Failed to generate try-on image", None

