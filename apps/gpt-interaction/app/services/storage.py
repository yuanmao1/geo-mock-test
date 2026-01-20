import os
import shutil
import zipfile
from pathlib import Path
from typing import Optional

import boto3
from botocore.exceptions import ClientError

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger("storage")
settings = get_settings()


class S3SessionManager:
    """
    Manages browser session storage in S3-compatible object storage.
    Handles compression, upload, download, and extraction of session data.
    """

    def __init__(self):
        self.bucket_name = settings.s3_bucket_name
        self.s3_client = None
        
        if settings.s3_enable_backup and settings.s3_access_key and settings.s3_secret_key:
            try:
                self.s3_client = boto3.client(
                    's3',
                    endpoint_url=settings.s3_endpoint_url,
                    aws_access_key_id=settings.s3_access_key,
                    aws_secret_access_key=settings.s3_secret_key,
                    region_name=settings.s3_region_name
                )
                self._ensure_bucket_exists()
            except Exception as e:
                logger.error(f"Failed to initialize S3 client: {e}")

    def _ensure_bucket_exists(self):
        """Ensure the configured bucket exists."""
        if not self.s3_client:
            return

        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
        except ClientError as e:
            error_code = int(e.response['Error']['Code'])
            if error_code == 404:
                try:
                    self.s3_client.create_bucket(Bucket=self.bucket_name)
                    logger.info(f"Created bucket: {self.bucket_name}")
                except Exception as create_error:
                    logger.error(f"Failed to create bucket: {create_error}")
            else:
                logger.error(f"Error checking bucket: {e}")

    def _zip_directory(self, source_dir: Path, output_zip: Path):
        """Compress a directory into a zip file."""
        # Files to skip (lock files, temp files that may be in use)
        skip_patterns = ['SingletonLock', 'lockfile', '.lock', 'LOCK']
        
        with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, _, files in os.walk(source_dir):
                for file in files:
                    # Skip lock files
                    if any(pattern in file for pattern in skip_patterns):
                        continue
                    
                    file_path = Path(root) / file
                    arcname = file_path.relative_to(source_dir)
                    try:
                        zipf.write(file_path, arcname)
                    except (FileNotFoundError, PermissionError) as e:
                        # Skip files that are locked or disappeared
                        logger.debug(f"Skipping file {file_path}: {e}")
                        continue

    def _unzip_file(self, zip_path: Path, extract_dir: Path):
        """Extract a zip file to a directory."""
        with zipfile.ZipFile(zip_path, 'r') as zipf:
            zipf.extractall(extract_dir)

    def _cleanup_lock_files(self, directory: Path):
        """Remove lock files from a directory to prevent browser startup issues."""
        lock_patterns = ['SingletonLock', 'lockfile', '.lock', 'LOCK']
        
        for root, _, files in os.walk(directory):
            for file in files:
                if any(pattern in file for pattern in lock_patterns):
                    file_path = Path(root) / file
                    try:
                        file_path.unlink()
                        logger.debug(f"Removed lock file: {file_path}")
                    except Exception as e:
                        logger.debug(f"Could not remove lock file {file_path}: {e}")


    def download_session(self, user_id: str, target_dir: Path) -> bool:
        """
        Download and extract session data for a user from S3.
        
        Args:
            user_id: The user ID to retrieve session for.
            target_dir: The directory to extract session data to.
            
        Returns:
            True if successful, False otherwise.
        """
        if not settings.s3_enable_backup:
            return False

        if not self.s3_client:
            logger.warning("S3 client not initialized, skipping download")
            return False

        object_key = f"sessions/{user_id}.zip"
        # Ensure parent directory exists for temp file
        if not target_dir.parent.exists():
            target_dir.parent.mkdir(parents=True, exist_ok=True)
            
        temp_zip = target_dir.parent / f"{user_id}_temp.zip"

        try:
            # Check if object exists
            try:
                self.s3_client.head_object(Bucket=self.bucket_name, Key=object_key)
            except ClientError:
                logger.info(f"No remote session found for user {user_id}")
                return False

            logger.info(f"Downloading session for user {user_id} from S3...")
            self.s3_client.download_file(self.bucket_name, object_key, str(temp_zip))
            
            # Debug zip size
            zip_size = temp_zip.stat().st_size
            logger.info(f"Downloaded session zip size: {zip_size} bytes")

            # Clean target directory if it exists
            if target_dir.exists():
                shutil.rmtree(target_dir)
            target_dir.mkdir(parents=True, exist_ok=True)

            logger.info(f"Extracting session to {target_dir}...")
            self._unzip_file(temp_zip, target_dir)
            
            # Clean up lock files that may have been in the zip
            self._cleanup_lock_files(target_dir)
            
            # Count extracted files
            file_count = sum(1 for _ in target_dir.rglob('*') if _.is_file())
            logger.info(f"Extracted {file_count} files to session directory")

            
            # Cleanup temp zip
            temp_zip.unlink()
            
            return True

        except Exception as e:
            logger.error(f"Failed to download session: {e}")
            if temp_zip.exists():
                temp_zip.unlink()
            return False

    def upload_session(self, user_id: str, source_dir: Path) -> bool:
        """
        Compress and upload session data for a user to S3.
        
        Args:
            user_id: The user ID to save session for.
            source_dir: The directory containing session data.
            
        Returns:
            True if successful, False otherwise.
        """
        if not settings.s3_enable_backup:
            return False

        if not self.s3_client:
            logger.warning("S3 client not initialized, skipping upload")
            return False

        if not source_dir.exists():
            logger.warning(f"Source directory {source_dir} does not exist")
            return False

        object_key = f"sessions/{user_id}.zip"
        temp_zip = source_dir.parent / f"{user_id}_upload.zip"

        try:
            logger.info(f"Compressing session data for user {user_id}...")
            self._zip_directory(source_dir, temp_zip)

            logger.info(f"Uploading session to S3: {object_key}...")
            self.s3_client.upload_file(str(temp_zip), self.bucket_name, object_key)
            
            logger.info("Session upload complete")
            temp_zip.unlink()
            return True

        except Exception as e:
            logger.error(f"Failed to upload session: {e}")
            if temp_zip.exists():
                temp_zip.unlink()
            return False
