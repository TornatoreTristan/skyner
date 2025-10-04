import { injectable, inject } from 'inversify'
import { EventEmitter } from 'events'
import { TYPES } from '#shared/container/types'
import type QueueService from './queue_service.js'

export interface EventData {
  [key: string]: any
}

export interface EventOptions {
  async?: boolean // Si true, traite l'événement via queue
  queue?: string // Queue à utiliser (par défaut: 'default')
  delay?: number // Délai en ms avant traitement
  priority?: number // Priorité (1-10, 10 = priorité max)
}

export type EventHandler<T = EventData> = (data: T) => Promise<void> | void

@injectable()
export default class EventBusService extends EventEmitter {
  private asyncHandlers: Map<string, EventHandler[]> = new Map()

  constructor(@inject(TYPES.QueueService) private queueService: QueueService) {
    super()
    this.setMaxListeners(100) // Augmenter la limite pour éviter les warnings
    this.setupQueueProcessors()
  }

  /**
   * Émettre un événement
   */
  async emit(eventName: string, data: EventData = {}, options: EventOptions = {}): Promise<boolean> {
    const { async = false, queue = 'default', delay, priority } = options

    if (async) {
      // Traitement asynchrone via queue
      await this.queueService.dispatch(
        `event:${eventName}`,
        { eventName, data },
        {
          queue,
          delay,
          priority,
        }
      )
      return true
    } else {
      // Traitement synchrone immédiat
      return super.emit(eventName, data)
    }
  }

  /**
   * Enregistrer un listener synchrone
   */
  on(eventName: string, handler: EventHandler): this {
    return super.on(eventName, handler)
  }

  /**
   * Enregistrer un listener synchrone (une seule fois)
   */
  once(eventName: string, handler: EventHandler): this {
    return super.once(eventName, handler)
  }

  /**
   * Enregistrer un listener asynchrone (traité via queue)
   */
  onAsync(eventName: string, handler: EventHandler): void {
    if (!this.asyncHandlers.has(eventName)) {
      this.asyncHandlers.set(eventName, [])
    }
    this.asyncHandlers.get(eventName)!.push(handler)
  }

  /**
   * Supprimer un listener
   */
  off(eventName: string, handler: EventHandler): this {
    // Supprimer des listeners synchrones
    super.off(eventName, handler)

    // Supprimer des listeners asynchrones
    const asyncHandlers = this.asyncHandlers.get(eventName)
    if (asyncHandlers) {
      const index = asyncHandlers.indexOf(handler)
      if (index > -1) {
        asyncHandlers.splice(index, 1)
      }
    }

    return this
  }

  /**
   * Supprimer tous les listeners d'un événement
   */
  removeAllListeners(eventName?: string): this {
    super.removeAllListeners(eventName)

    if (eventName) {
      this.asyncHandlers.delete(eventName)
    } else {
      this.asyncHandlers.clear()
    }

    return this
  }

  /**
   * Émettre un événement avec retry automatique
   */
  async emitWithRetry(
    eventName: string,
    data: EventData = {},
    maxRetries: number = 3,
    options: EventOptions = {}
  ): Promise<boolean> {
    return this.emit(eventName, data, {
      ...options,
      async: true,
      // Bull gère automatiquement les retries
    })
  }

  /**
   * Émettre un événement après un délai
   */
  async emitDelayed(
    eventName: string,
    data: EventData = {},
    delayMs: number,
    options: EventOptions = {}
  ): Promise<boolean> {
    return this.emit(eventName, data, {
      ...options,
      delay: delayMs,
    })
  }

  /**
   * Émettre un événement récurrent
   */
  async emitRecurring(
    eventName: string,
    data: EventData = {},
    cronExpression: string,
    options: EventOptions = {}
  ): Promise<void> {
    await this.queueService.dispatchRecurring(
      `event:${eventName}`,
      { eventName, data },
      cronExpression,
      {
        queue: options.queue || 'default',
        priority: options.priority,
      }
    )
  }

  /**
   * Obtenir la liste des événements avec leurs listeners
   */
  getEventListeners(): Record<string, { sync: number; async: number }> {
    const result: Record<string, { sync: number; async: number }> = {}

    // Listeners synchrones
    for (const eventName of this.eventNames()) {
      const syncCount = this.listenerCount(eventName as string)
      const asyncCount = this.asyncHandlers.get(eventName as string)?.length || 0

      result[eventName as string] = {
        sync: syncCount,
        async: asyncCount,
      }
    }

    // Listeners asynchrones uniquement
    for (const [eventName, handlers] of this.asyncHandlers) {
      if (!result[eventName]) {
        result[eventName] = { sync: 0, async: handlers.length }
      }
    }

    return result
  }

  /**
   * Configuration des processors de queue pour les événements asynchrones
   */
  private setupQueueProcessors(): void {
    // Processor générique pour tous les événements async
    this.queueService.registerProcessor(
      'event:*',
      async (job) => {
        const { eventName, data } = job.data
        await this.processAsyncEvent(eventName, data)
      },
      'default'
    )

    // On peut aussi créer des processors spécialisés
    this.queueService.registerProcessor(
      'event:user.created',
      async (job) => {
        const { data } = job.data
        await this.processAsyncEvent('user.created', data)
      },
      'default'
    )

    this.queueService.registerProcessor(
      'event:user.deleted',
      async (job) => {
        const { data } = job.data
        await this.processAsyncEvent('user.deleted', data)
      },
      'default'
    )
  }

  /**
   * Traiter un événement asynchrone
   */
  private async processAsyncEvent(eventName: string, data: EventData): Promise<void> {
    const handlers = this.asyncHandlers.get(eventName) || []

    // Exécuter tous les handlers en parallèle
    const promises = handlers.map(async (handler) => {
      try {
        await handler(data)
      } catch (error) {
        console.error(`Error in async handler for event ${eventName}:`, error)
        throw error // Re-throw pour que Bull puisse retry
      }
    })

    await Promise.all(promises)
  }
}