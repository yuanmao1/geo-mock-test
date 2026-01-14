#!/usr/bin/env python3
"""
Manual Login Script for ChatGPT.

This script opens a browser window for you to manually log in to ChatGPT.
After successful login, it saves the session cookies for later use by the main service.

Usage:
    python manual_login.py [--user USER_ID]
    
Examples:
    python manual_login.py                  # Use default user
    python manual_login.py --user myuser    # Use custom user ID
"""

import argparse
import sys
import time
from pathlib import Path

# Add app to path
sys.path.insert(0, str(Path(__file__).parent))

from DrissionPage import ChromiumOptions, ChromiumPage

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger("manual_login")
settings = get_settings()


def create_browser_options(user_data_path: Path) -> ChromiumOptions:
    """Create browser options with user-specific data path."""
    co = ChromiumOptions()

    # Ensure user data directory exists
    user_data_path.mkdir(parents=True, exist_ok=True)

    # Note: Removing the SingeltonLock file forcefully can cause Chrome to believe 
    # the profile is corrupted and reset it, losing cookies/sessions.
    # It is better to let Chrome handle the lock or manually kill the process if stuck.
    
    # for lock_path in [
    #     user_data_path / "Default" / "SingletonLock",
    #     user_data_path / "SingletonLock"
    # ]:
    #     if lock_path.exists():
    #         try:
    #             lock_path.unlink()
    #             logger.info(f"Removed stale lock file: {lock_path}")
    #         except Exception as e:
    #             logger.warning(f"Could not remove lock file: {e}")

    # Set user data path for session persistence
    logger.info(f"Using browser profile path: {user_data_path.absolute()}")
    co.set_user_data_path(str(user_data_path.absolute()))

    # Non-headless for manual login
    # co.set_argument('--headless=new')  # Commented out - we need to see the browser

    # Match browser.py flags for cookie compatibility
    co.set_argument("--no-sandbox")
    co.set_argument("--disable-dev-shm-usage")
    co.set_argument("--disable-gpu")
    co.set_argument("--disable-software-rasterizer")
    co.set_argument("--remote-allow-origins=*")
    # co.set_argument("--password-store=basic")  # Removed as it caused issues

    # Specific binary path (match browser.py)
    co.set_argument('--disable-blink-features=AutomationControlled')
    co.set_argument('--no-first-run')
    co.set_argument('--no-default-browser-check')
    
    # Window size (match browser.py)
    co.set_argument('--window-size=1280,900')

    return co


def check_login_status(page: ChromiumPage) -> bool:
    """Check if user is logged in to ChatGPT."""
    try:
        # Check for login button (indicates not logged in)
        login_btn = page.ele('text:Log in', timeout=2) or \
                    page.ele('text:登录', timeout=1) or \
                    page.ele('@data-testid=login-button', timeout=1)
        
        if login_btn:
            return False

        # Check for prompt textarea (indicates logged in)
        textarea = page.ele('#prompt-textarea', timeout=3) or \
                   page.ele('css:textarea[id="prompt-textarea"]', timeout=2) or \
                   page.ele('css:div[contenteditable="true"]', timeout=2)
        
        if textarea:
            # Additional check: no login button visible
            if not page.ele('text:Log in', timeout=1) and not page.ele('text:登录', timeout=1):
                return True

        # Check URL
        if "auth.openai.com" in page.url or "login" in page.url:
            return False

        return False

    except Exception as e:
        logger.warning(f"Error checking login status: {e}")
        return False


def check_cookies(page: ChromiumPage) -> dict:
    """Check and return cookie status."""
    result = {
        'total': 0,
        'session_cookies': [],
        'has_auth': False
    }
    
    try:
        cookies = page.run_cdp('Network.getAllCookies').get('cookies', [])
        result['total'] = len(cookies)
        
        relevant_domains = ['chatgpt.com', 'openai.com', 'auth0.com', 'auth.openai.com']
        
        for cookie in cookies:
            domain = cookie.get('domain', '')
            name = cookie.get('name', '')
            if any(d in domain for d in relevant_domains):
                if any(key in name.lower() for key in ['session', 'token', 'auth', '__cf', '__secure']):
                    result['session_cookies'].append({
                        'name': name,
                        'domain': domain,
                        'expires': cookie.get('expires', 'session')
                    })
                    if 'auth' in name.lower() or 'token' in name.lower():
                        result['has_auth'] = True
    except Exception as e:
        logger.warning(f"Error checking cookies: {e}")
    
    return result


