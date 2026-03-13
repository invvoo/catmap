# CatMap — Git Commit Helper
# Run from: C:\Users\thein\catmap
# Usage: .\commit.ps1 "your commit message"

param(
  [string]$Message = "Update CatMap"
)

Write-Host "`n🐱 CatMap Git Commit" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

# Show current status
Write-Host "`n📋 Changed files:" -ForegroundColor Yellow
git status --short

# Stage all changes except .env.local
Write-Host "`n📦 Staging files..." -ForegroundColor Yellow
git add .
git reset HEAD .env.local 2>$null  # never commit secrets

# Show what's staged
Write-Host "`n✅ Staged:" -ForegroundColor Green
git diff --cached --name-only

# Commit
Write-Host "`n💾 Committing: '$Message'" -ForegroundColor Yellow
git commit -m $Message

# Push
Write-Host "`n🚀 Pushing to remote..." -ForegroundColor Yellow
git push

Write-Host "`n✅ Done!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor DarkGray
