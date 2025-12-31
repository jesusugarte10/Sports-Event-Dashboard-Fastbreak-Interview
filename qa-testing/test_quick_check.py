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
        print(f"\n❌ Selenium setup test failed: {str(e)}")
        print("\nTroubleshooting:")
        print("1. Make sure the app is running: npm run dev")
        print("2. Check that Chrome browser is installed")
        print("3. Verify BASE_URL in .env is correct")
        raise


def test_app_is_running(driver, base_url):
    """Test that the application is accessible"""
    driver.get(base_url)
    
    # Should not get a connection error
    assert "localhost" in driver.current_url or "127.0.0.1" in driver.current_url
    
    # Should see some content
    body_text = driver.find_element(By.TAG_NAME, "body").text
    assert len(body_text) > 0, "Page appears to be empty"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])

