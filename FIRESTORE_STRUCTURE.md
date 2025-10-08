# 🔥 Firestore Database Structure

## Database Organization

### Collection: `users`
Each user has their own document identified by their Firebase Auth UID.

```
users/
  {userId}/
    data/
      settings (document)
    sessions/
      {date} (document)
```

---

## Document Structures

### `users/{userId}/data/settings`
Stores user preferences and personalization.

```typescript
{
  reminders: {
    weekdayHour: number,      // 0-23
    weekdayMinute: number,    // 0-59
    weekendHour: number,      // 0-23
    weekendMinute: number     // 0-59
  },
  personalization: {
    vorDefaultBpm: number     // Default BPM for VOR exercises
  }
}
```

**Example:**
```json
{
  "reminders": {
    "weekdayHour": 8,
    "weekdayMinute": 0,
    "weekendHour": 9,
    "weekendMinute": 30
  },
  "personalization": {
    "vorDefaultBpm": 55
  }
}
```

---

### `users/{userId}/sessions/{date}`
Stores daily exercise sessions. Document ID is the date in `YYYY-MM-DD` format.

```typescript
{
  date: string,                    // "YYYY-MM-DD"
  baseline: number,                // 0-10 symptom severity
  baselineRecordedAt: string,      // ISO timestamp
  exercises: Array<{
    config: {
      id: string,                  // Exercise type ID
      title: string,
      description: string,
      instruction?: string,
      durationSeconds: number,
      hasMetronome?: boolean,
      bpm?: number
    },
    result?: {
      startedAt: string,           // ISO timestamp
      endedAt: string,             // ISO timestamp
      worsened: boolean,
      severity: number             // 0-9 if worsened
    },
    adviceForNextTime?: string
  }>,
  completedAt?: string             // ISO timestamp when all exercises done
}
```

**Example:**
```json
{
  "date": "2025-10-08",
  "baseline": 3,
  "baselineRecordedAt": "2025-10-08T14:30:00.000Z",
  "exercises": [
    {
      "config": {
        "id": "saccades",
        "title": "Saccades",
        "description": "Hold two arms out and focus on the end of your index finger.",
        "instruction": "Shoot your eyes between each finger, changing position/location every 5-10 repetitions",
        "durationSeconds": 30,
        "hasMetronome": false
      },
      "result": {
        "startedAt": "2025-10-08T14:32:00.000Z",
        "endedAt": "2025-10-08T14:32:30.000Z",
        "worsened": false,
        "severity": 0
      }
    },
    {
      "config": {
        "id": "vor_lr",
        "title": "VOR – Left ↔ Right",
        "description": "Hold finger out and focus on it.",
        "instruction": "Rotate your head left to right while focusing on finger",
        "durationSeconds": 30,
        "hasMetronome": true,
        "bpm": 55
      },
      "result": {
        "startedAt": "2025-10-08T14:33:00.000Z",
        "endedAt": "2025-10-08T14:33:30.000Z",
        "worsened": true,
        "severity": 2
      },
      "adviceForNextTime": "BPM adjusted to 50 for next session"
    }
  ],
  "completedAt": "2025-10-08T14:40:00.000Z"
}
```

---

## Real-time Synchronization

### Automatic Updates
- ✅ **Sessions** are synchronized in real-time using Firestore listeners
- ✅ Changes made on one device instantly appear on all logged-in devices
- ✅ Offline support - changes are queued and synced when online

### When Data is Saved

1. **Session Creation** - When user starts exercises for the day
2. **Baseline Recording** - When user sets their symptom baseline
3. **Exercise Completion** - After each exercise is completed
4. **Settings Update** - When user changes reminder times or personalization
5. **Session Completion** - When all exercises are finished

---

## Firestore Rules (Recommended)

Add these security rules in Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## Queries Used

1. **Load Sessions** (with real-time listener)
   ```typescript
   query(
     collection(db, 'users', userId, 'sessions'),
     orderBy('date', 'desc')
   )
   ```

2. **Get Today's Session**
   ```typescript
   doc(db, 'users', userId, 'sessions', '2025-10-08')
   ```

3. **Get Settings**
   ```typescript
   doc(db, 'users', userId, 'data', 'settings')
   ```

---

## Migration from localStorage

The app automatically migrates from localStorage (v2) to Firestore when a user logs in. Old data is not automatically migrated, but users will start fresh with cloud storage.

---

## Advantages

✅ **Cross-device sync** - Access your data from any device
✅ **Real-time updates** - Changes sync instantly
✅ **Data persistence** - Never lose your progress
✅ **Offline support** - Works offline, syncs when online
✅ **Scalability** - Cloud infrastructure handles growth
✅ **Security** - Firebase authentication & rules protect data

