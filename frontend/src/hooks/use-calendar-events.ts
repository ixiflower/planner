import { useEffect, useRef, useState } from "react"
import NotificationService from "@/lib/services/NotificationService"

interface CalendarEvent {
  id: string
  title: string
  startTime: Date
  endTime: Date
}

export interface ActiveNotification {
  id: string
  title: string
  description: string
  isStart: boolean
}

export function useCalendarEvents(
  events: CalendarEvent[],
  notificationsEnabled: boolean
) {
  const [activeNotifications, setActiveNotifications] = useState<
    ActiveNotification[]
  >([])
  const notificationService = useRef(NotificationService.getInstance())
  const checkIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined)

  useEffect(() => {
    notificationService.current.setEnabled(notificationsEnabled)
  }, [notificationsEnabled])

  useEffect(() => {
    if (!notificationsEnabled) {
      setActiveNotifications([])
      return
    }

    const checkEvents = () => {
      const now = new Date()
      const notifications: ActiveNotification[] = []

      events.forEach((event) => {
        const startDiff = event.startTime.getTime() - now.getTime()
        if (startDiff >= 0 && startDiff <= 1000) {
          notificationService.current.playEventStartSound()
          notifications.push({
            id: `${event.id}-start`,
            title: "Event Starting",
            description: event.title,
            isStart: true,
          })
        }

        const endDiff = event.endTime.getTime() - now.getTime()
        if (endDiff >= 0 && endDiff <= 1000) {
          notificationService.current.playEventEndSound()
          notifications.push({
            id: `${event.id}-end`,
            title: "Event Ending",
            description: event.title,
            isStart: false,
          })
        }
      })

      if (notifications.length > 0) {
        setActiveNotifications((prev) => [...prev, ...notifications])
      }
    }

    checkIntervalRef.current = setInterval(checkEvents, 1000)

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }
    }
  }, [events, notificationsEnabled])

  const removeNotification = (notificationId: string) => {
    setActiveNotifications((prev) =>
      prev.filter((notification) => notification.id !== notificationId)
    )
  }

  return {
    activeNotifications,
    removeNotification,
  }
}