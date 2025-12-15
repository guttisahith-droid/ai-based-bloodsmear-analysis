# Duplicate Analysis Report

This document identifies all duplicates found in the codebase.

## 🔴 Critical Duplicates

### 1. **Duplicate Flask Backend Files** 
**Location**: `project/model_service/`
- `app.py` (989 lines) - MongoDB-based Flask backend
- `main.py` (500 lines) - SQLite-based Flask backend

**Issue**: Both files implement similar Flask backends with overlapping routes:
- Both have `/api/register`
- Both have `/api/login`
- Both have `/api/analyze`
- Both have `/api/analyses`

**Problem**: Having two backends creates confusion about which one is active. The system should use only one backend.

**Recommendation**: 
- Keep `app.py` (MongoDB version) as it's more complete and matches the Express backend architecture
- Remove or archive `main.py` if not needed

---

### 2. **Duplicate Route Definition in app.py**
**Location**: `project/model_service/app.py` (Line 974-989)

**Issue**: The DELETE route is defined AFTER the `if __name__ == '__main__'` block:
```python
if __name__ == '__main__':
    # ... server startup code ...
    app.run(host='0.0.0.0', port=port, debug=False)
@app.route('/api/analyses/<analysis_id>', methods=['DELETE'])  # ❌ UNREACHABLE
@token_required
def delete_analysis(current_user, analysis_id):
    # ...
```

**Problem**: This route will never be registered because it comes after the server starts.

**Recommendation**: Move the DELETE route definition BEFORE the `if __name__ == '__main__'` block.

---

### 3. **Duplicate Auth Context Files**
**Location**: `project/src/contexts/`
- `AuthContext.tsx` (167 lines) - Main auth context
- `AuthContextMongo.tsx` (107 lines) - MongoDB-specific auth context

**Issue**: Both provide similar authentication functionality but with different implementations:
- `AuthContext.tsx` - Uses username/email registration, connects to Express backend
- `AuthContextMongo.tsx` - Uses email-only registration, simpler implementation

**Problem**: The app likely uses only one, causing confusion about which is active.

**Recommendation**: 
- Check which one is imported in `App.tsx` or `main.tsx`
- Remove the unused one or consolidate into a single file with configuration

---

### 4. **Duplicate Service Files**
**Location**: `project/src/services/`

#### Analysis Services (3 versions):
- `analysisService.ts` - Base service
- `analysisServiceMongo.ts` - MongoDB variant
- `mongoAnalysisService.ts` - Another MongoDB variant

#### Analytics Services (2 versions):
- `analyticsService.ts` - Base service
- `analyticsServiceMongo.ts` - MongoDB variant using direct MongoDB client
- `mongoAnalyticsService.ts` - Another MongoDB variant

#### Notification Services (2 versions):
- `notificationService.ts` - Base service
- `notificationServiceMongo.ts` - MongoDB variant

**Issue**: Multiple versions of the same service exist with similar functionality.

**Problem**: 
- Confusion about which service to import
- Potential inconsistency in API calls
- Increased maintenance burden

**Recommendation**: 
- Consolidate to a single version per service type
- Use dependency injection or configuration to handle different backends if needed

---

## 🟡 Route Duplicates

### 5. **Duplicate API Endpoints Between Express and Flask**
**Location**: 
- Express: `project/server/src/routes/`
- Flask: `project/model_service/app.py` and `main.py`

**Overlapping Routes**:
- `/api/register` - Defined in both Express (`auth.js`) and Flask (`app.py`, `main.py`)
- `/api/login` - Defined in both Express (`auth.js`) and Flask (`app.py`, `main.py`)
- `/api/analyses` - Defined in both Express (`analyses.js`) and Flask (`app.py`, `main.py`)
- `/api/analyze` - Defined in Flask (`app.py`, `main.py`) but not Express

**Issue**: Having the same routes in multiple backends can cause conflicts if both are running.

**Recommendation**: 
- Use Express backend for API routes (standard architecture)
- Use Flask only for AI model inference via internal service calls
- Or clearly document which backend handles which routes

---

## 🟢 Potential Duplicates (Need Verification)

### 6. **Model Files**
**Location**: 
- `project/model_service/best_model.pth`
- `project/server/src/ml_models/best_combined_model.pth`

**Issue**: Two model files exist in different locations.

**Recommendation**: 
- Verify if these are the same model
- Consolidate to a single location
- Document which one is actively used

---

### 7. **Configuration Files**
**Location**: `project/model_service/config.py`

**Issue**: Configuration may be duplicated in `app.py` and `config.py`.

**Recommendation**: 
- Use `config.py` as the single source of truth
- Import configuration in `app.py` instead of redefining

---

## 📋 Summary

### High Priority Fixes:
1. ⚠️ **Fix unreachable route** in `app.py` (move DELETE route before `if __name__`)
2. ⚠️ **Decide on backend architecture** - Express OR Flask, not both for same routes
3. ⚠️ **Remove unused service files** - Consolidate analysis/analytics/notification services

### Medium Priority:
4. 📝 **Remove or archive `main.py`** if `app.py` is the active backend
5. 📝 **Consolidate AuthContext files** - Keep only the one in use

### Low Priority:
6. 📝 **Document which backend handles which routes**
7. 📝 **Verify model files are not duplicates**

---

## 🛠️ Recommended Actions

1. **Immediate**: Fix the unreachable route in `app.py`
2. **Short-term**: Choose one backend architecture and remove duplicates
3. **Long-term**: Implement a unified service layer that can switch between backends via configuration

---

**Generated**: $(date)
**Files Analyzed**: 50+
**Duplicates Found**: 7 categories
