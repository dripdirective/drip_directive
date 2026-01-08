"""
AI processing background tasks.
"""
import json
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import UserImage, UserProfile, WardrobeItem, WardrobeImage, ProcessingStatus
from app.ai_service import ai_service
from app.core.utils import parse_json_safe, map_garment_type, map_style
from app.core.vector_store import get_vector_store


def _build_comprehensive_wardrobe_text(clothing_data: dict, dress_type: str, style: str, color: str) -> str:
    """
    Build comprehensive text representation of wardrobe item for embedding.
    Includes all metadata fields to create rich semantic representation.
    """
    parts = []
    
    # Basic classification
    parts.append(f"Garment Type: {dress_type}")
    parts.append(f"Style: {style}")
    parts.append(f"Primary Color: {color}")
    
    # Add secondary colors if available
    if clothing_data.get("secondary_colors"):
        parts.append(f"Secondary Colors: {', '.join(clothing_data['secondary_colors'])}")
    
    # Pattern and material
    if clothing_data.get("pattern"):
        parts.append(f"Pattern: {clothing_data['pattern']}")
    if clothing_data.get("pattern_details"):
        parts.append(f"Pattern Details: {clothing_data['pattern_details']}")
    if clothing_data.get("material"):
        parts.append(f"Material: {clothing_data['material']}")
    if clothing_data.get("material_texture"):
        parts.append(f"Texture: {clothing_data['material_texture']}")
    
    # Fit and structure
    if clothing_data.get("fit_type"):
        parts.append(f"Fit: {clothing_data['fit_type']}")
    if clothing_data.get("neckline"):
        parts.append(f"Neckline: {clothing_data['neckline']}")
    if clothing_data.get("sleeve_type"):
        parts.append(f"Sleeves: {clothing_data['sleeve_type']}")
    if clothing_data.get("length"):
        parts.append(f"Length: {clothing_data['length']}")
    
    # Style details
    if clothing_data.get("style_vibe"):
        parts.append(f"Style Vibe: {clothing_data['style_vibe']}")
    
    # Occasions and seasons
    if clothing_data.get("occasion"):
        occasions = clothing_data['occasion'] if isinstance(clothing_data['occasion'], list) else [clothing_data['occasion']]
        parts.append(f"Suitable Occasions: {', '.join(occasions)}")
    if clothing_data.get("season"):
        seasons = clothing_data['season'] if isinstance(clothing_data['season'], list) else [clothing_data['season']]
        parts.append(f"Seasons: {', '.join(seasons)}")
    if clothing_data.get("weather_suitability"):
        parts.append(f"Weather: {clothing_data['weather_suitability']}")
    if clothing_data.get("time_of_day"):
        times = clothing_data['time_of_day'] if isinstance(clothing_data['time_of_day'], list) else [clothing_data['time_of_day']]
        parts.append(f"Time of Day: {', '.join(times)}")
    
    # Versatility and formality
    if clothing_data.get("formality_level"):
        parts.append(f"Formality Level: {clothing_data['formality_level']}/10")
    if clothing_data.get("versatility_score"):
        parts.append(f"Versatility: {clothing_data['versatility_score']}/10")
    if clothing_data.get("statement_piece"):
        is_statement = "Yes" if str(clothing_data['statement_piece']).lower() in ['true', 'yes'] else "No"
        parts.append(f"Statement Piece: {is_statement}")
    
    # Styling suggestions
    if clothing_data.get("color_pairing_suggestions"):
        colors = clothing_data['color_pairing_suggestions'] if isinstance(clothing_data['color_pairing_suggestions'], list) else [clothing_data['color_pairing_suggestions']]
        parts.append(f"Pairs Well With: {', '.join(colors)}")
    
    styling = clothing_data.get("styling_suggestions", {})
    if isinstance(styling, dict):
        if styling.get("pairs_well_with"):
            items = styling['pairs_well_with'] if isinstance(styling['pairs_well_with'], list) else [styling['pairs_well_with']]
            parts.append(f"Pairs With: {', '.join(items)}")
        if styling.get("accessories"):
            accessories = styling['accessories'] if isinstance(styling['accessories'], list) else [styling['accessories']]
            parts.append(f"Accessories: {', '.join(accessories)}")
        if styling.get("shoes"):
            shoes = styling['shoes'] if isinstance(styling['shoes'], list) else [styling['shoes']]
            parts.append(f"Footwear: {', '.join(shoes)}")
    
    # Description and summary (most important for semantic understanding)
    if clothing_data.get("description"):
        parts.append(f"Description: {clothing_data['description']}")
    if clothing_data.get("summary_text"):
        parts.append(f"Summary: {clothing_data['summary_text']}")
    
    return " | ".join(parts)


