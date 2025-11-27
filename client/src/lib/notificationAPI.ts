/**
 * Notification API client for sending notifications
 */

const API_URL = import.meta.env.DEV ? "http://localhost:3001" : "";

export interface SendNotificationPayload {
  userIds: string[];
  title: string;
  body: string;
  icon?: string;
  badge?: string;
}

export async function sendNotification(payload: SendNotificationPayload) {
  try {
    const response = await fetch(`${API_URL}/api/notifications/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {

    return { success: false, error: String(error) };
  }
}

export async function sendNotificationToAdmins(
  title: string,
  body: string,
  icon?: string
) {
  try {
    const response = await fetch(`${API_URL}/api/notifications/send-to-admins`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, body, icon }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {

    return { success: false, error: String(error) };
  }
}
