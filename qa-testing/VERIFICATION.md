# QA Testing Verification Guide

## Quick Verification Steps

### 1. Verify Selenium Setup

```bash
cd qa-testing
./setup.sh
source venv/bin/activate
pytest test_quick_check.py -v
```

**Expected Result:** ✅ All tests pass, Selenium can connect to the app

### 2. Verify Authentication Tests

```bash
# Make sure you have a test user in Supabase
# Add credentials to .env file
pytest test_auth.py -v
```

**Expected Results:**
- ✅ Login page loads correctly
- ✅ Signup page loads correctly  
- ✅ Navigation between pages works
- ✅ Google OAuth button is present

### 3. Verify Dashboard Tests (Requires Authentication)

```bash
# Make sure TEST_EMAIL and TEST_PASSWORD are set in .env
pytest test_dashboard.py -v
```

**Expected Results:**
- ✅ Dashboard redirects when not authenticated
- ✅ Dashboard elements are present when authenticated
- ✅ Search functionality works
- ✅ Filter by sport works
- ✅ Event form validation works
- ✅ Venue multi-input works

### 4. Verify Comprehensive Tests

```bash
pytest test_comprehensive.py -v
```

**Expected Results:**
- ✅ Comprehensive test suite runs successfully
- ✅ All event operations (create, edit, delete, clone) work correctly
- ✅ Navigation and UI elements function properly

### 5. Verify Integration Tests

```bash
pytest test_integration.py -v
```

**Expected Results:**
- ✅ Complete event lifecycle works (create, view)
- ✅ Search and filter workflow works
- ✅ Responsive design works

## Common Issues & Solutions

### Issue: "pytest: command not found"
**Solution:** Run `./setup.sh` to install dependencies

### Issue: "ChromeDriver not found"
**Solution:** webdriver-manager will auto-download it. Make sure Chrome browser is installed.

### Issue: "Connection refused" or "Cannot reach localhost:3000"
**Solution:** 
1. Make sure the app is running: `npm run dev`
2. Check BASE_URL in `.env` matches your app URL

### Issue: "Authentication failed"
**Solution:**
1. Create a test user in Supabase
2. Add credentials to `qa-testing/.env`
3. Make sure the user is confirmed/verified

### Issue: Tests timeout
**Solution:**
- Increase wait times in test files if needed
- Check that the app is responding quickly
- Try running with `HEADLESS=false` to see what's happening

## Running Full Test Suite

```bash
# Run all tests with HTML report
./run_tests.sh all

# Or manually
pytest -v --html=reports/report.html --self-contained-html
```

## Test Coverage

Current test coverage:
- ✅ Authentication flows (login, signup, OAuth)
- ✅ Dashboard functionality (search, filter)
- ✅ Event CRUD operations
- ✅ Form validation
- ✅ Event cloning functionality
- ✅ Integration workflows
- ✅ Responsive design

## Next Steps

1. **Set up test user:**
   - Create a test user in Supabase
   - Add credentials to `qa-testing/.env`

2. **Run quick check:**
   ```bash
   pytest test_quick_check.py -v
   ```

3. **Run full suite:**
   ```bash
   ./run_tests.sh
   ```

4. **View reports:**
   - Open `reports/report.html` in a browser

