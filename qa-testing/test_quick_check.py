"""
Quick check to verify Selenium setup is working
Run this first to ensure everything is configured correctly
"""

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


def test_selenium_setup(driver, base_url):
    """Quick test to verify Selenium is working"""
    print(f"\n🔍 Testing Selenium setup with URL: {base_url}")
    
    try:
        driver.get(base_url)
        print(f"✅ Successfully navigated to {base_url}")
        
        # Wait a moment for page to load
        import time
        time.sleep(2)
        
        # Check if we can find any element
        body = driver.find_element(By.TAG_NAME, "body")
        assert body is not None
        print("✅ Successfully found page elements")
        
        # Check current URL
        current_url = driver.current_url
        print(f"✅ Current URL: {current_url}")
        
        print("\n✅ Selenium setup is working correctly!")
        
    except Exception as e:
        error_str = str(e)
        if "ERR_CONNECTION_REFUSED" in error_str or "Connection refused" in error_str:
            pytest.fail(
                f"\n❌ Cannot connect to {base_url}\n"
                "The application is not running. Please start it with: npm run dev\n"
                "Then wait a few seconds for it to be ready and run the tests again."
            )
        print(f"\n❌ Selenium setup test failed: {error_str}")
        print("\nTroubleshooting:")
        print("1. Make sure the app is running: npm run dev")
        print("2. Check that Chrome browser is installed")
        print("3. Verify BASE_URL in .env is correct")
        raise


def test_app_is_running(driver, base_url):
    """Test that the application is accessible"""
    try:
        driver.get(base_url)
        
        # Should not get a connection error
        assert "localhost" in driver.current_url or "127.0.0.1" in driver.current_url or base_url.replace("http://", "").replace("https://", "").split("/")[0] in driver.current_url
        
        # Should see some content
        body_text = driver.find_element(By.TAG_NAME, "body").text
        assert len(body_text) > 0, "Page appears to be empty"
    except Exception as e:
        error_str = str(e)
        if "ERR_CONNECTION_REFUSED" in error_str or "Connection refused" in error_str:
            pytest.fail(
                f"\n❌ Cannot connect to {base_url}\n"
                "The application is not running. Please start it with: npm run dev"
            )
        raise


def test_login_credentials_work(driver, base_url, test_credentials):
    """Quick test to verify login credentials are valid before running full test suite"""
    import time
    
    print(f"\n🔐 Testing login with email: {test_credentials['email']}")
    
    # Verify credentials are set
    if not test_credentials.get("email") or not test_credentials.get("password"):
        pytest.skip("TEST_EMAIL and TEST_PASSWORD not set - skipping login test")
    
    driver.get(f"{base_url}/login")
    
    # Wait for login page
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.NAME, "email"))
    )
    
    # Fill credentials
    driver.find_element(By.NAME, "email").send_keys(test_credentials["email"])
    driver.find_element(By.NAME, "password").send_keys(test_credentials["password"])
    driver.find_element(By.XPATH, "//button[contains(text(), 'Sign In')]").click()
    
    # Wait for redirect
    WebDriverWait(driver, 20).until(
        EC.url_contains("/dashboard")
    )
    
    # Verify we're on dashboard
    assert "/dashboard" in driver.current_url, f"Expected /dashboard, got {driver.current_url}"
    assert "Events Dashboard" in driver.page_source, "Dashboard page did not load correctly"
    
    print("✅ Login credentials are valid!")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])