async def process_user_images_task(user_id: int) -> None:
    """Background task to process user images with AI and create user profile"""
    db = SessionLocal()
    try:
        print(f"\n🔄 Starting AI processing task for user {user_id}")
        
        # Get all pending user images
        user_images = db.query(UserImage).filter(
            UserImage.user_id == user_id,
            UserImage.processing_status == ProcessingStatus.PENDING
        ).all()
        
        if not user_images:
            print(f"   No pending images found for user {user_id}")
            return
        
        print(f"   Found {len(user_images)} pending images")
        
        # Prepare image paths
        image_paths = {}
        for img in user_images:
            # Use image ID as key to handle multiple images of same type
            key = f"{img.image_type.value}_{img.id}"
            image_paths[key] = img.image_path
            # Update status to processing
            img.processing_status = ProcessingStatus.PROCESSING
        db.commit()
        
        print(f"   Image paths prepared: {list(image_paths.keys())}")
        
        # Process images with AI
        metadata = await ai_service.process_user_images(user_id, image_paths)
        
        # Update images with metadata
        for img in user_images:
            key = f"{img.image_type.value}_{img.id}"
            img.ai_metadata = json.dumps(metadata.get(key, {}))
            img.processing_status = ProcessingStatus.COMPLETED
        
        # Store combined profile in user profile's additional_info
        combined_profile = metadata.get("_combined_profile", {})
        if combined_profile:
            await _update_user_profile_with_ai(db, user_id, combined_profile)
        
        db.commit()
        print(f"   ✓ AI processing completed for user {user_id}")
    
    except Exception as e:
        print(f"   ✗ AI processing failed: {e}")
        import traceback
        traceback.print_exc()
        
        # Update status to failed
        user_images = db.query(UserImage).filter(
            UserImage.user_id == user_id,
            UserImage.processing_status == ProcessingStatus.PROCESSING
        ).all()
        for img in user_images:
            img.processing_status = ProcessingStatus.FAILED
        db.commit()
    finally:
        db.close()


