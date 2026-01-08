"""
Shared pytest fixtures for all test files
"""
import pytest
import os
import socket
import urllib.request
import urllib.error
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from dotenv import load_dotenv
import time

# Load environment variables from .env file
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)


@pytest.fixture(scope="session")
def driver():
    """
    Setup and teardown driver for the entire test session
    This keeps the browser open for all tests, allowing session persistence
    """
    options = Options()
    
    # Check if we should run in headless mode (default: False - show browser for visual testing)
    headless = os.getenv("HEADLESS", "false").lower() == "true"
    if headless:
        options.add_argument("--headless")
    else:
        # Add options for better visibility when not headless
        options.add_argument("--start-maximized")
        options.add_argument("--disable-blink-features=AutomationControlled")
    
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")
    
    # Use system Chrome binary if available (e.g., in CI environments)
    chrome_bin = os.getenv("CHROME_BIN")
    if chrome_bin and os.path.isfile(chrome_bin):
        options.binary_location = chrome_bin
    
    # Use system chromedriver if available (e.g., in CI environments)
    driver_path = os.getenv("CHROMEDRIVER_PATH")
    is_system_driver = driver_path and os.path.isfile(driver_path)
    
    if not is_system_driver:
        # Fallback to webdriver-manager for local development
        driver_path = ChromeDriverManager().install()
    
    # webdriver-manager sometimes returns the wrong file (e.g., THIRD_PARTY_NOTICES.chromedriver)
    # We need to find the actual chromedriver executable
    if not driver_path.endswith('chromedriver') or 'THIRD_PARTY' in driver_path or 'LICENSE' in driver_path:
        # Get the directory containing the driver
        driver_dir = os.path.dirname(driver_path) if os.path.isfile(driver_path) else driver_path
        
        # Look for the actual chromedriver executable (just "chromedriver", not other files)
        if os.path.isdir(driver_dir):
            chromedriver_path = os.path.join(driver_dir, 'chromedriver')
            if os.path.isfile(chromedriver_path):
                driver_path = chromedriver_path
            else:
                # Fallback: search for any file named exactly "chromedriver"
                for file in os.listdir(driver_dir):
                    if file == 'chromedriver':
                        potential_path = os.path.join(driver_dir, file)
                        if os.path.isfile(potential_path):
                            driver_path = potential_path
                            break
    
    # Make sure the driver is executable (only for webdriver-manager downloads, not system binaries)
    # System-installed chromedriver should already have correct permissions
    if not is_system_driver and os.path.isfile(driver_path):
        try:
            os.chmod(driver_path, 0o755)
        except PermissionError:
            # If we can't chmod, assume it's already executable (e.g., system driver)
            pass
    
    driver = webdriver.Chrome(
        service=Service(driver_path), options=options
    )
    driver.implicitly_wait(10)
    driver.set_page_load_timeout(30)
    
    yield driver
    
    # Only quit at the end of the entire test session
    driver.quit()


@pytest.fixture(scope="session")
def base_url():
    """Base URL for the application - session scoped for reuse"""
    return os.getenv("BASE_URL", "http://localhost:3000")


def _check_app_running(base_url, timeout=5):
    """
    Check if the application is running and accessible.
    Returns True if accessible, False otherwise.
    """
    try:
        # Parse URL
        if base_url.startswith("http://"):
            host = base_url.replace("http://", "").split("/")[0].split(":")[0]
            port = int(base_url.split(":")[-1].split("/")[0]) if ":" in base_url.replace("http://", "") else 80
        elif base_url.startswith("https://"):
            host = base_url.replace("https://", "").split("/")[0].split(":")[0]
            port = int(base_url.split(":")[-1].split("/")[0]) if ":" in base_url.replace("https://", "") else 443
        else:
            # Assume localhost:3000 if no protocol
            host = base_url.split(":")[0] if ":" in base_url else "localhost"
            port = int(base_url.split(":")[-1].split("/")[0]) if ":" in base_url else 3000
        
        # Try to connect via socket first (faster)
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((host, port))
        sock.close()
        
        if result == 0:
            # Socket connection successful, try HTTP request
            try:
                req = urllib.request.Request(base_url)
                req.add_header('User-Agent', 'pytest-selenium-check')
                with urllib.request.urlopen(req, timeout=timeout) as response:
                    return response.status in [200, 301, 302, 303, 307, 308]
            except (urllib.error.URLError, urllib.error.HTTPError, socket.timeout):
                # Socket works but HTTP doesn't - might be a different service
                # Still return True since we can connect
                return True
        
        return False
    except Exception as e:
        print(f"Warning: Could not check if app is running: {e}")
        return False


@pytest.fixture(scope="session", autouse=True)
def verify_app_running(base_url):
    """
    Automatically verify the app is running before any tests start.
    This fixture runs automatically for all tests (autouse=True).
    """
    print(f"\n🔍 Checking if application is running at {base_url}...")
    
    if not _check_app_running(base_url):
        error_msg = f"""
❌ APPLICATION NOT RUNNING

The application is not accessible at {base_url}

To fix this:
1. Start the application: npm run dev
2. Wait for it to be ready (usually takes a few seconds)
3. Verify it's accessible: curl {base_url}
4. Then run the tests again

If your app runs on a different URL, set BASE_URL in your .env file:
   BASE_URL=http://your-app-url:port
"""
        pytest.fail(error_msg)
    
    print(f"✅ Application is running at {base_url}\n")


