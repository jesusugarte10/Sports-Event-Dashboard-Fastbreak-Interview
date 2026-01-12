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
# Create a .env file with your test credentials
cat > .env << EOF
BASE_URL=http://localhost:3000
TEST_EMAIL=your-test-email@example.com
TEST_PASSWORD=your-test-password
HEADLESS=false
EOF

# Edit .env and add your actual test credentials
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

### Running Tests with Visible Browser (Default)

**By default, tests run with a visible browser so you can watch them execute!**

```bash
# Run all tests with visible browser
./run_tests.sh

# Run specific test suites
./run_tests.sh auth
./run_tests.sh dashboard
./run_tests.sh comprehensive
./run_tests.sh integration
```

The browser window will open and you'll see:
- ✅ Each test step executing in real-time
- ✅ Form filling, button clicks, navigation
- ✅ Visual feedback for all actions
- ✅ Console output showing test progress

### Running Tests in Headless Mode (Background)

If you want to run tests without seeing the browser:

```bash
HEADLESS=true ./run_tests.sh
```

### Verify Setup:
```bash
# Make sure your app is running first
npm run dev

# Then run a quick auth test
pytest test_auth.py -v -s
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
pytest test_comprehensive.py
```

### Run specific test categories:
```bash
pytest -m auth          # Authentication tests only
pytest -m dashboard    # Dashboard tests only
pytest -m comprehensive  # Comprehensive test suite
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
- ✅ Dashboard elements are present (when authenticated)
- ✅ Search functionality
- ✅ Filter by sport
- ✅ Event CRUD operations
- ✅ Form validation
- ✅ Venue multi-input

### test_integration.py
- ✅ Complete event lifecycle (create, view, edit, delete)
- ✅ Search and filter workflow
- ✅ Responsive design testing

### test_comprehensive.py (NEW - Recommended!)
**Comprehensive test suite covering all basic functionality:**
- ✅ Complete login flow (uses existing test account from `.env`)
- ✅ Create event with all fields (name, sport, date, description, location, venues)
- ✅ Edit existing event
- ✅ Delete event
- ✅ Clone event functionality
- ✅ Dashboard navigation
- ✅ Sign out functionality

**Note:** Tests use the existing test account configured in `.env` file. No new accounts are created during testing.

**This is the recommended test suite to run for full coverage!**

## Notes

- **Tests run with VISIBLE browser by default** - You can watch tests execute in real-time!
- To run in headless mode: Set `HEADLESS=true` in `.env` or use `HEADLESS=true ./run_tests.sh`
- Authenticated tests require test user credentials in `.env`
- Tests use implicit waits (10s) and explicit waits for better reliability
- ChromeDriver is automatically managed by webdriver-manager
- Test reports are saved to `reports/report.html`
- Comprehensive test suite includes visual pauses so you can see each step

## Configuration

### Environment Variables (`.env` file):
- `BASE_URL`: Application URL (default: http://localhost:3000)
- `TEST_EMAIL`: Test user email
- `TEST_PASSWORD`: Test user password
- `HEADLESS`: Run in headless mode (true/false)

### Shared Fixtures (conftest.py):
- `driver`: WebDriver instance with Chrome (session-scoped, shared across all tests)
- `base_url`: Application base URL
- `test_credentials`: Test user credentials from `.env`
- `authenticated_driver`: Pre-authenticated driver for protected routes (logs in once per session)
- `ensure_authenticated`: Re-authenticates if session was invalidated (e.g., after sign-out test)

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

## CI/CD Integration (GitHub Actions)

The QA tests are automatically run in GitHub Actions before deployment. The workflow is configured in `.github/workflows/qa-tests.yml`.

### Setup for GitHub Actions:

1. **Add GitHub Secrets** (Settings → Secrets and variables → Actions):
   - `TEST_EMAIL`: Your test user email
   - `TEST_PASSWORD`: Your test user password
   - `TEST_BASE_URL`: (Optional) If testing against a deployed preview URL instead of localhost

2. **The workflow will:**
   - Run automatically on pull requests to `main`/`master`
   - Run automatically on pushes to `main`/`master`
   - Can be manually triggered via "Actions" tab → "QA Tests" → "Run workflow"
   - Build the Next.js app
   - Start the app locally
   - Run all QA tests in headless mode
   - Upload test reports as artifacts
   - Fail the workflow if any tests fail (blocking merge/deployment)

3. **View test results:**
   - Go to the "Actions" tab in GitHub
   - Click on a workflow run
   - Download the "test-reports" artifact to view the HTML report

### Local Testing with npm scripts:

You can also run tests locally using npm scripts:

```bash
# First time setup
npm run test:qa:setup

# Run all tests
npm run test:qa
```

## Troubleshooting

### ChromeDriver issues:
- ChromeDriver is automatically downloaded by webdriver-manager (local)
- In CI, system ChromeDriver is used
- Make sure you have Chrome browser installed locally
- If issues persist, try: `pip install --upgrade webdriver-manager`

### Authentication failures:
- Verify test user exists in Supabase
- Check credentials in `.env` file (local) or GitHub Secrets (CI)
- Ensure test user is confirmed/verified in Supabase

### Timeout errors:
- Increase wait times in test files if needed
- Check that the app is running on the correct port
- Verify network connectivity

### CI/CD failures:
- Check the GitHub Actions logs for detailed error messages
- Verify all required secrets are set in GitHub
- Ensure the app builds successfully before tests run
- Check that the app starts correctly (wait time may need adjustment)

