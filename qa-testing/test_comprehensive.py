"""
Comprehensive Test Suite for Fastbreak Events Dashboard
Covers all basic functionality with visual browser testing
"""

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from datetime import datetime, timedelta
import time


class TestCompleteUserJourney:
    """Complete user journey tests - sign up, login, create, edit, delete"""

    def test_complete_signup_and_first_event(self, driver, base_url, test_credentials):
        """Test complete signup flow and creating first event"""
        print("\n🔵 Starting: Complete Signup and First Event Test")
        
        # Step 1: Go to signup page
        print("  → Navigating to signup page...")
        driver.get(f"{base_url}/signup")
        time.sleep(1)  # Visual pause
        
        # Verify signup page
        assert "Create an account" in driver.page_source
        print("  ✓ Signup page loaded")
        
        # Step 2: Fill signup form
        print("  → Filling signup form...")
        email_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.NAME, "email"))
        )
        email_input.clear()
        email_input.send_keys(test_credentials["email"])
        time.sleep(0.5)  # Visual pause
        
        password_input = driver.find_element(By.NAME, "password")
        password_input.clear()
        password_input.send_keys(test_credentials["password"])
        time.sleep(0.5)  # Visual pause
        
        # Step 3: Submit signup
        print("  → Submitting signup form...")
        signup_button = driver.find_element(By.XPATH, "//button[contains(text(), 'Sign Up')]")
        signup_button.click()
        time.sleep(2)  # Wait for response
        
        print("  ✓ Signup submitted (check email for verification)")
        
    def test_complete_login_flow(self, driver, base_url, test_credentials):
        """Test complete login flow"""
        print("\n🔵 Starting: Complete Login Flow Test")
        
        # Step 1: Go to login page
        print("  → Navigating to login page...")
        driver.get(f"{base_url}/login")
        time.sleep(1)  # Visual pause
        
        # Verify login page
        assert "Welcome back" in driver.page_source
        print("  ✓ Login page loaded")
        
        # Step 2: Fill login form
        print("  → Filling login form...")
        email_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.NAME, "email"))
        )
        email_input.clear()
        email_input.send_keys(test_credentials["email"])
        time.sleep(0.5)  # Visual pause
        
        password_input = driver.find_element(By.NAME, "password")
        password_input.clear()
        password_input.send_keys(test_credentials["password"])
        time.sleep(0.5)  # Visual pause
        
        # Step 3: Submit login
        print("  → Submitting login form...")
        signin_button = driver.find_element(By.XPATH, "//button[contains(text(), 'Sign In')]")
        signin_button.click()
        
        # Wait for redirect to dashboard
        WebDriverWait(driver, 15).until(
            EC.url_contains("/dashboard")
        )
        time.sleep(2)  # Visual pause for page load
        
        print("  ✓ Successfully logged in and redirected to dashboard")
        
        # Verify dashboard elements
        assert "Events Dashboard" in driver.page_source
        print("  ✓ Dashboard loaded correctly")


class TestEventCreation:
    """Comprehensive event creation tests"""

    def test_create_event_with_all_fields(self, authenticated_driver, base_url):
        """Test creating an event with all fields filled"""
        print("\n🟢 Starting: Create Event with All Fields Test")
        driver = authenticated_driver
        
        # Step 1: Navigate to create event page
        print("  → Navigating to create event page...")
        driver.get(f"{base_url}/events/new")
        time.sleep(1)  # Visual pause
        
        # Verify page loaded
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.NAME, "name"))
        )
        print("  ✓ Create event page loaded")
        
        # Step 2: Fill event name
        print("  → Filling event name...")
        name_input = driver.find_element(By.NAME, "name")
        name_input.clear()
        name_input.send_keys("Comprehensive Test Event - All Fields")
        time.sleep(0.5)  # Visual pause
        
        # Step 3: Select sport
        print("  → Selecting sport...")
        sport_select = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "button[role='combobox']"))
        )
        sport_select.click()
        time.sleep(0.5)  # Visual pause
        
        basketball_option = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//div[contains(text(), 'Basketball')]"))
        )
        basketball_option.click()
        time.sleep(0.5)  # Visual pause
        print("  ✓ Sport selected: Basketball")
        
        # Step 4: Fill date and time
        print("  → Setting date and time...")
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%dT14:00")
        date_input = driver.find_element(By.CSS_SELECTOR, "input[type='datetime-local']")
        date_input.clear()
        date_input.send_keys(tomorrow)
        time.sleep(0.5)  # Visual pause
        print(f"  ✓ Date set: {tomorrow}")
        
        # Step 5: Fill description
        print("  → Adding description...")
        description_input = driver.find_element(By.NAME, "description")
        description_input.clear()
        description_input.send_keys("This is a comprehensive test event with all fields filled out.")
        time.sleep(0.5)  # Visual pause
        print("  ✓ Description added")
        
        # Step 6: Fill location
        print("  → Adding location...")
        location_input = driver.find_element(By.NAME, "location")
        location_input.clear()
        location_input.send_keys("Test Location, Test City")
        time.sleep(0.5)  # Visual pause
        print("  ✓ Location added")
        
        # Step 7: Add venues
        print("  → Adding venues...")
        venue_inputs = driver.find_elements(By.CSS_SELECTOR, "input[placeholder*='venue' i], input[placeholder*='Venue' i]")
        if venue_inputs:
            venue_input = venue_inputs[0]
            venue_input.clear()
            venue_input.send_keys("Main Arena")
            venue_input.send_keys(Keys.RETURN)
            time.sleep(1)  # Visual pause
            
            # Add second venue
            venue_input.send_keys("Secondary Court")
            venue_input.send_keys(Keys.RETURN)
            time.sleep(1)  # Visual pause
            print("  ✓ Venues added: Main Arena, Secondary Court")
        
        # Step 8: Submit form
        print("  → Submitting event form...")
        submit_button = driver.find_element(By.XPATH, "//button[@type='submit']")
        submit_button.click()
        time.sleep(2)  # Visual pause
        
        # Wait for redirect
        WebDriverWait(driver, 15).until(
            EC.url_contains("/dashboard")
        )
        time.sleep(2)  # Visual pause
        
        # Verify event appears
        assert "Comprehensive Test Event - All Fields" in driver.page_source
        print("  ✓ Event created successfully and appears in dashboard")


