# Supabase Database Setup Script (PowerShell)
# This script uses Supabase CLI to run migrations

Write-Host "🚀 Setting up Supabase database..." -ForegroundColor Cyan

# Check if Supabase CLI is installed
$supabaseInstalled = Get-Command supabase -ErrorAction SilentlyContinue
if (-not $supabaseInstalled) {
    Write-Host "❌ Supabase CLI is not installed." -ForegroundColor Red
    Write-Host "   Install it with: npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

# Check if project is linked
if (-not (Test-Path ".supabase\config.toml")) {
    Write-Host "📌 Linking to Supabase project..." -ForegroundColor Yellow
    Write-Host "   Project ID from config: klpurzwstapxxfboxzvo" -ForegroundColor Gray
    Write-Host "   Please run: supabase link --project-ref owarzqykotsvmdbbhxyn" -ForegroundColor Yellow
    $response = Read-Host "   Have you linked the project? (y/n)"
    if ($response -ne "y" -and $response -ne "Y") {
        Write-Host "   Run: supabase link --project-ref owarzqykotsvmdbbhxyn" -ForegroundColor Yellow
        exit 1
    }
}

# Run migrations
Write-Host "📦 Running migrations..." -ForegroundColor Cyan
supabase db push

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database setup completed successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Migration failed. Check the errors above." -ForegroundColor Red
    exit 1
}
