"""
ChatGPT Browser Automation Service.

This module provides browser automation for interacting with ChatGPT
using DrissionPage. It includes:
- Session management per user
- Human-like behavior simulation
- Login status detection
- CAPTCHA/verification detection
- Message sending and response retrieval
"""

import time
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

from DrissionPage import ChromiumOptions, ChromiumPage

from app.core.config import get_settings
from app.core.exceptions import (
    BrowserException,
    CaptchaDetectedError,
    LoginRequiredError,
)
from app.core.logging import get_logger
from app.services.human_behavior import (
    HumanBehaviorMixin,
    get_mouse_path_points,
    get_random_delay,
    should_do_micro_action,
    sync_human_delay,
)
from app.services.storage import S3SessionManager

logger = get_logger("browser")
settings = get_settings()


@dataclass
class ChatResponse:
    """Response from ChatGPT."""

    success: bool
    message: str = ""
    error: Optional[str] = None
    requires_login: bool = False
    requires_captcha: bool = False
    captcha_type: Optional[str] = None
    sources: Optional[list[dict]] = None  # List of {title, url} dicts from web search


@dataclass
class BrowserSession:
    """Represents a browser session for a user."""

    user_id: str
    page: Optional[ChromiumPage] = None
    is_logged_in: bool = False
    last_activity: float = field(default_factory=time.time)

    def update_activity(self) -> None:
        """Update last activity timestamp."""
        self.last_activity = time.time()