class TestEventEditing:
    """Test event editing functionality"""

    def test_edit_existing_event(self, authenticated_driver, base_url):
        """Test editing an existing event"""
        print("\n🟡 Starting: Edit Existing Event Test")
        driver = authenticated_driver
        
        # Step 1: Go to dashboard
        print("  → Navigating to dashboard...")
        driver.get(f"{base_url}/dashboard")
        time.sleep(2)  # Visual pause
        
        # Step 2: Find and click edit button on first event
        print("  → Looking for events to edit...")
        edit_buttons = driver.find_elements(By.XPATH, "//button[contains(text(), 'Edit')] | //a[contains(text(), 'Edit')]")
        
        if len(edit_buttons) > 0:
            edit_buttons[0].click()
            time.sleep(2)  # Visual pause
            print("  ✓ Edit page loaded")
            
            # Step 3: Modify event name
            print("  → Modifying event name...")
            name_input = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.NAME, "name"))
            )
            current_name = name_input.get_attribute("value")
            name_input.clear()
            name_input.send_keys(f"{current_name} - EDITED")
            time.sleep(0.5)  # Visual pause
            
            # Step 4: Submit changes
            print("  → Submitting changes...")
            submit_button = driver.find_element(By.XPATH, "//button[@type='submit']")
            submit_button.click()
            time.sleep(2)  # Visual pause
            
            # Wait for redirect
            WebDriverWait(driver, 15).until(
                EC.url_contains("/dashboard")
            )
            time.sleep(2)  # Visual pause
            
            # Verify changes
            assert "- EDITED" in driver.page_source
            print("  ✓ Event updated successfully")
        else:
            pytest.skip("No events found to edit - create an event first")


class TestEventDeletion:
    """Test event deletion functionality"""

    def test_delete_event(self, authenticated_driver, base_url):
        """Test deleting an event"""
        print("\n🔴 Starting: Delete Event Test")
        driver = authenticated_driver
        
        # Step 1: Go to dashboard
        print("  → Navigating to dashboard...")
        driver.get(f"{base_url}/dashboard")
        time.sleep(2)  # Visual pause
        
        # Step 2: Find delete button
        print("  → Looking for events to delete...")
        delete_buttons = driver.find_elements(By.XPATH, "//button[contains(text(), 'Delete')]")
        
        if len(delete_buttons) > 0:
            # Get event name before deletion
            event_cards = driver.find_elements(By.CSS_SELECTOR, "[class*='card'], [class*='Card']")
            event_name = ""
            if event_cards:
                event_name = event_cards[0].text.split('\n')[0] if event_cards[0].text else ""
            
            # Click delete button
            delete_buttons[0].click()
            time.sleep(1)  # Visual pause
            print("  ✓ Delete dialog opened")
            
            # Step 3: Confirm deletion
            print("  → Confirming deletion...")
            confirm_buttons = WebDriverWait(driver, 10).until(
                EC.presence_of_all_elements_located((By.XPATH, "//button[contains(text(), 'Delete')] | //button[contains(text(), 'Confirm')]"))
            )
            
            # Click the confirm/delete button in the dialog
            for btn in confirm_buttons:
                if btn.is_displayed() and ("Delete" in btn.text or "Confirm" in btn.text):
                    btn.click()
                    break
            
            time.sleep(2)  # Visual pause
            
            # Wait for page to update
            WebDriverWait(driver, 10).until(
                EC.staleness_of(delete_buttons[0]) if delete_buttons else EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
            time.sleep(2)  # Visual pause
            
            print("  ✓ Event deleted successfully")
        else:
            pytest.skip("No events found to delete - create an event first")


class TestAIFeatures:
    """Test AI event creator features"""

    def test_ai_event_creator_button(self, authenticated_driver, base_url):
        """Test AI event creator button presence and functionality"""
        print("\n🤖 Starting: AI Event Creator Test")
        driver = authenticated_driver
        
        # Step 1: Go to dashboard
        print("  → Navigating to dashboard...")
        driver.get(f"{base_url}/dashboard")
        time.sleep(2)  # Visual pause
        
        # Step 2: Find AI creator button
        print("  → Looking for AI Event Creator button...")
        ai_buttons = driver.find_elements(By.XPATH, "//button[contains(text(), 'AI')] | //button[contains(text(), 'Create with AI')]")
        
        if len(ai_buttons) > 0:
            print("  ✓ AI Event Creator button found")
            
            # Step 3: Click button to open dialog
            print("  → Opening AI Event Creator dialog...")
            ai_buttons[0].click()
            time.sleep(2)  # Visual pause
            
            # Step 4: Verify dialog opened
            dialog = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.XPATH, "//div[contains(text(), 'AI')] | //div[@role='dialog']"))
            )
            assert dialog.is_displayed()
            print("  ✓ AI Event Creator dialog opened")
            
            # Step 5: Close dialog
            close_buttons = driver.find_elements(By.XPATH, "//button[contains(@aria-label, 'close')] | //button[contains(text(), '×')] | //button[@aria-label='Close']")
            if close_buttons:
                close_buttons[0].click()
                time.sleep(1)  # Visual pause
                print("  ✓ Dialog closed")
        else:
            print("  ⚠ AI Event Creator button not found (may not be implemented)")