async def _update_user_profile_with_ai(db: Session, user_id: int, combined_profile: dict) -> None:
    """Update or create user profile with AI analysis and generate embedding"""
    from app.models import User
    
    # Get user email for vector store collection naming
    user = db.query(User).filter(User.id == user_id).first()
    user_email = user.email if user else "default@user.com"
    
    user_profile = db.query(UserProfile).filter(
        UserProfile.user_id == user_id
    ).first()
    
    # Extract summary text from AI analysis
    analysis = combined_profile.get("analysis", {})
    summary_text = analysis.get("summary_text", "")
    
    # Log extracted metadata details
    print(f"\n{'='*70}")
    print(f"📋 USER PROFILE METADATA EXTRACTION")
    print(f"{'='*70}")
    
    # Physical attributes
    physical = analysis.get("physical_attributes", {})
    print(f"   👤 Physical Attributes:")
    print(f"      - Body Type: {physical.get('body_type', 'N/A')}")
    print(f"      - Skin Tone: {physical.get('skin_tone', 'N/A')}")
    print(f"      - Skin Undertone: {physical.get('skin_undertone', 'N/A')}")
    
    # Facial features
    facial = analysis.get("facial_features", {})
    print(f"   👤 Facial Features:")
    print(f"      - Face Shape: {facial.get('face_shape', 'N/A')}")
    print(f"      - Hair: {facial.get('hair_color', 'N/A')} / {facial.get('hair_length', 'N/A')}")
    
    # Style assessment
    style = analysis.get("style_assessment", {})
    print(f"   🎨 Style Assessment:")
    print(f"      - Style Personality: {style.get('style_personality', 'N/A')}")
    recommended_colors = style.get("recommended_colors", [])
    print(f"      - Recommended Colors: {', '.join(recommended_colors[:5]) if recommended_colors else 'N/A'}")
    recommended_styles = style.get("recommended_styles", [])
    print(f"      - Recommended Styles: {', '.join(recommended_styles[:3]) if recommended_styles else 'N/A'}")
    
    # Confidence scores
    confidence = analysis.get("confidence_scores", {})
    print(f"   📊 Confidence Scores:")
    print(f"      - Overall: {confidence.get('overall_confidence', 0)}%")
    print(f"      - Body Type: {confidence.get('body_type_confidence', 0)}%")
    print(f"      - Style Assessment: {confidence.get('style_assessment_confidence', 0)}%")
    
    # Summary
    print(f"   📝 Summary Text: {len(summary_text)} characters")
    if summary_text:
        print(f"      Preview: {summary_text[:150]}...")
    
    print(f"{'='*70}\n")
    
    # Generate embedding from summary text
    embedding = None
    embedding_vec = None
    if summary_text:
        print(f"   🔢 Creating embedding from user profile summary...")
        embedding_vec = await ai_service.generate_embedding(summary_text)
        if embedding_vec:
            # Store as JSON array string (SQLite compatible, will use pgvector in Postgres)
            embedding = json.dumps(embedding_vec)
            print(f"   ✓ Embedding created: {len(embedding_vec)} dimensions")
            print(f"   📊 Embedding stats: min={min(embedding_vec):.4f}, max={max(embedding_vec):.4f}, avg={sum(embedding_vec)/len(embedding_vec):.4f}")
    
    if user_profile:
        # Update existing profile with AI analysis
        existing_info = parse_json_safe(user_profile.additional_info)
        if isinstance(existing_info, str):
            existing_info = {"previous_info": existing_info}
        
        existing_info["ai_profile_analysis"] = combined_profile
        user_profile.additional_info = json.dumps(existing_info)
        user_profile.profile_summary_text = summary_text
        user_profile.profile_embedding = embedding
        print(f"   ✓ Updated user profile in SQLite database")
    else:
        # Create new profile with AI analysis
        new_profile = UserProfile(
            user_id=user_id,
            additional_info=json.dumps({"ai_profile_analysis": combined_profile}),
            profile_summary_text=summary_text,
            profile_embedding=embedding
        )
        db.add(new_profile)
        print(f"   ✓ Created new user profile in SQLite database")
    
    # Store in vector store (ChromaDB for local testing)
    if embedding_vec:
        try:
            vector_store = get_vector_store()
            vector_store.add_user_profile(
                user_id=user_id,
                user_email=user_email,
                embedding=embedding_vec,
                metadata={
                    "summary_text": summary_text[:500],  # Store snippet
                    "has_profile": True,
                    "body_type": physical.get("body_type", ""),
                    "skin_tone": physical.get("skin_tone", ""),
                    "style_personality": style.get("style_personality", "")
                }
            )
            print(f"   ✓ Stored profile embedding in ChromaDB")
            print(f"      Collection: drip_directive_{user_email.split('@')[0]}_user_profiles")
            print(f"      Document ID: user_{user_id}")
        except Exception as e:
            print(f"   ⚠️  Failed to store in vector store: {e}")
            import traceback
            traceback.print_exc()


