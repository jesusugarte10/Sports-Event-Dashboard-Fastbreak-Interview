# QA Testing with Selenium

This directory contains automated end-to-end tests for the Fastbreak Events Dashboard using Selenium and pytest.

## Setup

1. **Install Python dependencies:**
```bash
cd qa-testing
pip install -r requirements.txt
```

2. **Configure test environment:**
```bash
# Copy the example env file
cp .env.example .env

# Edit .env and add your test credentials
# You'll need to create a test user in Supabase first
```

3. **Make sure the application is running:**
```bash
# In the project root
npm run dev
```

4. **The application should be accessible at `http://localhost:3000`**

## Creating a Test User

Before running authenticated tests, create a test user:

1. Go to your Supabase dashboard
2. Navigate to Authentication → Users
3. Create a new user with email/password
4. Add the credentials to `qa-testing/.env`:
   ```
   TEST_EMAIL=your-test-email@example.com
   TEST_PASSWORD=your-test-password
   ```

## Quick Start

### First Time Setup:
```bash
cd qa-testing
./setup.sh
```

### Running Tests with Visible Browser (Recommended for Visual Testing)

**By default, tests run with a visible browser so you can watch them execute!**

```bash
# Run comprehensive test suite (recommended - covers all basic functionality)
./run_visible_tests.sh

# Or run specific test suites
./run_visible_tests.sh test_auth.py
./run_visible_tests.sh test_dashboard.py
./run_visible_tests.sh test_comprehensive.py
```

The browser window will open and you'll see:
- ✅ Each test step executing in real-time
- ✅ Form filling, button clicks, navigation
- ✅ Visual feedback for all actions
- ✅ Console output showing test progress

### Running Tests in Headless Mode (Background)

If you want to run tests without seeing the browser:

```bash
HEADLESS=true ./run_tests.sh comprehensive
```

This will:
- Create a Python virtual environment
- Install all dependencies
- Create `.env` file from template

### Verify Setup:
```bash
# Make sure your app is running first
npm run dev

# Then test Selenium setup
pytest test_quick_check.py -v
```

## Running Tests

### Run all tests:
```bash
./run_tests.sh
# or
pytest
```

### Run specific test file:
```bash
pytest test_auth.py
pytest test_dashboard.py
pytest test_integration.py
pytest test_ai_features.py
```

### Run specific test categories:
```bash
pytest -m auth          # Authentication tests only
pytest -m dashboard    # Dashboard tests only
pytest -m ai           # AI feature tests only
pytest -m integration  # Integration tests only
```

### Run with HTML report:
```bash
pytest --html=reports/report.html
```

### Run with verbose output:
```bash
pytest -v
```

### Run in visible browser (for debugging):
```bash
HEADLESS=false pytest -v
```

## Test Suites

### test_auth.py
- ✅ Login page loads correctly
- ✅ Signup page loads correctly
- ✅ Navigation between login/signup
- ✅ Google OAuth button presence

### test_dashboard.py
- ✅ Dashboard redirects when not authenticated
- ✅ Dashboard elements are present (when authenticated)
- ✅ Search functionality
- ✅ Filter by sport
- ✅ Event CRUD operations
- ✅ Form validation
- ✅ Venue multi-input

### test_ai_features.py
- ✅ AI Event Creator button presence
- ✅ AI Event Creator dialog opens
- ✅ AI suggestions button in form
- ✅ AI generate button in form

### test_integration.py
- ✅ Complete event lifecycle (create, view, edit, delete)
- ✅ Search and filter workflow
- ✅ Responsive design testing

## Notes

- Tests run in headless mode by default (set `HEADLESS=false` in `.env` to see browser)
- Authenticated tests require test user credentials in `.env`
- Tests use implicit waits (10s) and explicit waits for better reliability
- ChromeDriver is automatically managed by webdriver-manager
- Test reports are saved to `reports/report.html`

## Configuration

### Environment Variables (`.env` file):
- `BASE_URL`: Application URL (default: http://localhost:3000)
- `TEST_EMAIL`: Test user email
- `TEST_PASSWORD`: Test user password
- `HEADLESS`: Run in headless mode (true/false)

### Shared Fixtures (conftest.py):
- `driver`: WebDriver instance with Chrome
- `base_url`: Application base URL
- `test_credentials`: Test user credentials
- `authenticated_driver`: Pre-authenticated driver for protected routes

## Debugging

### Run tests with visible browser:
```bash
HEADLESS=false pytest -v
```

### Run a single test:
```bash
pytest test_auth.py::TestAuthentication::test_login_page_loads -v
```

### Run with more verbose output:
```bash
pytest -vv -s
```

### Check test coverage:
```bash
pytest --cov=. --cov-report=html
```

## Troubleshooting

### ChromeDriver issues:
- ChromeDriver is automatically downloaded by webdriver-manager
- Make sure you have Chrome browser installed
- If issues persist, try: `pip install --upgrade webdriver-manager`

### Authentication failures:
- Verify test user exists in Supabase
- Check credentials in `.env` file
- Ensure test user is confirmed/verified in Supabase

### Timeout errors:
- Increase wait times in test files if needed
- Check that the app is running on the correct port
- Verify network connectivity