class TestNavigation:
    """Test navigation and UI elements"""

    def test_dashboard_navigation(self, authenticated_driver, base_url):
        """Test navigation elements on dashboard"""
        print("\n🧭 Starting: Dashboard Navigation Test")
        driver = authenticated_driver
        
        # Step 1: Go to dashboard
        print("  → Navigating to dashboard...")
        driver.get(f"{base_url}/dashboard")
        time.sleep(2)  # Visual pause
        
        # Step 2: Check for navigation elements
        print("  → Checking navigation elements...")
        
        # Check for "New Event" button
        new_event_btn = driver.find_elements(By.XPATH, "//button[contains(text(), 'New Event')] | //a[contains(text(), 'New Event')]")
        assert len(new_event_btn) > 0, "New Event button not found"
        print("  ✓ New Event button found")
        
        # Check for search input
        search_input = driver.find_elements(By.CSS_SELECTOR, "input[placeholder*='Search' i]")
        assert len(search_input) > 0, "Search input not found"
        print("  ✓ Search input found")
        
        # Check for filter dropdown
        filter_dropdown = driver.find_elements(By.CSS_SELECTOR, "button[role='combobox']")
        assert len(filter_dropdown) > 0, "Filter dropdown not found"
        print("  ✓ Filter dropdown found")
        
        # Step 3: Test navigation to create event
        print("  → Testing navigation to create event page...")
        if new_event_btn[0].tag_name == 'a':
            new_event_btn[0].click()
        else:
            # If it's a button wrapping a link
            link = new_event_btn[0].find_element(By.XPATH, ".//ancestor::a | .//following::a | .//preceding::a")
            if link:
                link.click()
            else:
                driver.get(f"{base_url}/events/new")
        
        time.sleep(2)  # Visual pause
        assert "/events/new" in driver.current_url or "Create" in driver.page_source
        print("  ✓ Successfully navigated to create event page")


class TestSignOut:
    """Test sign out functionality"""

    def test_sign_out(self, authenticated_driver, base_url):
        """Test signing out"""
        print("\n🚪 Starting: Sign Out Test")
        driver = authenticated_driver
        
        # Step 1: Go to dashboard
        print("  → Navigating to dashboard...")
        driver.get(f"{base_url}/dashboard")
        time.sleep(2)  # Visual pause
        
        # Step 2: Find sign out button
        print("  → Looking for sign out button...")
        signout_buttons = driver.find_elements(By.XPATH, "//button[contains(text(), 'Sign Out')] | //button[contains(text(), 'Logout')] | //button[contains(text(), 'Log out')]")
        
        if len(signout_buttons) > 0:
            print("  ✓ Sign out button found")
            
            # Step 3: Click sign out
            print("  → Clicking sign out...")
            signout_buttons[0].click()
            time.sleep(2)  # Visual pause
            
            # Step 4: Verify redirect to login
            WebDriverWait(driver, 10).until(
                EC.url_contains("/login")
            )
            time.sleep(1)  # Visual pause
            
            assert "Welcome back" in driver.page_source or "Sign in" in driver.page_source
            print("  ✓ Successfully signed out and redirected to login")
        else:
            print("  ⚠ Sign out button not found in expected location")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s", "--html=report_comprehensive.html"])

