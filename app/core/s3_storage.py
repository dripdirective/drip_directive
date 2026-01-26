"""
S3 Storage Service for AWS Deployment
Handles file uploads to S3 or local storage based on configuration
"""

import os
import uuid
from pathlib import Path
from typing import Optional
import logging

from fastapi import UploadFile

logger = logging.getLogger(__name__)


class S3Storage:
    """Storage service that supports both S3 and local filesystem"""
    
    def __init__(self):
        from app.config import settings
        
        self.use_s3 = settings.USE_S3
        self.settings = settings
        
        if self.use_s3:
            try:
                import boto3
                from botocore.exceptions import ClientError
                
                self.boto3 = boto3
                self.ClientError = ClientError
                self.s3_client = boto3.client('s3', region_name=settings.AWS_REGION)
                self.bucket_name = settings.S3_BUCKET_NAME
                self.cloudfront_domain = settings.CLOUDFRONT_DOMAIN
                logger.info(f"✅ S3 storage initialized (bucket: {self.bucket_name})")
            except ImportError:
                logger.error("❌ boto3 not installed. Install with: pip install boto3")
                self.use_s3 = False
            except Exception as e:
                logger.error(f"❌ Failed to initialize S3 client: {e}")
                self.use_s3 = False
        
        if not self.use_s3:
            self.upload_dir = settings.UPLOAD_DIR
            logger.info(f"✅ Using local storage (directory: {self.upload_dir})")
    
    async def upload_file(
        self, 
        file: UploadFile, 
        folder: str, 
        user_id: int,
        filename: Optional[str] = None
    ) -> str:
        """
        Upload file to S3 or local storage
        
        Args:
            file: FastAPI UploadFile object
            folder: Folder path within bucket/upload dir (e.g., 'user_images', 'wardrobe_images')
            user_id: User ID for organizing files
            filename: Optional custom filename (auto-generated if not provided)
        
        Returns:
            File URL/path
        """
        
        # Generate filename if not provided
        if not filename:
            file_extension = file.filename.split('.')[-1] if file.filename and '.' in file.filename else 'jpg'
            filename = f"{uuid.uuid4()}.{file_extension}"
        
        if self.use_s3:
            return await self._upload_to_s3(file, folder, user_id, filename)
        else:
            return await self._upload_to_local(file, folder, user_id, filename)
    
    async def _upload_to_s3(
        self, 
        file: UploadFile, 
        folder: str, 
        user_id: int, 
        filename: str
    ) -> str:
        """Upload file to S3"""
        s3_key = f"{folder}/user_{user_id}/{filename}"
        
        try:
            # Read file contents
            contents = await file.read()
            
            # Upload to S3
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=s3_key,
                Body=contents,
                ContentType=file.content_type or 'image/jpeg',
                # Optional: Add metadata
                Metadata={
                    'user_id': str(user_id),
                    'original_filename': file.filename or 'unknown'
                }
            )
            
            # Return CloudFront URL if available, else S3 URL
            if self.cloudfront_domain:
                url = f"https://{self.cloudfront_domain}/{s3_key}"
            else:
                url = f"https://{self.bucket_name}.s3.{self.settings.AWS_REGION}.amazonaws.com/{s3_key}"
            
            logger.info(f"✅ Uploaded to S3: {s3_key}")
            return url
            
        except self.ClientError as e:
            logger.error(f"❌ S3 upload failed: {e}")
            raise Exception(f"Failed to upload to S3: {e}")
        finally:
            # Reset file pointer
            await file.seek(0)
    
    async def _upload_to_local(
        self, 
        file: UploadFile, 
        folder: str, 
        user_id: int, 
        filename: str
    ) -> str:
        """Upload file to local storage"""
        # Create directory structure
        local_path = Path(self.upload_dir) / folder / f"user_{user_id}"
        local_path.mkdir(parents=True, exist_ok=True)
        
        # Save file
        file_path = local_path / filename
        contents = await file.read()
        
        with open(file_path, 'wb') as f:
            f.write(contents)
        
        # Reset file pointer
        await file.seek(0)
        
        logger.info(f"✅ Saved locally: {file_path}")
        return str(file_path)
    
    def delete_file(self, file_path: str) -> bool:
        """
        Delete file from S3 or local storage
        
        Args:
            file_path: File URL (for S3) or local path
        
        Returns:
            True if successful, False otherwise
        """
        if self.use_s3 and file_path.startswith('https://'):
            return self._delete_from_s3(file_path)
        else:
            return self._delete_from_local(file_path)
    
    def _delete_from_s3(self, file_url: str) -> bool:
        """Delete file from S3"""
        try:
            # Extract key from URL
            # URL format: https://bucket.s3.region.amazonaws.com/key or https://cloudfront/key
            if self.cloudfront_domain and self.cloudfront_domain in file_url:
                key = file_url.split(f"{self.cloudfront_domain}/")[-1]
            else:
                key = file_url.split('.amazonaws.com/')[-1]
            
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=key)
            logger.info(f"✅ Deleted from S3: {key}")
            return True
        except self.ClientError as e:
            logger.error(f"❌ S3 deletion failed: {e}")
            return False
    
    def _delete_from_local(self, file_path: str) -> bool:
        """Delete file from local storage"""
        try:
            Path(file_path).unlink(missing_ok=True)
            logger.info(f"✅ Deleted locally: {file_path}")
            return True
        except Exception as e:
            logger.error(f"❌ Local deletion failed: {e}")
            return False
    
    def get_presigned_url(self, file_path: str, expiration: int = 3600) -> Optional[str]:
        """
        Generate a presigned URL for secure temporary access to S3 objects
        
        Args:
            file_path: S3 file URL or key
            expiration: URL expiration time in seconds (default: 1 hour)
        
        Returns:
            Presigned URL or None if not using S3
        """
        if not self.use_s3:
            return file_path  # Return local path as-is
        
        try:
            # Extract key from URL if needed
            if file_path.startswith('https://'):
                if self.cloudfront_domain and self.cloudfront_domain in file_path:
                    key = file_path.split(f"{self.cloudfront_domain}/")[-1]
                else:
                    key = file_path.split('.amazonaws.com/')[-1]
            else:
                key = file_path
            
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': key},
                ExpiresIn=expiration
            )
            return url
        except self.ClientError as e:
            logger.error(f"❌ Failed to generate presigned URL: {e}")
            return None


# Global storage instance
storage = S3Storage()