class ChatGPTBrowser(HumanBehaviorMixin):
    """
    Browser automation service for ChatGPT.

    Handles browser lifecycle, page interactions, and response retrieval
    with human-like behavior simulation.
    """

    CHATGPT_URL = "https://chatgpt.com"

    # Selectors (may need updates if ChatGPT UI changes)
    SELECTORS = {
        "prompt_textarea": "#prompt-textarea",
        "send_button": "@data-testid=send-button",
        "stop_button": "@data-testid=stop-button",
        "login_button": "text:Log in",
        "stay_logged_out_en": "text:Stay logged out",
        "stay_logged_out_cn": "text:保持退出状态",
        "new_chat_en": "text:New chat",
        "new_chat_cn": "text:新聊天",
        "assistant_messages": "@data-message-author-role=assistant",
        "markdown_content": ".markdown",
        "prose_content": ".prose",
        # CAPTCHA indicators
        "cloudflare_challenge": "#challenge-running",
        "recaptcha": ".g-recaptcha",
        "hcaptcha": ".h-captcha",
        "turnstile": ".cf-turnstile",
    }

    def __init__(self, user_id: Optional[str] = None):
        """
        Initialize ChatGPT browser service.

        Args:
            user_id: User identifier for session management.
        """
        self.user_id = user_id or settings.default_user_id
        self.user_data_path = settings.get_user_data_path(self.user_id)
        self.page: Optional[ChromiumPage] = None
        self._is_initialized = False
        self._login_attempted = False
        self.storage = S3SessionManager()

    def _safe_fill_input(self, element, value: str) -> None:
        """Fill input, clearing existing content when possible."""
        try:
            current = element.attr("value") or ""
            if current.strip() == value:
                return
        except Exception:
            pass

        try:
            element.input(value, clear=True)
            return
        except TypeError:
            pass
        except Exception:
            pass

        try:
            element.clear()
        except Exception:
            pass

        element.input(value)

    def _create_browser_options(self) -> ChromiumOptions:
        """Create browser options with user-specific data path."""
        co = ChromiumOptions()

        # Ensure user data directory exists
        self.user_data_path.mkdir(parents=True, exist_ok=True)

        # Force remove lock file if it exists (prevents "Browser connection fails" error)
        lock_file = self.user_data_path / "SingletonLock"
        if lock_file.exists():
            try:
                lock_file.unlink()
                logger.info(f"Removed stale lock file: {lock_file}")
            except Exception as e:
                logger.warning(f"Could not remove lock file: {e}")

        # Set user data path for session persistence
        co.set_user_data_path(str(self.user_data_path))

        # Headless mode (configurable)
        if settings.browser_headless:
            co.set_argument('--headless=new')

        # Docker-friendly flags (Chrome often needs these in containers)
        co.set_argument("--no-sandbox")
        co.set_argument("--disable-dev-shm-usage")
        co.set_argument("--disable-gpu")
        co.set_argument("--disable-software-rasterizer")
        co.set_argument("--remote-allow-origins=*")

        # Specific binary path if needed
        chrome_bin = os.environ.get("CHROME_BIN") or "/usr/bin/google-chrome"
        if Path(chrome_bin).exists():
            co.set_browser_path(chrome_bin)

        # Additional stealth options
        co.set_argument('--disable-blink-features=AutomationControlled')
        co.set_argument('--no-first-run')
        co.set_argument('--no-default-browser-check')

        # Window size for consistent behavior
        co.set_argument('--window-size=1920,1080')

        # Automatically assign a free port to support concurrency
        # This will set the port Chrome listens on and DrissionPage connects to
        co.auto_port()

        return co

    def initialize(self) -> None:
        """Initialize browser and navigate to ChatGPT."""
        if self._is_initialized and self.page:
            logger.info(f"Browser already initialized for user {self.user_id}")
            return

        logger.info(f"Initializing browser for user {self.user_id}")

        try:
            # Try to restore session from S3 (skip for default user)
            is_default_user = (self.user_id == settings.default_user_id)
            if not is_default_user:
                if self.storage.download_session(self.user_id, self.user_data_path):
                    logger.info(f"Restored session for user {self.user_id} from S3")
                else:
                    logger.info(f"No remote session found for user {self.user_id}, starting fresh")
            else:
                logger.info("Skipping S3 download for default user (local only)")

            options = self._create_browser_options()
            
            # Add retry logic for browser initialization to handle transient "Handshake 404" errors
            max_retries = 3
            last_error = None
            for attempt in range(max_retries):
                try:
                    logger.info(f"Starting browser (attempt {attempt + 1}/{max_retries})...")
                    self.page = ChromiumPage(options)
                    break
                except Exception as e:
                    last_error = e
                    if attempt < max_retries - 1:
                        logger.warning(f"Browser start failed: {e}. Retrying in 2s...")
                        time.sleep(2)
                    else:
                        logger.error(f"Browser start failed after {max_retries} attempts.")
                        raise BrowserException(f"Browser initialization failed: {last_error}")

            self._is_initialized = True

            # Navigate to ChatGPT
            logger.info("Navigating to ChatGPT...")
            self.page.get(self.CHATGPT_URL)

            # Initial delay for page load
            sync_human_delay(400, 800)

            # Handle initial popups
            self._handle_popups()

            # Check for CAPTCHA / human verification early (e.g. Cloudflare challenge page)
            captcha_type = self.check_captcha()
            if captcha_type:
                logger.warning(f"CAPTCHA detected ({captcha_type}), attempting auto-solution...")
                if self._attempt_captcha_solution(captcha_type):
                    logger.info("CAPTCHA solved during initialization")
                else:
                    raise CaptchaDetectedError(captcha_type)

            # Check login status immediately
            is_logged_in = self.check_login_status()
            
            # Check for Guest Mode if not fully logged in
            is_guest_mode = False
            if not is_logged_in:
                textarea = self.page.ele(self.SELECTORS["prompt_textarea"], timeout=5) or \
                           self.page.ele('css:textarea[id="prompt-textarea"]') or \
                           self.page.ele('css:div[contenteditable="true"]')
                if textarea:
                    logger.info("Guest mode detected (Login button present but input available)")
                    is_guest_mode = True

            if not is_logged_in and not is_guest_mode:
                logger.info("Login check failed on startup, attempting auto-login...")
                
                # Try auto-login if credentials are configured
                if settings.openai_email and settings.openai_password and not self._login_attempted:
                    self._login_attempted = True
                    if self.perform_auto_login():
                        logger.info("Auto-login successful")
                        return
                    else:
                        logger.error("Auto-login failed")
                
                # If auto-login failed or not configured, raise error
                # But allow ignoring login check if specifically configured or strictly needed?
                # For now, strict check unless guest mode
                if self.page.ele(self.SELECTORS["login_button"]) or "auth.openai.com" in self.page.url:
                    raise LoginRequiredError(self.user_id)
                
                raise LoginRequiredError(self.user_id)

        except (CaptchaDetectedError, LoginRequiredError):
            # Let caller handle these explicitly (task status WAITING_CAPTCHA / WAITING_LOGIN)
            raise
        except Exception as e:
            logger.error(f"Failed to initialize browser: {e}")
            self._is_initialized = False
            # If initialization failed, we should probably close the page if it was opened
            if self.page:
                try:
                    self.page.quit()
                except:
                    pass
                self.page = None
            raise BrowserException(f"Browser initialization failed: {e}")

    def _handle_popups(self) -> None:
        """Handle common popups that may appear."""
        # Handle "Stay logged out" popup
        for selector in [self.SELECTORS["stay_logged_out_en"], 
                        self.SELECTORS["stay_logged_out_cn"]]:
            try:
                btn = self.page.ele(selector, timeout=3)
                if btn:
                    logger.info("Handling 'Stay logged out' popup")
                    self.before_action("popup_dismiss")
                    self.page.actions.move_to(btn).click()
                    self.after_action("popup_dismiss")
                    break
            except Exception:
                pass

    def _attempt_captcha_solution(self, captcha_type: str) -> bool:
        """
        Attempt to automatically solve CAPTCHA (Cloudflare/Turnstile).
        Strategy: Find the clicking area (checkbox/iframe) and click it.
        
        Args:
            captcha_type: The detected CAPTCHA type.
            
        Returns:
            True if CAPTCHA seems resolved, False otherwise.
        """
        logger.info(f"Attempting to solve {captcha_type}...")
        
        try:
            # Common strategy for Cloudflare / Turnstile:
            # 1. Find the challenge iframe or container
            # 2. Click the checkbox or the container center
            # 3. Wait and check if verified
            
            # Selectors for clickable areas
            click_targets = [
                # Turnstile / Cloudflare specific
                "css:iframe[src*='challenges.cloudflare.com']",
                "css:iframe[src*='turnstile']",
                ".cf-turnstile-wrapper",
                "#turnstile-wrapper",
                # Generic checkbox in shadow DOM or iframes often used
                "css:input[type='checkbox']",
                "css:div.cb-i", # older cloudflare
                # Text that says "Verify you are human"
                "text:Verify you are human",
                "text:确认您是真人",
            ]
            
            target = None
            for sel in click_targets:
                # Try finding in main page first
                ele = self.page.ele(sel, timeout=2)
                if ele:
                    target = ele
                    break
            
            if not target:
                # Search inside all iframes if not found in main page
                for iframe in self.page.frames:
                    for sel in ["css:input[type='checkbox']", "#challenge-stage", ".ctp-checkbox-label"]:
                        try:
                            ele = iframe.ele(sel, timeout=1)
                            if ele:
                                target = ele
                                break
                        except:
                            pass
                    if target: break

            if target:
                logger.info(f"Found CAPTCHA target: {target}")
                sync_human_delay(500, 1500)
                
                # Move mouse and click
                try:
                    self.page.actions.move_to(target).click()
                except:
                    # Fallback JS click
                    target.click(by_js=True)
                
                logger.info("Clicked CAPTCHA target, waiting for resolution...")
                
                # Wait loop to check if CAPTCHA disappears
                start_wait = time.time()
                while time.time() - start_wait < 30: # Wait up to 30s
                    sync_human_delay(800, 1500)
                    if not self.check_captcha():
                        logger.info("CAPTCHA resolved successfully")
                        return True
                        
                logger.warning("CAPTCHA did not disappear after clicking")
                return False
            else:
                logger.warning("Could not find clickable CAPTCHA target")
                return False
                
        except Exception as e:
            logger.error(f"Error attempting CAPTCHA solution: {e}")
            return False

    def check_captcha(self) -> Optional[str]:
        """
        Check if a CAPTCHA or verification challenge is present.

        Returns:
            CAPTCHA type if detected, None otherwise.
        """
        captcha_selectors = {
            "cloudflare": self.SELECTORS["cloudflare_challenge"],
            "recaptcha": self.SELECTORS["recaptcha"],
            "hcaptcha": self.SELECTORS["hcaptcha"],
            "turnstile": self.SELECTORS["turnstile"],
        }

        for captcha_type, selector in captcha_selectors.items():
            try:
                if self.page.ele(selector, timeout=1):
                    logger.warning(f"CAPTCHA detected: {captcha_type}")
                    return captcha_type
            except Exception:
                pass

        return None

    def check_login_status(self) -> bool:
        """
        Check if user is logged in to ChatGPT.

        Returns:
            True if logged in, False otherwise.
        """
        try:
            # Check for login button presence first (indicates not logged in)
            # We check this first because presence of login button definitively means "not fully logged in"
            # even if the guest chat input is visible.
            login_btn = self.page.ele(self.SELECTORS["login_button"], timeout=3) or \
                        self.page.ele('text:登录', timeout=3) or \
                        self.page.ele('@data-testid=login-button', timeout=3)
            
            if login_btn:
                logger.debug("Login button found - user not logged in")
                return False

            # Check for prompt textarea (indicates logged in and ready)
            textarea = self.page.ele(self.SELECTORS["prompt_textarea"], timeout=5) or \
                       self.page.ele('css:textarea[id="prompt-textarea"]') or \
                       self.page.ele('css:div[contenteditable="true"]')
            
            if textarea:
                logger.debug("Prompt textarea found without login button - user appears logged in")
                return True
            
            # Check if we are on the auth page
            if "auth.openai.com" in self.page.url or "login" in self.page.url:
                logger.debug("Detected login page URL")
                return False

            return False

        except Exception as e:
            logger.warning(f"Error checking login status: {e}")
            return False

    def perform_auto_login(self) -> bool:
        """
        Attempt automatic login using configured credentials.
        
        Returns:
            True if login successful, False otherwise.
        """
        email = settings.openai_email
        password = settings.openai_password
        
        if not email or not password:
            logger.warning("No credentials provided for auto-login")
            return False

        logger.info("Attempting automatic login...")
        
        try:
            # 1. Ensure we are not on a login page
            if "auth.openai.com" not in self.page.url and "login" not in self.page.url:
                 # Try clicking login button if on main page
                 login_btn = self.page.ele(self.SELECTORS["login_button"]) or \
                             self.page.ele('text:登录') or \
                             self.page.ele('@data-testid=login-button')
                 if login_btn:
                     logger.info("Clicking Log in button...")
                     login_btn.click()
                     sync_human_delay(800, 1200)
            
            # 2. Enter Email
            # Try multiple selectors for email input
            email_input = self.page.ele("css:input[name='email']", timeout=10) or \
                          self.page.ele("css:input[type='email']", timeout=5) or \
                          self.page.ele("@inputmode=email", timeout=5)
            
            if email_input:
                logger.info(f"Entering email...")
                self.before_action("login_email")
                self._safe_fill_input(email_input, email)
                self.after_action("login_email")
                
                # Click Continue (Use exact match text= to avoid matching social login buttons)
                continue_btn = self.page.ele("text=Continue") or \
                               self.page.ele("text=继续") or \
                               self.page.ele("css:button[type='submit']") or \
                               self.page.ele("@class=continue-btn")
                
                if continue_btn:
                    logger.info("Clicking Continue...")
                    self.page.actions.move_to(continue_btn).click()
                    sync_human_delay(800, 1500)
                else:
                    logger.warning("Continue button not found")
                    return False
                    
                # 3. Handle Password
                # Check if we are still on OpenAI or redirected (e.g. Microsoft)
                
                # Case A: Microsoft Login (login.live.com)
                if "login.live.com" in self.page.url:
                    logger.info("Detected Microsoft login redirect")
                    
                    # Check for "Use password" option
                    use_password_btn = self.page.ele("text:Use password", timeout=3) or \
                                       self.page.ele("text:使用密码", timeout=3)
                    if use_password_btn:
                        logger.info("Clicking 'Use password'...")
                        self.page.actions.move_to(use_password_btn).click()
                        sync_human_delay(500, 1000)

                    # Wait for password field
                    password_input = self.page.ele("css:input[name='passwd']", timeout=10) or \
                                     self.page.ele("css:input[type='password']", timeout=10)
                    
                    if password_input:
                        logger.info("Entering Microsoft password...")
                        self.before_action("login_password")
                        self._safe_fill_input(password_input, password)
                        self.after_action("login_password")
                        
                        # Click Sign in
                        submit_btn = self.page.ele("css:input[type='submit']") or \
                                     self.page.ele("css:button[type='submit']") or \
                                     self.page.ele("text:Sign in") or \
                                     self.page.ele("text:登录")
                                     
                        if submit_btn:
                            self.page.actions.move_to(submit_btn).click()
                            logger.info("Clicked Sign in (Microsoft)")
                            
                            # Handle "Stay signed in?" prompt
                            stay_signed_in = self.page.ele("text:Stay signed in?", timeout=10) or \
                                             self.page.ele("text:保持登录状态?", timeout=10) or \
                                             self.page.ele("text:是否保持登录状态?", timeout=10)
                            if stay_signed_in:
                                # Microsoft's "Yes" button usually has id="idSIButton9"
                                yes_btn = self.page.ele('#idSIButton9', timeout=5) or \
                                          self.page.ele("text=是") or \
                                          self.page.ele("text=Yes")
                                if yes_btn:
                                    logger.info("Clicking 'Yes' to stay signed in")
                                    if yes_btn.states.is_displayed:
                                        try:
                                            self.page.actions.move_to(yes_btn).click()
                                        except:
                                            yes_btn.click()
                                    else:
                                        yes_btn.click(by_js=True)
                    else:
                        logger.warning("Microsoft password input not found")
                        return False

                # Case B: Standard OpenAI Password
                else:
                    password_input = self.page.ele("css:input[name='password']", timeout=10) or \
                                     self.page.ele("css:input[type='password']", timeout=10)
                    
                    if password_input:
                        logger.info("Entering OpenAI password...")
                        self.before_action("login_password")
                        self._safe_fill_input(password_input, password)
                        self.after_action("login_password")
                        
                        submit_btn = self.page.ele("text:Log in") or \
                                     self.page.ele("text:Sign in") or \
                                     self.page.ele("text:登录") or \
                                     self.page.ele("css:button[type='submit']")
                        
                        if submit_btn:
                            self.page.actions.move_to(submit_btn).click()
                            logger.info("Clicked Log in (OpenAI)")
                    else:
                        # Could be SSO or other flow
                        logger.warning("Password input not found (might be SSO)")
                        # If we can't find password input, maybe we are already logging in?
                        pass

                # 4. Wait for login completion
                logger.info("Waiting for login to complete...")
                if self.wait_for_manual_login(timeout=60):
                    logger.info("Auto-login successful!")
                    return True
                else:
                    logger.error("Auto-login timed out")
                    return False
            else:
                logger.warning("Email input not found")
                return False

        except Exception as e:
            logger.error(f"Auto-login failed: {e}")
            return False

    def wait_for_manual_login(self, timeout: int = 300) -> bool:
        """
        Wait for user to complete manual login.

        Args:
            timeout: Maximum wait time in seconds.

        Returns:
            True if login detected, False if timeout.
        """
        logger.info(f"Waiting for manual login (timeout: {timeout}s)")
        start_time = time.time()

        while time.time() - start_time < timeout:
            if self.check_login_status():
                logger.info("Login detected!")
                return True

            # Check for CAPTCHA during login
            captcha_type = self.check_captcha()
            if captcha_type:
                logger.info(f"CAPTCHA detected during login: {captcha_type}")

            time.sleep(2)

        logger.warning("Login wait timeout")
        return False

    def _enable_search(self) -> bool:
        """
        Enable web search feature if available.

        Returns:
            True if search was enabled, False otherwise.
        """
        logger.info("Attempting to enable web search...")

        try:
            # New UI flow (as per screenshots): click "+" -> (optional) click "More" -> click "Web search/网页搜索"
            attach_selectors = [
                "@@tag:button@@aria-label=Attach files",
                "@@tag:button@@aria-label=添加附件",
                "@@tag:button@@aria-label=Attach",
                "@@tag:button@@aria-label=Add",
                "@@tag:button@@aria-label=添加",
                "@@tag:button@@aria-label=附件",
                "@@tag:div@@role=button@@aria-label=Attach files",
                "@@tag:div@@role=button@@aria-label=Attach",
                "@@tag:div@@role=button@@aria-label=添加附件",
                "@@tag:div@@role=button@@aria-label=添加",
                "@@tag:div@@role=button@@aria-label=附件",
                "@data-testid=attach-button",
                "@data-testid=attachments-button",
                "@data-testid=attachment-button",
                "@data-testid=plus-button",
                "css:button[aria-label*=\"Attach\"]",
                "css:button[aria-label*=\"Add\"]",
                "css:button[aria-label*=\"添加\"]",
                "css:button[aria-label*=\"附件\"]",
                "css:button[title*='Attach']",
                "css:button[title*='Add']",
                "css:button[title*='附件']",
                "css:button[data-testid*='attach']",
                "css:button[data-testid*='attachment']",
                "css:div[role='button'][aria-label*='Attach']",
                "css:div[role='button'][aria-label*='添加']",
                "css:div[role='button'][aria-label*='附件']",
            ]

            attach_btn = None
            attach_hit = None
            for sel in attach_selectors:
                try:
                    btn = self.page.ele(sel, timeout=2)
                    if btn and btn.states.is_displayed:
                        attach_btn = btn
                        attach_hit = sel
                        break
                except Exception:
                    continue

            # Fallback: prompt textarea -> its form -> first visible button (excluding send)
            if not attach_btn:
                prompt = self.page.ele(self.SELECTORS["prompt_textarea"], timeout=2) or \
                         self.page.ele('css:textarea[id="prompt-textarea"]', timeout=2) or \
                         self.page.ele('css:div[contenteditable="true"]', timeout=2)
                if prompt:
                    try:
                        form = prompt.parent('tag:form')
                        if form:
                            buttons = form.eles('css:button')
                            for b in buttons:
                                if not b or not b.states.is_displayed:
                                    continue
                                dt = ""
                                try:
                                    dt = (b.attr('data-testid') or '').lower()
                                except Exception:
                                    dt = ""
                                if 'send' in dt:
                                    continue
                                attach_btn = b
                                attach_hit = 'fallback:form_first_visible_button'
                                break
                    except Exception:
                        pass

            if not attach_btn:
                logger.warning("Attach (+) button not found")
                try:
                    self._save_debug_info()
                except Exception:
                    pass
                return False

            logger.debug(f"Attach button selector hit: {attach_hit}")
            self.before_action("enable_search_open_menu")
            try:
                self.page.actions.move_to(attach_btn).click()
            except Exception:
                try:
                    attach_btn.click()
                except Exception:
                    attach_btn.click(by_js=True)
            self.after_action("enable_search_open_menu")
            sync_human_delay(200, 400)

            def _find_search_option(timeout: int = 2):
                # Use exact-match text= to reduce false positives.
                search_option_selectors = [
                    "text=Web search",
                    "text=Search the web",
                    "text=网页搜索",
                    "text=联网搜索",
                ]
                for s in search_option_selectors:
                    try:
                        ele = self.page.ele(s, timeout=timeout)
                        if ele and ele.states.is_displayed:
                            return ele
                    except Exception:
                        continue
                return None

            search_option = _find_search_option(timeout=1)
            if search_option:
                logger.info("Found web search option directly, clicking...")
                self.before_action("enable_search")
                self.page.actions.move_to(search_option).click()
                self.after_action("enable_search")
                return True

            more_option = self.page.ele("text=More", timeout=1) or self.page.ele("text=更多", timeout=1) or self.page.ele("text=More...", timeout=1)
            if more_option and more_option.states.is_displayed:
                logger.info("Hovering 'More' to expand menu...")
                self.before_action("enable_search_more_hover")
                try:
                    self.page.actions.move_to(more_option)
                except Exception:
                    pass
                self.after_action("enable_search_more_hover")
                sync_human_delay(400, 900)

                search_option = _find_search_option(timeout=2)
                if search_option:
                    logger.info("Found web search option in submenu, clicking...")
                    self.before_action("enable_search")
                    self.page.actions.move_to(search_option).click()
                    self.after_action("enable_search")
                    return True

                # Last resort: some UIs require click to open submenu (but some close immediately)
                try:
                    logger.info("Hover did not reveal submenu; trying click on 'More' (fallback)...")
                    self.before_action("enable_search_more")
                    self.page.actions.move_to(more_option).click()
                    self.after_action("enable_search_more")
                    sync_human_delay(400, 900)
                    search_option = _find_search_option(timeout=2)
                    if search_option:
                        self.before_action("enable_search")
                        self.page.actions.move_to(search_option).click()
                        self.after_action("enable_search")
                        return True
                except Exception:
                    pass

            # Retry once: menu may fail to open due to focus/overlay.
            logger.debug("Web search option not found; retrying open menu once")
            try:
                self.page.actions.move_to(attach_btn).click()
            except Exception:
                try:
                    attach_btn.click()
                except Exception:
                    attach_btn.click(by_js=True)
            sync_human_delay(400, 900)

            search_option = _find_search_option(timeout=1)
            if search_option:
                self.before_action("enable_search")
                self.page.actions.move_to(search_option).click()
                self.after_action("enable_search")
                return True

            more_option = self.page.ele("text=More", timeout=1) or self.page.ele("text=更多", timeout=1) or self.page.ele("text=More...", timeout=1)
            if more_option and more_option.states.is_displayed:
                self.before_action("enable_search_more_hover")
                try:
                    self.page.actions.move_to(more_option)
                except Exception:
                    pass
                self.after_action("enable_search_more_hover")
                sync_human_delay(400, 900)
                search_option = _find_search_option(timeout=2)
                if search_option:
                    self.before_action("enable_search")
                    self.page.actions.move_to(search_option).click()
                    self.after_action("enable_search")
                    return True

            logger.debug("Web search option not found or not available")
            try:
                self._save_debug_info()
            except Exception:
                pass
            return False

        except Exception as e:
            logger.error(f"Error enabling search: {e}")
            try:
                self._save_debug_info()
            except Exception:
                pass
            return False

    def _type_message_humanlike(self, message: str) -> None:
        """
        Type a message with human-like behavior.

        Args:
            message: The message to type.
        """
        textarea = self.page.ele(self.SELECTORS["prompt_textarea"], timeout=10) or \
                   self.page.ele('css:textarea[id="prompt-textarea"]') or \
                   self.page.ele('css:div[contenteditable="true"]')
        
        if not textarea:
            raise BrowserException("Could not find prompt textarea")

        # Click on textarea first
        self.before_action("focus_textarea")
        self.page.actions.move_to(textarea).click()
        self.after_action("focus_textarea")

        # Type message with occasional pauses
        logger.info("Typing message with human-like behavior...")

        # Use DrissionPage's input which is more reliable
        # But add some human-like delays around it
        if should_do_micro_action():
            sync_human_delay(200, 500)

        textarea.input(message)

        # Short pause after typing
        sync_human_delay(100, 300)

    def _click_send(self) -> None:
        """Click the send button with human-like behavior."""
        send_btn = self.page.ele(self.SELECTORS["send_button"], timeout=5) or \
                   self.page.ele('css:button[data-testid="send-button"]') or \
                   self.page.ele('@@tag:button@@aria-label=Send prompt') or \
                   self.page.ele('@@tag:button@@aria-label=发送')
        
        if not send_btn:
            raise BrowserException("Could not find send button")

        logger.info("Clicking send button...")
        self.before_action("send")

        # Move mouse naturally to button and click
        self.page.actions.move_to(send_btn).click()

        self.after_action("send")

    def _wait_for_response(self, timeout: int = 360) -> str:
        """
        Wait for ChatGPT response to complete.

        Args:
            timeout: Maximum wait time in seconds.

        Returns:
            The response text.
        """
        logger.info("Waiting for response...")

        # Wait for stop button to appear (response started)
        try:
            self.page.wait.ele_displayed(
                self.SELECTORS["stop_button"],
                timeout=30
            )
        except Exception:
            logger.debug("Stop button not detected, response may be quick")

        # Wait for stop button to disappear (response complete)
        # Use polling loop to check periodically
        start_time = time.time()
        last_text = ""
        stable_count = 0
        stop_seen = False

        while time.time() - start_time < timeout:
            try:
                captcha_type = self.check_captcha()
                if captcha_type:
                    logger.warning(f"CAPTCHA detected during wait ({captcha_type}), attempting auto-solution...")
                    if self._attempt_captcha_solution(captcha_type):
                        logger.info("CAPTCHA solved, resuming wait")
                        # Reset stop_seen might be needed if page refreshed? 
                        # Assuming flow continues.
                    else:
                        raise CaptchaDetectedError(captcha_type)

                if self.page.ele(self.SELECTORS["stop_button"]):
                    stop_seen = True
                    time.sleep(2)
                    continue

                text = self._get_latest_response_text()
                if text:
                    if text == last_text:
                        stable_count += 1
                    else:
                        stable_count = 0
                        last_text = text

                    if stop_seen and stable_count >= 2:
                        logger.info("Response generation completed")
                        return text

                    if not stop_seen and stable_count >= 2:
                        logger.info("Response detected without stop button")
                        return text

                time.sleep(2)
            except Exception as e:
                message = str(e)
                if "连接已断开" in message or "disconnected" in message.lower():
                    logger.error("Page disconnected, aborting response wait")
                    return ""
                logger.warning(f"Error during wait loop: {e}")
                time.sleep(2)

        logger.warning("Timeout waiting for response")

        # Small delay for DOM to settle
        sync_human_delay(800, 1500)

        # Get response (with debug info if still empty)
        return self._extract_response()

    def _get_latest_response_text(self) -> str:
        """Return latest assistant response text without side effects."""
        selectors = [
            self.SELECTORS["assistant_messages"],
            self.SELECTORS["markdown_content"],
            self.SELECTORS["prose_content"],
        ]

        for selector in selectors:
            try:
                elements = self.page.eles(selector)
                if elements:
                    last_response = elements[-1].text
                    if last_response.strip():
                        return last_response.strip()
            except Exception:
                continue

        return ""

    def _extract_response(self) -> str:
        """
        Extract the latest assistant response from the page.

        Returns:
            The response text.
        """
        # Try multiple selectors for compatibility
        selectors = [
            self.SELECTORS["assistant_messages"],
            self.SELECTORS["markdown_content"],
            self.SELECTORS["prose_content"],
            "css:div[data-message-author-role='assistant']",
        ]

        for selector in selectors:
            try:
                elements = self.page.eles(selector)
                if elements:
                    # Get the last response
                    last_response = elements[-1].text
                    if last_response.strip():
                        return last_response.strip()
            except Exception as e:
                logger.debug(f"Selector {selector} failed: {e}")

        # If we couldn't find response, save debug info
        logger.warning("Could not extract response, saving debug info")
        self._save_debug_info()

        return ""

    def _get_sources(self) -> list[dict]:
        """
        Extract web search reference sources from the page.
        
        Returns:
            List of dicts with 'title' and 'url' keys.
        """
        logger.info("Extracting web search sources...")
        
        def _is_valid_source_url(url: str) -> bool:
            """Check if URL is a valid external source."""
            if not url or not url.startswith('http'):
                return False
            try:
                parsed = urlparse(url)
                host = parsed.netloc.lower()
                # Filter ChatGPT internal links (check domain, not URL params)
                if host.endswith('chatgpt.com') or host.endswith('openai.com'):
                    return False
                # Filter noise
                exclude_patterns = [
                    'twitter.com/intent', 'facebook.com/sharer', 
                    'linkedin.com/shareArticle', 'cdn-cgi'
                ]
                for pattern in exclude_patterns:
                    if pattern in url:
                        return False
                return True
            except Exception:
                return False
        
        # Try to find and click the sources button
        try:
            # Scroll to bottom to ensure sources button is visible
            try:
                scrollable_divs = self.page.eles('css:div[class*="overflow-y-auto"]')
                if scrollable_divs:
                    scrollable_divs[-1].scroll.to_bottom()
                    sync_human_delay(300, 600)
            except Exception:
                pass
            
            # Find sources button
            source_btn = self.page.ele('text:来源', timeout=3) or \
                         self.page.ele('text:Sources', timeout=2) or \
                         self.page.ele('@data-testid=source-button', timeout=2) or \
                         self.page.ele('text:个来源', timeout=1) or \
                         self.page.ele('text:sources', timeout=1)
            
            if not source_btn:
                logger.debug("No sources button found")
                return []
            
            logger.debug("Found sources button, clicking to expand...")
            
            # Click to open sidebar
            sidebar_title = None
            for attempt in range(2):
                try:
                    if attempt == 0:
                        self.page.actions.move_to(source_btn).click()
                    else:
                        source_btn.click(by_js=True)
                except Exception as e:
                    logger.debug(f"Click attempt {attempt} failed: {e}")
                    continue
                
                # Wait for sidebar to appear
                for _ in range(10):
                    sync_human_delay(400, 600)
                    # Look for sidebar title
                    candidates = self.page.eles('text:引用') or self.page.eles('text:Sources')
                    for t in reversed(candidates):
                        try:
                            if t.states.is_displayed and len(t.text) <= 20:
                                sidebar_title = t
                                break
                        except Exception:
                            continue
                    if sidebar_title:
                        break
                
                if sidebar_title:
                    break
            
            if not sidebar_title:
                logger.debug("Sidebar did not open")
                return []
            
            logger.debug("Sidebar opened, extracting links...")
            
            # Find container with links
            container = None
            current_ele = sidebar_title
            for i in range(1, 7):
                try:
                    parent = current_ele.parent()
                    if not parent or parent.tag in ('body', 'html'):
                        break
                    
                    sub_links = parent.eles('tag:a')
                    valid_count = sum(1 for l in sub_links if l.link and _is_valid_source_url(l.link))
                    
                    if valid_count >= 1:
                        container = parent
                        # Check grandparent for more links
                        try:
                            grandparent = parent.parent()
                            if grandparent and grandparent.tag not in ('body', 'html'):
                                gp_links = grandparent.eles('tag:a')
                                gp_valid_count = sum(1 for l in gp_links if l.link and _is_valid_source_url(l.link))
                                if gp_valid_count > valid_count:
                                    container = grandparent
                        except Exception:
                            pass
                        break
                    
                    current_ele = parent
                except Exception:
                    break
            
            if not container:
                container = self.page
            
            # Extract links
            results = []
            seen_urls = set()
            
            # Strategy 1: Find elements with alt attribute containing http (ChatGPT specific)
            alt_elements = container.eles('css:[alt*="http"]')
            for ele in alt_elements:
                try:
                    url = ele.attr('alt')
                    if not _is_valid_source_url(url):
                        continue
                    
                    title = ele.text or ''
                    if not title or len(title) < 3:
                        try:
                            parent = ele.parent()
                            if parent:
                                title = parent.text or ''
                        except Exception:
                            pass
                    if not title or len(title) < 3:
                        title = url
                    
                    if url not in seen_urls:
                        title = title.replace('\n', ' ').strip()[:200] or url
                        results.append({'title': title, 'url': url})
                        seen_urls.add(url)
                except Exception:
                    continue
            
            # Strategy 2: Standard <a> tag href
            if not results:
                links = container.eles('tag:a')
                for link in links:
                    try:
                        url = link.link
                        if not _is_valid_source_url(url):
                            continue
                        title = link.text or link.attr('aria-label') or link.attr('title') or url
                        if url not in seen_urls:
                            title = title.replace('\n', ' ').strip()[:200] or url
                            results.append({'title': title, 'url': url})
                            seen_urls.add(url)
                    except Exception:
                        continue
            
            # Strategy 3: Full page search for alt links
            if not results:
                all_alt_elements = self.page.eles('css:[alt*="http"]')
                for ele in all_alt_elements:
                    try:
                        url = ele.attr('alt')
                        if not _is_valid_source_url(url):
                            continue
                        title = ele.text or ''
                        if not title or len(title) < 3:
                            try:
                                parent = ele.parent()
                                if parent:
                                    title = parent.text or ''
                            except Exception:
                                pass
                        if not title or len(title) < 3:
                            title = url
                        
                        if url not in seen_urls:
                            title = title.replace('\n', ' ').strip()[:200] or url
                            results.append({'title': title, 'url': url})
                            seen_urls.add(url)
                    except Exception:
                        continue
            
            logger.info(f"Extracted {len(results)} source references")
            return results
            
        except Exception as e:
            logger.warning(f"Error extracting sources: {e}")
            return []

    def _save_debug_info(self) -> None:
        """Save screenshot and page source for debugging."""
        try:
            debug_dir = Path("./logs/debug")
            debug_dir.mkdir(parents=True, exist_ok=True)

            timestamp = int(time.time())

            # Screenshot
            screenshot_path = debug_dir / f"debug_{timestamp}.png"
            self.page.get_screenshot(path=str(screenshot_path), full_page=True)
            logger.info(f"Debug screenshot saved: {screenshot_path}")

            # Page source
            html_path = debug_dir / f"debug_{timestamp}.html"
            with open(html_path, 'w', encoding='utf-8') as f:
                f.write(self.page.html)
            logger.info(f"Debug HTML saved: {html_path}")

        except Exception as e:
            logger.error(f"Failed to save debug info: {e}")

    def send_message(
        self,
        message: str,
        enable_search: bool = True,
        timeout: int = 360
    ) -> ChatResponse:
        """
        Send a message to ChatGPT and get the response.

        Args:
            message: The message to send.
            enable_search: Whether to enable web search.
            timeout: Response timeout in seconds.

        Returns:
            ChatResponse with the result.
        """
        try:
            # Ensure browser is initialized
            if not self._is_initialized:
                self.initialize()

            # Check for CAPTCHA
            captcha_type = self.check_captcha()
            if captcha_type:
                return ChatResponse(
                    success=False,
                    requires_captcha=True,
                    captcha_type=captcha_type,
                    error=f"CAPTCHA detected: {captcha_type}"
                )

            # Handle any popups
            self._handle_popups()

            # Check login status and guest mode availability
            is_logged_in = self.check_login_status()
            
            # Determine if we can proceed (Logged in OR Guest mode with textarea)
            can_proceed = is_logged_in
            if not can_proceed:
                # Check if guest mode is available (textarea present despite not being logged in)
                textarea = self.page.ele(self.SELECTORS["prompt_textarea"], timeout=5) or \
                           self.page.ele('css:textarea[id="prompt-textarea"]') or \
                           self.page.ele('css:div[contenteditable="true"]')
                if textarea:
                    logger.info("Not logged in but prompt textarea found - attempting Guest Mode")
                    can_proceed = True
            
            if not can_proceed:
                return ChatResponse(
                    success=False,
                    requires_login=True,
                    error="Login required"
                )

            # Wait for textarea to be ready
            if settings.browser_new_chat_per_task:
                self.start_new_chat()
                sync_human_delay(200, 500)

            if not self.page.ele(self.SELECTORS["prompt_textarea"], timeout=15):
                return ChatResponse(
                    success=False,
                    error="Could not access chat interface"
                )

            # Handle any popups that appeared
            self._handle_popups()

            # Enable search if requested
            if enable_search:
                self._enable_search()

            # Type and send message
            self._type_message_humanlike(message)
            self._click_send()

            # Check if sending triggered a login prompt (e.g. Guest limit reached)
            sync_human_delay(200, 500)
            if self.page.ele('text:Log in to continue', timeout=2) or \
               self.page.ele('text:登录以继续', timeout=2) or \
               self.page.ele('text:Sign up to continue', timeout=2) or \
               ("auth.openai.com" in self.page.url):
                return ChatResponse(
                    success=False,
                    requires_login=True,
                    error="Login required to continue"
                )

            # Wait for response
            response_text = self._wait_for_response(timeout)

            if response_text:
                # Extract sources if web search was enabled
                sources = None
                if enable_search:
                    sources = self._get_sources()
                
                return ChatResponse(
                    success=True,
                    message=response_text,
                    sources=sources if sources else None
                )
            else:
                return ChatResponse(
                    success=False,
                    error="Could not retrieve response"
                )

        except CaptchaDetectedError as e:
            return ChatResponse(
                success=False,
                requires_captcha=True,
                captcha_type=e.details.get("captcha_type"),
                error=str(e)
            )
        except LoginRequiredError as e:
            return ChatResponse(
                success=False,
                requires_login=True,
                error=str(e)
            )
        except Exception as e:
            logger.error(f"Error sending message: {e}")
            return ChatResponse(
                success=False,
                error=str(e)
            )

    def start_new_chat(self) -> bool:
        """
        Start a new chat session.

        Returns:
            True if successful, False otherwise.
        """
        try:
            # Try opening the sidebar if it's collapsed
            sidebar_selectors = [
                "@@tag:button@@aria-label=Open sidebar",
                "@@tag:button@@aria-label=打开侧边栏",
                "@@tag:button@@aria-label=Show sidebar",
                "@@tag:button@@aria-label=展开侧边栏",
            ]

            for selector in sidebar_selectors:
                try:
                    btn = self.page.ele(selector, timeout=1)
                    if btn and btn.states.is_displayed:
                        logger.info("Opening sidebar...")
                        self.page.actions.move_to(btn).click()
                        self.page.wait(0.5)
                        break
                except Exception:
                    pass

            # Try clicking "New chat" button first
            new_chat_selectors = [
                self.SELECTORS.get("new_chat_en", "text:New chat"),
                self.SELECTORS.get("new_chat_cn", "text:新聊天"),
                "@@aria-label=New chat",
                "@@aria-label=新聊天",
                "@@tag:button@@aria-label=New chat",
                "@@tag:button@@aria-label=新聊天",
                "@@tag:button@@title=New chat",
                "@data-testid=new-chat-button",
                "@data-testid=new-chat",
            ]

            for selector in new_chat_selectors:
                btn = self.page.ele(selector, timeout=3)
                if btn and btn.states.is_displayed:
                    logger.info("Starting new chat via button...")
                    self.before_action("new_chat")
                    self.page.actions.move_to(btn).click()
                    self.after_action("new_chat")
                    self.page.wait(1)
                    return True

            # Fallback: Navigate to base URL
            logger.info("Starting new chat via navigation...")
            self.page.get(self.CHATGPT_URL)
            return True

        except Exception as e:
            logger.error(f"Failed to start new chat: {e}")
            return False

    def upload_file(self, file_path: str) -> bool:
        """
        Upload a file to the chat.

        Args:
            file_path: Path to the file to upload.

        Returns:
            True if successful, False otherwise.
        """
        try:
            # Check if file exists
            if not Path(file_path).exists():
                logger.error(f"File not found: {file_path}")
                return False

            file_input = self.page.ele("css:input[type='file']", timeout=5)
            if not file_input:
                logger.warning("File input not found")
                return False

            logger.info(f"Uploading file: {file_path}")
            file_input.input(file_path)

            # Wait for upload to complete (usually there's a progress indicator or the file appears)
            sync_human_delay(800, 2500)
            return True

        except Exception as e:
            logger.error(f"Failed to upload file: {e}")
            return False

    def close(self) -> None:
        """Close the browser and save session."""
        if self.page:
            try:
                self.page.quit()
                
                # Save session to S3 after closing browser (skip for default user)
                if self._is_initialized and self.user_id != settings.default_user_id:
                    logger.info(f"Saving session for user {self.user_id} to S3...")
                    if self.storage.upload_session(self.user_id, self.user_data_path):
                        logger.info("Session saved successfully")
                    else:
                        logger.error("Failed to save session")
                elif self.user_id == settings.default_user_id:
                     logger.info("Skipping S3 upload for default user (local only)")
                        
            except Exception as e:
                logger.warning(f"Error closing browser: {e}")
            finally:
                self.page = None
                self._is_initialized = False

    def __enter__(self):
        """Context manager entry."""
        self.initialize()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.close()
