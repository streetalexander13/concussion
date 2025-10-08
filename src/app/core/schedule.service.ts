import { Injectable } from '@angular/core';
import { DataService } from './data.service';

@Injectable({ providedIn: 'root' })
export class ScheduleService {
  constructor(private data: DataService) {}

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) return 'denied';
    if (Notification.permission === 'granted') return 'granted';
    try {
      return await Notification.requestPermission();
    } catch {
      return 'denied';
    }
  }

  // Local reminder using setTimeout while tab is open; for production use Service Worker & Push API.
  scheduleNextReminder(): number | null {
    if (!('Notification' in window)) return null;
    if (Notification.permission !== 'granted') return null;
    const now = new Date();
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    const r = this.data.state().settings.reminders;
    const hour = isWeekend ? r.weekendHour : r.weekdayHour;
    const minute = isWeekend ? r.weekendMinute : r.weekdayMinute;
    const target = new Date();
    target.setHours(hour, minute, 0, 0);
    if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
    const ms = target.getTime() - now.getTime();
    const id = window.setTimeout(() => {
      new Notification('Concussion Recovery', {
        body: 'Time to do your exercises for today. Tap to start.',
      });
    }, ms);
    return id;
  }
}


