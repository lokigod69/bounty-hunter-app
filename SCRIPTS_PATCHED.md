# PowerShell Scripts Patched - Host Parameter Fix

**Date**: 2025-01-25
**Issue**: PowerShell reserved variable `$Host` conflict
**Resolution**: Renamed all `Host` parameters to `DbHost`

---

## Problem

PowerShell has a built-in automatic variable `$Host` that provides access to the host application. Using `param([string]$Host = ...)` causes a conflict:

```
Cannot overwrite variable Host because it is read-only or constant.
```

---

## Solution

Renamed all connection parameters across all scripts:
- `$Host` → `$DbHost`
- `$Port` → `$DbPort`
- `$User` → `$DbUser`
- `$Db` → `$DbName`

Updated all connection strings to use new parameter names.

---

## Files Patched

### Production Scripts (4 files)
✅ [scripts/prod/backup_schema.ps1](scripts/prod/backup_schema.ps1)
✅ [scripts/prod/apply_003_up.ps1](scripts/prod/apply_003_up.ps1)
✅ [scripts/prod/validate_003.ps1](scripts/prod/validate_003.ps1)
✅ [scripts/prod/rollback_003.ps1](scripts/prod/rollback_003.ps1)

### Local Scripts (4 files)
✅ [scripts/local/load_schema.ps1](scripts/local/load_schema.ps1)
✅ [scripts/local/seed_minimal.ps1](scripts/local/seed_minimal.ps1)
✅ [scripts/local/apply_003_up.ps1](scripts/local/apply_003_up.ps1)
✅ [scripts/local/validate_003.ps1](scripts/local/validate_003.ps1)

---

## Additional Improvements

### Production Scripts
- Added `Read-Plain` helper function for secure password input
- Added colored output messages (`Write-Host -ForegroundColor`)
- Consistent error handling

### All Scripts
- Consistent parameter naming across local and prod
- Connection strings now use `"host=$DbHost port=$DbPort user=$DbUser dbname=$DbName"`

---

## Next Steps

**Open a NEW VS Code terminal** (to pick up any PATH changes), then:

```powershell
# 1. Arm the guardrail
$env:PROD_CONFIRM = "YES"
echo $env:PROD_CONFIRM  # Verify it prints "YES"

# 2. Run tasks via Command Palette (Ctrl+Shift+P → Tasks: Run Task):
#    - Prod: Backup schema
#    - Prod: Apply 003 (UP)
#    - Prod: Validate 003

# 3. Test app with real users (MyCollectedRewards page)

# 4. If needed: Prod: Rollback 003 (DOWN)
```

---

**All scripts saved and ready for production deployment.**

---

**Created**: 2025-01-25
**Status**: ✅ Complete - Scripts patched and saved
