"""
Shared pytest fixtures for all test files
"""
import pytest
import os
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
    
    # Use system chromedriver if available (e.g., in CI environments)
    driver_path = os.getenv("CHROMEDRIVER_PATH")
    if not driver_path or not os.path.isfile(driver_path):
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
    
    # Make sure the driver is executable
    if os.path.isfile(driver_path):
        os.chmod(driver_path, 0o755)
    
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
    
    driver.get(f"{base_url}/login")
    
    # Wait for login page to load
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.NAME, "email"))
    )
    
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
    
    # Wait for redirect to dashboard
    WebDriverWait(driver, 15).until(
        EC.url_contains("/dashboard")
    )
    
    # Verify we're on the dashboard
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Events Dashboard') or contains(text(), 'Dashboard')]"))
    )
    
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

