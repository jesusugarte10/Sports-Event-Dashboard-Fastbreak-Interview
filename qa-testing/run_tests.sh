#!/bin/bash

# Test runner script for QA Testing

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Check if pytest is installed
if ! python3 -c "import pytest" 2>/dev/null; then
    echo "❌ pytest is not installed. Running setup..."
    ./setup.sh
    source venv/bin/activate
fi

# Create reports directory
mkdir -p reports

# Run tests
echo "🧪 Running Selenium tests..."
echo ""

# Check if app is running
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "⚠️  Warning: App doesn't seem to be running on http://localhost:3000"
    echo "   Please start it with: npm run dev"
    echo ""
fi

# Set HEADLESS environment variable (default: false - show browser)
export HEADLESS=${HEADLESS:-false}

# Run tests based on argument
if [ "$1" == "auth" ]; then
    pytest test_auth.py -v -s
elif [ "$1" == "dashboard" ]; then
    pytest test_dashboard.py -v -s
elif [ "$1" == "ai" ]; then
    pytest test_ai_features.py -v -s
elif [ "$1" == "integration" ]; then
    pytest test_integration.py -v -s
elif [ "$1" == "comprehensive" ]; then
    pytest test_comprehensive.py -v -s
elif [ "$1" == "all" ] || [ -z "$1" ]; then
    pytest -v -s --html=reports/report.html --self-contained-html
    echo ""
    echo "📊 Test report generated: reports/report.html"
else
    echo "Usage: ./run_tests.sh [auth|dashboard|ai|integration|comprehensive|all]"
    echo ""
    echo "To run with visible browser (default):"
    echo "  ./run_tests.sh [test_suite]"
    echo ""
    echo "To run in headless mode:"
    echo "  HEADLESS=true ./run_tests.sh [test_suite]"
    exit 1
fi

