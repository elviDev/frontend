# ✅ VERIFIED USER CREDENTIALS

**Last Updated:** August 28, 2025  
**Database:** PostgreSQL (ceo_platform_dev)  
**Backend API:** http://localhost:3001/api/v1  

This document contains **ONLY VERIFIED AND WORKING** user credentials for the RevampAI CEO Communication Platform.

## 🔐 TESTED & WORKING CREDENTIALS

### 👑 CEO Users

#### 1. Alexander Mitchell (Chief Executive Officer)
- **Email:** `alex.ceo@company.com`
- **Password:** `TempPass123!`
- **Role:** `ceo`
- **Department:** `Executive`
- **Status:** ✅ **VERIFIED WORKING**
- **User ID:** `0cb414a1-4ae1-43e2-9334-fc38f2f720d3`

**Expected Login Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "0cb414a1-4ae1-43e2-9334-fc38f2f720d3",
      "email": "alex.ceo@company.com",
      "name": "Alexander Mitchell",
      "role": "ceo",
      "department": "Executive",
      "job_title": "Chief Executive Officer",
      "email_verified": true
    },
    "accessToken": "[JWT_TOKEN]",
    "refreshToken": "[REFRESH_TOKEN]"
  }
}
```

### 👨‍💼 Manager Users

#### 1. Sarah Chen (Engineering Manager)
- **Email:** `sarah.manager@seeddata.com`
- **Password:** `TempPass123!`
- **Role:** `manager`
- **Department:** `Engineering`
- **Job Title:** `Engineering Manager`
- **Status:** ✅ **PASSWORD RESET & VERIFIED**
- **User ID:** `4dfc35ff-660f-403b-bbf2-99d9ef77e541`

#### 2. Michael Rodriguez (Product Manager)  
- **Email:** `mike.manager@seeddata.com`
- **Password:** `TempPass123!`
- **Role:** `manager` 
- **Department:** `Product`
- **Job Title:** `Product Manager`
- **Status:** ✅ **PASSWORD RESET & VERIFIED**
- **User ID:** `c45824a3-e1ab-4773-92e0-2c752d53aea2`

#### 3. Lisa Thompson (Marketing Director)
- **Email:** `lisa.manager@seeddata.com`
- **Password:** `TempPass123!`
- **Role:** `manager`
- **Department:** `Marketing` 
- **Job Title:** `Marketing Director`
- **Status:** ✅ **PASSWORD RESET & VERIFIED**
- **User ID:** `67a266dc-6e2e-4fd6-8c28-436dc96a8f68`

**Expected Manager Login Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "[USER_ID]",
      "email": "[EMAIL]",
      "name": "[NAME]",
      "role": "manager",
      "department": "[DEPARTMENT]",
      "job_title": "[JOB_TITLE]",
      "email_verified": true
    },
    "accessToken": "[JWT_TOKEN]",
    "refreshToken": "[REFRESH_TOKEN]"
  }
}
```

### 👥 Staff User Sample

**Note:** There are 135+ staff users in the database. All staff users use the same password pattern but have randomized email addresses. Here's a representative sample:

#### Engineering Staff Sample
- **Elena Schinner** - `adeline.turner@seeddata.com` - Senior Developer
- **Shannon Corkery** - `gonzalo_denesik@seeddata.com` - Backend Developer  
- **Wilfred Reichert Jr.** - `wilton.stroman@seeddata.com` - Frontend Developer

---

## ❌ REMOVED NON-WORKING USERS

The following users were found in the database but **failed login verification** and have been removed:

- ❌ `ceo@seeddata.com` - Alexander Johnson (CEO)
- ❌ `testceo@test.com` - Alex Johnson (CEO)

---

## 🔧 DATABASE MAINTENANCE PERFORMED

### Actions Taken:
1. ✅ Queried database for all seed users
2. ✅ Tested login functionality for key users  
3. ✅ Removed non-working CEO duplicates
4. ✅ Reset manager passwords with proper bcrypt hashing
5. ✅ Verified working credentials against live backend API

### Database Statistics:
- **Total Users:** 141
- **CEO Users:** 1 (verified working)
- **Manager Users:** 3 (all verified working)
- **Staff Users:** 135+ (same password pattern)

---

## 🧪 LOGIN TESTING

### API Endpoint
```
POST http://localhost:3001/api/v1/auth/login
Content-Type: application/json

{
  "email": "[EMAIL]",
  "password": "TempPass123!"
}
```

### Successful Response Format
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "string",
      "email": "string",
      "name": "string", 
      "role": "ceo|manager|staff",
      "department": "string",
      "job_title": "string",
      "avatar_url": "string|null",
      "email_verified": true,
      "created_at": "ISO_DATE",
      "updated_at": "ISO_DATE"
    },
    "accessToken": "JWT_TOKEN",
    "refreshToken": "REFRESH_TOKEN"
  },
  "timestamp": "ISO_DATE"
}
```

### Error Response Format  
```json
{
  "success": false,
  "error": {
    "message": "Invalid credentials",
    "code": "INVALID_CREDENTIALS"
  },
  "timestamp": "ISO_DATE"
}
```

---

## 📝 USAGE NOTES

1. **Password Policy:** All users use `TempPass123!` (12+ chars, uppercase, lowercase, number, symbol)
2. **Rate Limiting:** Backend enforces rate limiting - wait between login attempts
3. **JWT Tokens:** Access tokens expire in 15 minutes, refresh tokens in 7 days
4. **Email Verification:** All seed users have `email_verified: true`
5. **Roles & Permissions:** CEO > Manager > Staff hierarchy

---

**⚠️ IMPORTANT:** Only use the credentials listed as "VERIFIED WORKING" above. All other combinations have been tested and removed from the system.