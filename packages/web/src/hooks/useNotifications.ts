import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { WsEvent } from '@/types';

// Request notification permission on first load
export function useNotificationPermission() {
  const { currentAccount } = useAuth();

  useEffect(() => {
    if (!currentAccount) return;
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [currentAccount]);
}

// Show native notification when tab is hidden
export function showNotification(title: string, body: string, icon?: string) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  if (document.visibilityState === 'visible') return; // Don't notify if tab is active

  const notification = new Notification(title, {
    body,
    icon: icon ?? '/lobster-192.png',
    badge: '/lobster-192.png',
    tag: `lr-${Date.now()}`, // Prevent stacking
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
  };

  // Auto-close after 5s
  setTimeout(() => notification.close(), 5000);
}

// Handle WS events and fire notifications for relevant ones
export function handleNotificationEvent(
  event: WsEvent,
  currentAccountId: string,
  accountNames: Map<string, string>,
) {
  if (event.type === 'message.new') {
    const msg = event.data;
    // Don't notify for own messages
    if (msg.senderId === currentAccountId) return;
    const senderName = accountNames.get(msg.senderId) ?? 'Someone';
    showNotification(
      `${senderName} in Lobster Roll`,
      msg.content.slice(0, 100),
    );
  }

  if (event.type === 'task.assigned') {
    const task = event.data;
    if (task.assigneeId !== currentAccountId) return;
    const assignerName = accountNames.get(task.assignerId) ?? 'Someone';
    showNotification(
      `📋 New task from ${assignerName}`,
      task.title.slice(0, 100),
    );
  }

  if (event.type === 'mention.new') {
    const mention = event.data;
    if (mention.targetId !== currentAccountId) return;
    showNotification(
      '💬 You were mentioned',
      'Someone mentioned you in a channel',
    );
  }

  if (event.type === 'approval.requested') {
    showNotification(
      '🔐 Approval requested',
      `${event.data.actionType}: needs your decision`,
    );
  }
}
