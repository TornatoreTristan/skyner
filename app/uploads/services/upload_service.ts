import { injectable, inject } from 'inversify'
import { TYPES } from '#shared/container/types'
import UploadRepository from '#uploads/repositories/upload_repository'
import StorageService from '#uploads/services/storage_service'
import Upload from '#uploads/models/upload'
import type { UploadFilters, UploadMetadata, DiskType, VisibilityType } from '#uploads/types/upload'

export interface UploadFileOptions {
  userId: string
  file: Buffer
  filename: string
  mimeType: string
  size: number
  disk: DiskType
  visibility: VisibilityType
  storagePath?: string
  uploadableType?: string
  uploadableId?: string
  metadata?: UploadMetadata
}

@injectable()
export default class UploadService {
  constructor(
    @inject(TYPES.UploadRepository) private uploadRepo: UploadRepository,
    @inject(TYPES.StorageService) private storageService: StorageService
  ) {}

  async uploadFile(options: UploadFileOptions): Promise<Upload> {
    const storagePath = options.storagePath || this.generateStoragePath(options.filename)

    await this.storageService.store(options.file, storagePath, {
      disk: options.disk,
      visibility: options.visibility,
      contentType: options.mimeType,
    })

    const upload = await this.uploadRepo.create({
      userId: options.userId,
      filename: options.filename,
      storagePath,
      disk: options.disk,
      mimeType: options.mimeType,
      size: options.size,
      visibility: options.visibility,
      uploadableType: options.uploadableType || null,
      uploadableId: options.uploadableId || null,
      metadata: options.metadata || null,
    })

    return upload
  }

  async getUserUploads(userId: string): Promise<Upload[]> {
    return this.uploadRepo.findByUserId(userId)
  }

  async getUploads(filters: UploadFilters): Promise<Upload[]> {
    return this.uploadRepo.findBy(filters)
  }

  async getUploadById(id: string): Promise<Upload | null> {
    return this.uploadRepo.findById(id)
  }

  async getSignedUrl(uploadId: string, expiresIn: number = 3600): Promise<string> {
    const upload = await this.uploadRepo.findById(uploadId)
    if (!upload) {
      throw new Error('Upload not found')
    }

    return this.storageService.getSignedUrl(upload.storagePath, upload.disk, expiresIn)
  }

  async getPublicUrl(uploadId: string): Promise<string> {
    const upload = await this.uploadRepo.findById(uploadId)
    if (!upload) {
      throw new Error('Upload not found')
    }

    return this.storageService.getPublicUrl(upload.storagePath, upload.disk)
  }

  async deleteUpload(id: string): Promise<void> {
    const upload = await this.uploadRepo.findById(id)
    if (!upload) {
      throw new Error('Upload not found')
    }

    await this.storageService.delete(upload.storagePath, upload.disk)
    await this.uploadRepo.delete(id)
  }

  private generateStoragePath(filename: string): string {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const timestamp = Date.now()
    const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, '_')

    return `uploads/${year}/${month}/${timestamp}-${sanitized}`
  }
}
