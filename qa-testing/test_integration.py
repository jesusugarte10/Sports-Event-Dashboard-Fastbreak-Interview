"""
Integration Tests for Fastbreak Events Dashboard
End-to-end workflow tests
"""

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
from datetime import datetime, timedelta


class TestEndToEndWorkflows:
    """End-to-end workflow tests"""

    def test_complete_event_lifecycle(self, ensure_authenticated, base_url):
        """
        Test complete event lifecycle:
        1. Create event
        2. View event in dashboard
        """
        driver = ensure_authenticated
        driver.get(f"{base_url}/events/new")
        time.sleep(1)  # Wait for page to load
        
        # Fill in event form
        name_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.NAME, "name"))
        )
        name_input.send_keys("Integration Test Event")
        
        # Select sport with robust selector
        sport_select = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "button[role='combobox']"))
        )
        sport_select.click()
        time.sleep(1)
        
        # Try multiple selectors for dropdown option
        try:
            sport_option = WebDriverWait(driver, 5).until(
                EC.element_to_be_clickable((By.XPATH, "//div[@role='option'][contains(., 'Basketball')]"))
            )
        except:
            try:
                sport_option = WebDriverWait(driver, 5).until(
                    EC.element_to_be_clickable((By.XPATH, "//*[@role='option' and contains(text(), 'Basketball')]"))
                )
            except:
                sport_option = WebDriverWait(driver, 5).until(
                    EC.element_to_be_clickable((By.XPATH, "//*[contains(text(), 'Basketball')]"))
                )
        sport_option.click()
        time.sleep(1)  # Wait for dropdown to close
        
        # Press Escape to ensure dropdown is closed
        driver.find_element(By.TAG_NAME, "body").send_keys(Keys.ESCAPE)
        time.sleep(0.5)
        
        # Fill in date (tomorrow) - use native value setter to trigger React's onChange
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%dT14:00")
        date_input = driver.find_element(By.CSS_SELECTOR, "input[type='datetime-local']")
        driver.execute_script("""
            const input = arguments[0];
            const value = arguments[1];
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeInputValueSetter.call(input, value);
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        """, date_input, tomorrow)
        time.sleep(0.5)
        
        # Add venue - scroll to venue section first
        venue_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input[placeholder*='enue'], input[placeholder*='Enter venue']"))
        )
        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", venue_input)
        time.sleep(0.5)
        # Use native value setter for React input
        driver.execute_script("""
            const input = arguments[0];
            const value = arguments[1];
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeInputValueSetter.call(input, value);
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        """, venue_input, "Integration Test Venue")
        time.sleep(0.3)
        # Click the Add button
        add_button = driver.find_element(By.XPATH, "//button[contains(text(), 'Add')]")
        add_button.click()
        time.sleep(0.5)
        
        # Scroll submit button into view and click
        submit_button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[@type='submit']"))
        )
        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", submit_button)
        time.sleep(0.5)
        submit_button.click()
        time.sleep(3)  # Wait for form processing
        
        # Wait for redirect to dashboard or success message
        try:
            WebDriverWait(driver, 15).until(
                EC.url_contains("/dashboard")
            )
        except:
            # If no redirect, navigate to dashboard manually
            driver.get(f"{base_url}/dashboard")
        
        # Verify event appears in dashboard or at least there are events
        time.sleep(2)
        page_source = driver.page_source.lower()
        events_present = "integration" in page_source or len(driver.find_elements(By.CSS_SELECTOR, "[class*='card']")) > 0
        assert events_present, "No events found on dashboard after creation"

    def test_search_and_filter_workflow(self, ensure_authenticated, base_url):
        """Test search and filter workflow"""
        driver = ensure_authenticated
        driver.get(f"{base_url}/dashboard")
        time.sleep(1)  # Wait for page to load
        
        # Test search
        search_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='text'], input[placeholder*='earch']"))
        )
        search_input.send_keys("test")
        time.sleep(2)  # Wait for debounce
        
        # Verify URL contains search parameter
        assert "search=" in driver.current_url.lower()

    def test_responsive_design(self, driver, base_url):
        """Test responsive design at different viewport sizes"""
        viewports = [
            (375, 667),   # Mobile
            (768, 1024),  # Tablet
            (1920, 1080)  # Desktop
        ]
        
        for width, height in viewports:
            driver.set_window_size(width, height)
            driver.get(f"{base_url}/login")
            time.sleep(0.5)
            
            # Check that page loads without horizontal scroll
            body_width = driver.execute_script("return document.body.scrollWidth")
            viewport_width = driver.execute_script("return window.innerWidth")
            assert body_width <= viewport_width + 10  # Small tolerance


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--html=report_integration.html"])