async def process_wardrobe_images_task(wardrobe_item_id: int) -> None:
    """Background task to process wardrobe images with AI"""
    from app.models import User
    
    db = SessionLocal()
    try:
        print(f"\n🔄 Starting wardrobe AI processing for item {wardrobe_item_id}")
        
        # Get wardrobe item
        wardrobe_item = db.query(WardrobeItem).filter(
            WardrobeItem.id == wardrobe_item_id
        ).first()
        
        if not wardrobe_item:
            print(f"   ✗ Wardrobe item {wardrobe_item_id} not found")
            return
        
        # Get user email for vector store collection naming
        user = db.query(User).filter(User.id == wardrobe_item.user_id).first()
        user_email = user.email if user else "default@user.com"
        
        # Get original images
        original_images = db.query(WardrobeImage).filter(
            WardrobeImage.wardrobe_item_id == wardrobe_item_id,
            WardrobeImage.is_original == True
        ).all()
        
        if not original_images:
            print(f"   ✗ No images found for wardrobe item {wardrobe_item_id}")
            return
        
        print(f"   Found {len(original_images)} image(s) to process")
        
        # Update status to processing
        wardrobe_item.processing_status = ProcessingStatus.PROCESSING
        db.commit()
        
        # Process the first image with AI (typically one image per wardrobe item)
        first_image = original_images[0]
        metadata = await ai_service.process_wardrobe_images(first_image.image_path)
        
        # Extract clothing analysis
        clothing_data = metadata.get("clothing_analysis", {})
        
        # Log extracted metadata details
        print(f"\n{'='*70}")
        print(f"👕 WARDROBE ITEM METADATA EXTRACTION")
        print(f"{'='*70}")
        
        # Basic info
        print(f"   📌 Basic Information:")
        print(f"      - Garment Type: {clothing_data.get('garment_type', 'N/A')}")
        print(f"      - Category: {clothing_data.get('category', 'N/A')}")
        print(f"      - Primary Color: {clothing_data.get('color', 'N/A')}")
        secondary = clothing_data.get('secondary_colors', [])
        if secondary:
            print(f"      - Secondary Colors: {', '.join(secondary)}")
        
        # Material and fit
        print(f"   🧵 Material & Fit:")
        print(f"      - Material: {clothing_data.get('material', 'N/A')}")
        print(f"      - Pattern: {clothing_data.get('pattern', 'N/A')}")
        print(f"      - Fit Type: {clothing_data.get('fit_type', 'N/A')}")
        
        # Style details
        print(f"   🎨 Style Details:")
        print(f"      - Style: {clothing_data.get('style', 'N/A')}")
        print(f"      - Style Vibe: {clothing_data.get('style_vibe', 'N/A')}")
        print(f"      - Formality: {clothing_data.get('formality_level', 'N/A')}/10")
        print(f"      - Versatility: {clothing_data.get('versatility_score', 'N/A')}/10")
        print(f"      - Statement Piece: {clothing_data.get('statement_piece', 'N/A')}")
        
        # Occasions and seasons
        occasions = clothing_data.get('occasion', [])
        if occasions:
            print(f"   📅 Occasions: {', '.join(occasions[:4])}")
        seasons = clothing_data.get('season', [])
        if seasons:
            print(f"   🌤️  Seasons: {', '.join(seasons)}")
        
        # Styling suggestions
        styling = clothing_data.get('styling_suggestions', {})
        if isinstance(styling, dict):
            pairs_with = styling.get('pairs_well_with', [])
            if pairs_with:
                print(f"   👔 Pairs Well With: {', '.join(pairs_with[:3])}")
            accessories = styling.get('accessories', [])
            if accessories:
                print(f"   💍 Accessories: {', '.join(accessories[:3])}")
        
        # Summary
        summary = clothing_data.get('summary_text', '')
        print(f"   📝 Summary: {len(summary)} characters")
        if summary:
            print(f"      Preview: {summary[:120]}...")
        
        print(f"{'='*70}\n")
        
        # Map AI response to wardrobe item fields
        garment_type = clothing_data.get("garment_type", "other")
        style = clothing_data.get("style", "casual")
        color = clothing_data.get("color", "unknown")
        
        mapped_dress_type = map_garment_type(garment_type)
        mapped_style = map_style(style)
        
        # Build comprehensive text for embedding that includes ALL metadata
        # This creates a rich text representation for better semantic search
        print(f"   🔨 Building comprehensive embedding text...")
        comprehensive_text = _build_comprehensive_wardrobe_text(clothing_data, mapped_dress_type, mapped_style, color)
        print(f"   ✓ Comprehensive text created: {len(comprehensive_text)} characters")
        print(f"   📊 Text preview: {comprehensive_text[:200]}...")
        
        embedding = None
        embedding_vec = None
        if comprehensive_text:
            print(f"\n   🔢 Creating embedding from comprehensive text...")
            embedding_vec = await ai_service.generate_embedding(comprehensive_text)
            if embedding_vec:
                # Store as JSON array string (SQLite compatible, will use pgvector in Postgres)
                embedding = json.dumps(embedding_vec)
                print(f"   ✓ Embedding created: {len(embedding_vec)} dimensions")
                print(f"   📊 Embedding stats: min={min(embedding_vec):.4f}, max={max(embedding_vec):.4f}, avg={sum(embedding_vec)/len(embedding_vec):.4f}")
        
        # Update wardrobe item
        wardrobe_item.dress_type = mapped_dress_type
        wardrobe_item.style = mapped_style
        wardrobe_item.color = color
        wardrobe_item.ai_metadata = json.dumps(metadata)
        wardrobe_item.item_summary_text = clothing_data.get("summary_text", "")
        wardrobe_item.item_embedding = embedding
        wardrobe_item.processing_status = ProcessingStatus.COMPLETED
        
        print(f"\n   💾 Saving to SQLite database...")
        db.commit()
        print(f"   ✓ Saved to wardrobe_items table (ID: {wardrobe_item_id})")
        print(f"      - dress_type: {mapped_dress_type}")
        print(f"      - style: {mapped_style}")
        print(f"      - color: {color}")
        print(f"      - ai_metadata: {len(json.dumps(metadata))} bytes")
        print(f"      - item_summary_text: {len(clothing_data.get('summary_text', ''))} chars")
        print(f"      - item_embedding: {len(embedding) if embedding else 0} bytes (JSON)")
        
        # Store in vector store (ChromaDB for local testing)
        if embedding_vec:
            try:
                print(f"\n   📤 Storing in ChromaDB vector database...")
                vector_store = get_vector_store()
                vector_store.add_wardrobe_item(
                    item_id=wardrobe_item_id,
                    user_email=user_email,
                    embedding=embedding_vec,
                    metadata={
                        "user_id": wardrobe_item.user_id,
                        "dress_type": mapped_dress_type,
                        "style": mapped_style,
                        "color": color,
                        "summary_text": clothing_data.get("summary_text", "")[:500],
                        "embedding_source_text": comprehensive_text,
                        "occasions": clothing_data.get("occasion", []),
                        "formality_level": clothing_data.get("formality_level", ""),
                        "versatility_score": clothing_data.get("versatility_score", "")
                    }
                )
                print(f"   ✓ Stored in ChromaDB successfully!")
                print(f"      Collection: drip_directive_{user_email.split('@')[0]}_wardrobe_items")
                print(f"      Document ID: item_{wardrobe_item_id}")
                print(f"      Embedding: {len(embedding_vec)} dimensions")
                print(f"      Metadata: {len(str(clothing_data))} bytes")
            except Exception as e:
                print(f"   ⚠️  Failed to store in vector store: {e}")
                import traceback
                traceback.print_exc()
        
        print(f"\n{'='*70}")
        print(f"✅ WARDROBE AI PROCESSING COMPLETED")
        print(f"{'='*70}")
        print(f"   Item ID: {wardrobe_item_id}")
        print(f"   Type: {mapped_dress_type}")
        print(f"   Style: {mapped_style}")
        print(f"   Color: {color}")
        print(f"   Metadata Fields: {len(clothing_data.keys())} attributes")
        print(f"   Embedding: {'✓ Created' if embedding_vec else '✗ Failed'}")
        print(f"   SQLite: ✓ Saved")
        print(f"   ChromaDB: {'✓ Saved' if embedding_vec else '✗ Failed'}")
        print(f"{'='*70}\n")
    
    except Exception as e:
        print(f"   ✗ Wardrobe AI processing failed: {e}")
        import traceback
        traceback.print_exc()
        
        # Update status to failed
        wardrobe_item = db.query(WardrobeItem).filter(
            WardrobeItem.id == wardrobe_item_id
        ).first()
        if wardrobe_item:
            wardrobe_item.processing_status = ProcessingStatus.FAILED
            db.commit()
    finally:
        db.close()