def main():
    parser = argparse.ArgumentParser(
        description="Manual login to ChatGPT and save session cookies"
    )
    parser.add_argument(
        "--user", "-u",
        default=settings.default_user_id,
        help=f"User ID for session storage (default: {settings.default_user_id})"
    )
    parser.add_argument(
        "--timeout", "-t",
        type=int,
        default=300,
        help="Maximum wait time for login in seconds (default: 300)"
    )
    
    args = parser.parse_args()
    
    user_id = args.user
    timeout = args.timeout
    
    user_data_path = settings.get_user_data_path(user_id)
    
    print("=" * 60)
    print("ChatGPT Manual Login Script")
    print("=" * 60)
    print(f"User ID: {user_id}")
    print(f"Session Path: {user_data_path.absolute()}")
    print(f"Timeout: {timeout} seconds")
    print("=" * 60)
    print()
    
    page = None
    
    try:
        print("Starting browser...")
        options = create_browser_options(user_data_path)
        page = ChromiumPage(options)
        
        print("Navigating to ChatGPT...")
        page.get("https://chatgpt.com")
        time.sleep(2)
        
        # Check if already logged in
        if check_login_status(page):
            print()
            print("✓ Already logged in!")
            
            # Show cookie info
            cookie_info = check_cookies(page)
            print(f"  Total cookies: {cookie_info['total']}")
            print(f"  Session cookies: {len(cookie_info['session_cookies'])}")
            if cookie_info['session_cookies']:
                print("  Auth cookies found:")
                for c in cookie_info['session_cookies'][:5]:
                    print(f"    - {c['name']} ({c['domain']})")
            print()
            
            input("Press Enter to close the browser and upload session to S3...")
            
            print("Closing browser...")
            page.quit()
            print("Browser closed.")
            time.sleep(3)  # Increased wait time to 3s
            
            # Debug file sizes
            try:
                cookies_file = user_data_path / "Default" / "Cookies"
                local_state_file = user_data_path / "Local State"
                if cookies_file.exists():
                    print(f"DEBUG: Cookies file size: {cookies_file.stat().st_size} bytes")
                else:
                    print("DEBUG: Cookies file NOT FOUND")
                    
                if local_state_file.exists():
                    print(f"DEBUG: Local State file size: {local_state_file.stat().st_size} bytes")
                else:
                    print("DEBUG: Local State file NOT FOUND")
            except Exception as e:
                print(f"DEBUG: Error checking file sizes: {e}")

            # S3 Backup (after browser close)
            if settings.s3_enable_backup:
                print("Backing up session to S3...")
                try:
                    from app.services.storage import S3SessionManager
                    storage = S3SessionManager()
                    if storage.upload_session(user_id, user_data_path):
                        print("✓ Session uploaded to S3")
                    else:
                        print("✗ Failed to upload session to S3")
                except Exception as e:
                    print(f"✗ Error uploading to S3: {e}")
            else:
                print("S3 backup disabled (ENABLE_S3_BACKUP=false)")
                
        else:
            print()
            print("=" * 60)
            print("Please log in to ChatGPT in the browser window.")
            print("This script will detect when you've logged in.")
            print("=" * 60)
            print()
            
            # Wait for login
            start_time = time.time()
            logged_in = False
            
            while time.time() - start_time < timeout:
                if check_login_status(page):
                    logged_in = True
                    break
                
                elapsed = int(time.time() - start_time)
                remaining = timeout - elapsed
                print(f"\rWaiting for login... ({remaining}s remaining)  ", end="", flush=True)
                time.sleep(3)
            
            print()  # New line after progress
            
            if logged_in:
                print()
                print("=" * 60)
                print("✓ Login successful!")
                print("=" * 60)
                print()
                
                # Show cookie info
                cookie_info = check_cookies(page)
                print(f"Total cookies: {cookie_info['total']}")
                print(f"Session cookies: {len(cookie_info['session_cookies'])}")
                if cookie_info['session_cookies']:
                    print("Auth cookies found:")
                    for c in cookie_info['session_cookies'][:5]:
                        print(f"  - {c['name']} ({c['domain']})")
                
                print()
                print("Waiting a few seconds to ensure cookies are saved...")
                time.sleep(5)
                
                input("Press Enter to close the browser and upload session to S3...")
                
                print("Closing browser...")
                page.quit()
                print("Browser closed.")
                time.sleep(2)
                
                print("✓ Session saved locally!")
                print(f"  Location: {user_data_path.absolute()}")
                print()
                
                # S3 Backup (after browser close)
                if settings.s3_enable_backup:
                    print("Backing up session to S3...")
                    try:
                        from app.services.storage import S3SessionManager
                        storage = S3SessionManager()
                        if storage.upload_session(user_id, user_data_path):
                            print("✓ Session uploaded to S3")
                        else:
                            print("✗ Failed to upload session to S3")
                    except Exception as e:
                        print(f"✗ Error uploading to S3: {e}")
                else:
                    print("S3 backup disabled (ENABLE_S3_BACKUP=false)")
                
                print()
                print("You can now run the main service and it will use this session.")
                print()
            else:
                print()
                print("✗ Login timeout!")
                print("  Please try again.")
                print()
        
    except KeyboardInterrupt:
        print()
        print("Interrupted by user.")
    except Exception as e:
        print(f"Error: {e}")
        logger.exception("Error during manual login")
    finally:
        if page:
            try:
                print("Closing browser...")
                page.quit()
                time.sleep(2)  # Give Chrome time to flush data to disk
                print("Browser closed.")
            except Exception as e:
                logger.warning(f"Error closing browser: {e}")
    
    print()
    print("Done.")


if __name__ == "__main__":
    main()
