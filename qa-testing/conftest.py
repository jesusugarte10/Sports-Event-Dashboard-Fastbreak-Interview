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


@pytest.fixture(scope="function")
def driver():
    """Setup and teardown driver for each test"""
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
    
    # Fix for webdriver-manager issue - find the actual chromedriver executable
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
    
    driver.quit()


@pytest.fixture
def base_url():
    """Base URL for the application"""
    return os.getenv("BASE_URL", "http://localhost:3000")


@pytest.fixture
def test_credentials():
    """Test user credentials from environment variables"""
    return {
        "email": os.getenv("TEST_EMAIL", "test@example.com"),
        "password": os.getenv("TEST_PASSWORD", "testpassword123"),
    }


@pytest.fixture
def authenticated_driver(driver, base_url, test_credentials):
    """
    Create an authenticated session by signing in
    Returns the driver with an active session
    """
    driver.get(f"{base_url}/login")
    
    # Wait for login page to load
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    
    try:
        # Fill in email
        email_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.NAME, "email"))
        )
        email_input.clear()
        email_input.send_keys(test_credentials["email"])
        
        # Fill in password
        password_input = driver.find_element(By.NAME, "password")
        password_input.clear()
        password_input.send_keys(test_credentials["password"])
        
        # Click sign in button
        sign_in_button = driver.find_element(
            By.XPATH, "//button[contains(text(), 'Sign In')]"
        )
        sign_in_button.click()
        
        # Wait for redirect to dashboard
        WebDriverWait(driver, 15).until(
            EC.url_contains("/dashboard")
        )
        
        # Give it a moment for the page to fully load
        time.sleep(2)
        
        return driver
    except Exception as e:
        pytest.skip(f"Could not authenticate: {str(e)}")

