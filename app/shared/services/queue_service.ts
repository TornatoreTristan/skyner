import { injectable, inject } from 'inversify'
import Queue, { Job, JobOptions } from 'bull'
import type Redis from 'ioredis'
import { TYPES } from '#shared/container/types'

export interface QueueJobData {
  [key: string]: any
}

export interface QueueOptions extends JobOptions {
  queue?: string // Nom de la queue (par défaut: 'default')
}

@injectable()
export default class QueueService {
  private queues: Map<string, Queue.Queue> = new Map()
  private processors: Map<string, Function> = new Map()

  constructor(@inject(TYPES.RedisClient) private redis: Redis) {
    this.setupDefaultQueue()
  }

  /**
   * Créer ou récupérer une queue
   */
  getQueue(name: string = 'default'): Queue.Queue {
    if (!this.queues.has(name)) {
      const queue = new Queue(name, {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
          db: parseInt(process.env.REDIS_DB || '0'),
        },
        defaultJobOptions: {
          removeOnComplete: 10, // Garder les 10 derniers jobs réussis
          removeOnFail: 50, // Garder les 50 derniers jobs échoués
          attempts: 3, // 3 tentatives par défaut
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      })

      // Gestion des erreurs globales
      queue.on('error', (error) => {
        console.error(`Queue ${name} error:`, error)
      })

      queue.on('waiting', (jobId) => {
        console.log(`Job ${jobId} is waiting in queue ${name}`)
      })

      queue.on('active', (job: Job) => {
        console.log(`Job ${job.id} started processing in queue ${name}`)
      })

      queue.on('completed', (job: Job, result) => {
        console.log(`Job ${job.id} completed in queue ${name}`)
      })

      queue.on('failed', (job: Job, err) => {
        console.error(`Job ${job.id} failed in queue ${name}:`, err)
      })

      this.queues.set(name, queue)
    }

    return this.queues.get(name)!
  }

  /**
   * Ajouter un job à une queue
   */
  async dispatch(
    jobName: string,
    data: QueueJobData,
    options: QueueOptions = {}
  ): Promise<Job> {
    const { queue = 'default', ...jobOptions } = options
    const queueInstance = this.getQueue(queue)

    return queueInstance.add(jobName, data, jobOptions)
  }

  /**
   * Ajouter un job avec délai
   */
  async dispatchDelayed(
    jobName: string,
    data: QueueJobData,
    delayMs: number,
    options: QueueOptions = {}
  ): Promise<Job> {
    return this.dispatch(jobName, data, {
      ...options,
      delay: delayMs,
    })
  }

  /**
   * Ajouter un job récurrent (cron)
   */
  async dispatchRecurring(
    jobName: string,
    data: QueueJobData,
    cronExpression: string,
    options: QueueOptions = {}
  ): Promise<Job> {
    return this.dispatch(jobName, data, {
      ...options,
      repeat: { cron: cronExpression },
    })
  }

  /**
   * Enregistrer un processor pour un type de job
   */
  registerProcessor(
    jobName: string,
    processor: (job: Job) => Promise<any>,
    queueName: string = 'default'
  ): void {
    const queue = this.getQueue(queueName)
    const processorKey = `${queueName}:${jobName}`

    // Éviter d'enregistrer plusieurs fois le même processor
    if (this.processors.has(processorKey)) {
      console.warn(`Processor for ${processorKey} already registered`)
      return
    }

    queue.process(jobName, async (job: Job) => {
      try {
        console.log(`Processing job ${job.id} (${jobName}) with data:`, job.data)
        const result = await processor(job)
        console.log(`Job ${job.id} processed successfully`)
        return result
      } catch (error) {
        console.error(`Job ${job.id} processing failed:`, error)
        throw error
      }
    })

    this.processors.set(processorKey, processor)
    console.log(`Registered processor for ${processorKey}`)
  }

  /**
   * Obtenir des statistiques sur une queue
   */
  async getQueueStats(queueName: string = 'default'): Promise<{
    waiting: number
    active: number
    completed: number
    failed: number
    delayed: number
  }> {
    const queue = this.getQueue(queueName)

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed(),
    ])

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
    }
  }

  /**
   * Nettoyer les jobs terminés
   */
  async cleanQueue(
    queueName: string = 'default',
    grace: number = 24 * 60 * 60 * 1000 // 24h par défaut
  ): Promise<void> {
    const queue = this.getQueue(queueName)
    await queue.clean(grace, 'completed')
    await queue.clean(grace, 'failed')
  }

  /**
   * Pauser une queue
   */
  async pauseQueue(queueName: string = 'default'): Promise<void> {
    const queue = this.getQueue(queueName)
    await queue.pause()
  }

  /**
   * Reprendre une queue
   */
  async resumeQueue(queueName: string = 'default'): Promise<void> {
    const queue = this.getQueue(queueName)
    await queue.resume()
  }

  /**
   * Fermer toutes les queues (pour le shutdown graceful)
   */
  async closeAll(): Promise<void> {
    const closePromises = Array.from(this.queues.values()).map((queue) => queue.close())
    await Promise.all(closePromises)
    this.queues.clear()
    this.processors.clear()
  }

  /**
   * Configuration de la queue par défaut
   */
  private setupDefaultQueue(): void {
    this.getQueue('default')

    // Queue spécialisées
    this.getQueue('emails') // Pour les emails
    this.getQueue('analytics') // Pour l'analytics
    this.getQueue('cleanup') // Pour les tâches de nettoyage
  }
}