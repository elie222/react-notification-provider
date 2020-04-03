import React, { useState, createContext, useContext } from 'react';

/**
 * Represents a queued item. The ID is used internally to reference every notification. The generic types is intended
 * to be used by the end user so they can have a custom notification shape.
 */
export type Queued<Notification> = {
  id: string;
  data: Notification;
};

/**
 * This is the returned result from the hook
 */
export interface Queue<Notification> {
  add: (id: string, notification: Notification) => void;
  remove: (id: string) => void;
  removeAll: () => void;
  list: Queued<Notification>[];
}

interface MockProps<Notification> {
  queue?: Queue<Notification>;
  children: React.ReactNode;
}

/**
 * Create a React context and hook for accessing it typed to your notification shape.
 *
 *      const { NotificationQueueProvider, useNotifications } = createNotificationContext<Notification>();
 *
 * This allows you to skip some of the ceremony needed to setup your own notification renderer.
 */
export function createNotificationContext<Notification>() {
  const NotificationQueueContext = createContext<Queue<Notification> | null>(
    null
  );

  /**
   * This hook allows you to add and remove notifications from within your components.
   */
  function useNotifications(): Queue<Notification> {
    const queue = useContext(NotificationQueueContext);
    if (!queue) {
      throw new Error('Missing <NotificationQueueProvider>');
    }
    return queue;
  }

  /**
   * This component should wrap your app. It allows components to use the useNotifications hook.
   * @param props
   */
  function NotificationQueueProvider(props: {
    queue: Queue<Notification>;
    children: React.ReactNode;
  }): JSX.Element {
    const { queue, children } = props;
    return (
      <NotificationQueueContext.Provider value={queue}>
        {children}
      </NotificationQueueContext.Provider>
    );
  }

  /**
   * Create a mock provider to use in tests. You can optionally pass in a custom queue so you can inspect the
   * notifications that can be fired.
   *
   *      <MockNotificationQueueProvider>
   *        <Component />
   *      </MockNotificationQueueProvider>
   *
   * This is useful for tests and stories.
   * @param props
   */
  function MockNotificationQueueProvider(
    props: MockProps<Notification>
  ): JSX.Element {
    const { queue, children } = props;
    return (
      <NotificationQueueContext.Provider
        value={queue ? queue : createMockNotificationQueue()}
      >
        {children}
      </NotificationQueueContext.Provider>
    );
  }

  /**
   * Create a fake notification queue that can be used during tests and stories.
   *
   *      const queue = createMockNotificationQueue();
   *
   *      const { findByText } = render(
   *        <MockNotificationQueueProvider queue={queue}>
   *          <MyComponent />
   *        </MockNotificationQueueProvider>
   *      );
   *
   *      const el = await findByText('Submit');
   *
   *      act(() => {
   *        fireEvent.click(el);
   *      })
   *
   *      expect(queue.list.length).toBe(1);
   *      expect(queue.list[0]).toEqual({ id: 'submitting', data: { message: 'Submitting...' } });
   *
   * This will let you test that notifications are correctly firing without needing to look for elements in the DOM.
   */
  function createMockNotificationQueue(): Queue<Notification> {
    let list: Queued<Notification>[] = [];

    return {
      add(id: string, notification: Notification): void {
        const matchIndex = list.findIndex(n => {
          return n.id === id;
        });
        const copy = list.slice();
        if (matchIndex > -1) {
          copy.splice(matchIndex, 1, {
            id,
            data: notification,
          });
        } else {
          copy.push({
            id,
            data: notification,
          });
        }
        list.splice(0, list.length);
        list.push(...copy);
      },
      remove(id: string): void {
        const copy = list.filter(n => n.id !== id);
        list.splice(0, list.length);
        list.push(...copy);
      },
      removeAll(): void {
        list.splice(0, list.length);
      },
      list,
    };
  }

  /**
   * This hook lets you create a notification queue that can be manipulated. It accepts a notification type that describes
   * the shape of every notification that is allowed to be emitted. This doesn't provide any UI for the notifications.
   * This is left up to the end user to implement.
   *
   * This means you'll need to create your own NotificationProvider to create the queue, render the notifications, and
   * provide the queue API to your components so they can add notifications.
   *
   *      interface CustomNotification {
   *        message: string;
   *      }
   *
   *      function MyNotificationProvider() {
   *        const queue = useNotificationQueue<CustomNotification>();
   *
   *        return (
   *          queue.list.map(item => {
   *            return <div>{item.message}</div>
   *          })
   *        )
   *      }
   */
  function useNotificationQueue(): Queue<Notification> {
    const [queue, setQueue] = useState<Queued<Notification>[]>([]);

    return {
      /**
       * Add a new notification to the queue. If the ID already exists it will updated.
       * @param id Unique string identifier for notification.
       * @param notification
       */
      add(id: string, notification: Notification): void {
        setQueue(queue => {
          const matchIndex = queue.findIndex(n => {
            return n.id === id;
          });
          const copy = queue.slice();
          if (matchIndex > -1) {
            copy.splice(matchIndex, 1, {
              id,
              data: notification,
            });
          } else {
            copy.push({
              id,
              data: notification,
            });
          }
          return copy;
        });
      },

      /**
       * Remove a notification by ID
       * @param id Unique string identifier for a notification
       */
      remove(id: string): void {
        setQueue(queue => queue.filter(n => n.id !== id));
      },

      /**
       * Remove all notifications from the page.
       */
      removeAll(): void {
        setQueue([]);
      },

      /**
       * The current array of notifications.
       */
      list: queue,
    };
  }

  return {
    NotificationQueueContext,
    NotificationQueueProvider,
    MockNotificationQueueProvider,
    useNotifications,
    useNotificationQueue,
    createMockNotificationQueue,
  };
}
