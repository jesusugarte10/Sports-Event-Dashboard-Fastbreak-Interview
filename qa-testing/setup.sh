#!/bin/bash

# Setup script for QA Testing

echo "🔧 Setting up QA Testing environment..."

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip --quiet

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt --quiet

# Create reports directory
mkdir -p reports

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file template..."
    cat > .env << EOF
# QA Testing Configuration
BASE_URL=http://localhost:3000
TEST_EMAIL=your-test-user@example.com
TEST_PASSWORD=your-test-password
HEADLESS=false
EOF
    echo "⚠️  Please update .env with your test credentials"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "To run tests:"
echo "  source venv/bin/activate"
echo "  ./run_tests.sh"
echo ""