@pytest.fixture(scope="session")
def test_credentials():
    """Test user credentials from environment variables - session scoped for reuse"""
    return {
        "email": os.getenv("TEST_EMAIL", "test@example.com"),
        "password": os.getenv("TEST_PASSWORD", "testpassword123"),
    }


def _perform_login(driver, base_url, test_credentials):
    """Helper function to perform login"""
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    
    # Verify credentials are provided
    if not test_credentials.get("email") or not test_credentials.get("password"):
        raise Exception("TEST_EMAIL and TEST_PASSWORD must be set in environment variables or GitHub Secrets")
    
    print(f"Attempting login to {base_url}/login with email: {test_credentials['email']}")
    
    driver.get(f"{base_url}/login")
    
    # Wait for login page to load
    try:
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.NAME, "email"))
        )
    except Exception as e:
        current_url = driver.current_url
        page_source_preview = driver.page_source[:1000] if driver.page_source else "No page source"
        raise Exception(f"Login page did not load. URL: {current_url}. Page preview: {page_source_preview[:200]}") from e
    
    # Fill in email
    email_input = driver.find_element(By.NAME, "email")
    email_input.clear()
    email_input.send_keys(test_credentials["email"])
    time.sleep(0.5)
    
    # Fill in password
    password_input = driver.find_element(By.NAME, "password")
    password_input.clear()
    password_input.send_keys(test_credentials["password"])
    time.sleep(0.5)
    
    # Click sign in button
    sign_in_button = driver.find_element(
        By.XPATH, "//button[contains(text(), 'Sign In')]"
    )
    sign_in_button.click()
    
    # Wait for redirect to dashboard with better error handling
    try:
        WebDriverWait(driver, 25).until(
            EC.url_contains("/dashboard")
        )
    except Exception as e:
        # Capture page source and current URL for debugging
        current_url = driver.current_url
        page_source = driver.page_source[:1000] if driver.page_source else "No page source"
        error_msg = f"Login failed - did not redirect to dashboard. Current URL: {current_url}"
        
        # Check if there's an error message on the page
        try:
            # Look for toast messages or error text
            error_elements = driver.find_elements(By.XPATH, "//*[contains(@class, 'error') or contains(@class, 'destructive') or contains(@role, 'alert')]")
            if error_elements:
                error_texts = [el.text for el in error_elements if el.text]
                if error_texts:
                    error_msg += f" Error messages on page: {', '.join(error_texts)}"
            
            # Also check for common error patterns in page source
            if "Invalid" in page_source or "error" in page_source.lower():
                # Try to extract error message
                import re
                error_patterns = [
                    r'Invalid[^<]*',
                    r'error[^<]*',
                    r'Failed[^<]*'
                ]
                for pattern in error_patterns:
                    matches = re.findall(pattern, page_source, re.IGNORECASE)
                    if matches:
                        error_msg += f" Found error text: {matches[0][:100]}"
                        break
        except Exception as parse_error:
            error_msg += f" (Could not parse error messages: {parse_error})"
        
        error_msg += f" Page preview: {page_source[:300]}"
        raise Exception(error_msg) from e
    
    # Verify we're on the dashboard
    try:
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Events Dashboard')]"))
        )
    except Exception as e:
        current_url = driver.current_url
        page_source_preview = driver.page_source[:500] if driver.page_source else "No page source"
        raise Exception(f"Dashboard verification failed. URL: {current_url}. Page preview: {page_source_preview[:200]}") from e
    
    print("✓ Login successful - on dashboard")
    time.sleep(1)  # Brief pause for page to fully load


@pytest.fixture(scope="session")
def authenticated_driver(driver, base_url, test_credentials):
    """
    Create an authenticated session by signing in ONCE for the entire test session
    This fixture logs in once and reuses the session for all tests
    Re-authenticates if session was invalidated (e.g., by sign out test)
    """
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    
    # Check if we're already logged in by checking current URL and page content
    def is_authenticated():
        try:
            driver.get(f"{base_url}/dashboard")
            time.sleep(1)
            current_url = driver.current_url
            if "/dashboard" in current_url and "/login" not in current_url:
                # Check if we're actually on dashboard (not redirected to login)
                if "Events Dashboard" in driver.page_source or "Dashboard" in driver.page_source:
                    return True
        except:
            pass
        return False
    
    if is_authenticated():
        print("✓ Already authenticated - reusing session")
        return driver
    
    # Navigate to login page
    print("\n🔐 Logging in for test session...")
    
    try:
        _perform_login(driver, base_url, test_credentials)
        print("✓ Successfully authenticated - session ready for all tests")
        return driver
    except Exception as e:
        pytest.fail(f"Could not authenticate: {str(e)}")


@pytest.fixture(scope="function")
def ensure_authenticated(driver, base_url, test_credentials):
    """
    Fixture that ensures authentication before each test.
    Use this for tests that might run after sign-out.
    """
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    
    # Check if we need to re-authenticate
    try:
        driver.get(f"{base_url}/dashboard")
        time.sleep(1)
        if "/login" in driver.current_url:
            print("🔐 Re-authenticating...")
            _perform_login(driver, base_url, test_credentials)
            print("✓ Re-authenticated successfully")
    except Exception as e:
        print(f"⚠️ Re-authentication needed: {e}")
        _perform_login(driver, base_url, test_credentials)
    
    return driver

