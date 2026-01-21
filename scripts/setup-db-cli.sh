#!/bin/bash

# Supabase Database Setup Script
# This script uses Supabase CLI to run migrations

echo "🚀 Setting up Supabase database..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed."
    echo "   Install it with: npm install -g supabase"
    exit 1
fi

# Check if project is linked
if [ ! -f ".supabase/config.toml" ]; then
    echo "📌 Linking to Supabase project..."
    echo "   Project ID from config: klpurzwstapxxfboxzvo"
    echo "   Please run: supabase link --project-ref owarzqykotsvmdbbhxyn"
    read -p "   Have you linked the project? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "   Run: supabase link --project-ref owarzqykotsvmdbbhxyn"
        exit 1
    fi
fi

# Run migrations
echo "📦 Running migrations..."
supabase db push

if [ $? -eq 0 ]; then
    echo "✅ Database setup completed successfully!"
else
    echo "❌ Migration failed. Check the errors above."
    exit 1
fi
