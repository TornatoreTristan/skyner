import { test } from '@japa/runner'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import UploadService from '#uploads/services/upload_service'
import UserRepository from '#users/repositories/user_repository'
import UploadRepository from '#uploads/repositories/upload_repository'
import testUtils from '@adonisjs/core/services/test_utils'
import fs from 'node:fs/promises'
import path from 'node:path'

test.group('UploadService', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  group.each.teardown(async () => {
    const uploadsPath = path.join(process.cwd(), 'storage', 'uploads')
    try {
      await fs.rm(uploadsPath, { recursive: true, force: true })
    } catch (error) {
      // Ignore if directory doesn't exist
    }
  })

  test('should upload a file and create database record', async ({ assert }) => {
    const uploadService = getService<UploadService>(TYPES.UploadService)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'uploader@example.com',
      password: 'password123',
      fullName: 'Test Uploader',
    })

    const mockFile = Buffer.from('test file content')
    const upload = await uploadService.uploadFile({
      userId: user.id,
      file: mockFile,
      filename: 'document.pdf',
      mimeType: 'application/pdf',
      size: mockFile.length,
      disk: 'local',
      visibility: 'private',
    })

    assert.exists(upload.id)
    assert.equal(upload.userId, user.id)
    assert.equal(upload.filename, 'document.pdf')
    assert.equal(upload.mimeType, 'application/pdf')
    assert.equal(upload.disk, 'local')
    assert.include(upload.storagePath, 'document.pdf')
  })

  test('should upload file with custom storage path', async ({ assert }) => {
    const uploadService = getService<UploadService>(TYPES.UploadService)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'custom@example.com',
      password: 'password123',
      fullName: 'Custom Path',
    })

    const mockFile = Buffer.from('custom content')
    const upload = await uploadService.uploadFile({
      userId: user.id,
      file: mockFile,
      filename: 'image.jpg',
      mimeType: 'image/jpeg',
      size: mockFile.length,
      disk: 'local',
      visibility: 'public',
      storagePath: 'avatars/custom/image.jpg',
    })

    assert.equal(upload.storagePath, 'avatars/custom/image.jpg')
    assert.equal(upload.visibility, 'public')
  })

  test('should upload file with metadata', async ({ assert }) => {
    const uploadService = getService<UploadService>(TYPES.UploadService)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'metadata@example.com',
      password: 'password123',
      fullName: 'Metadata User',
    })

    const mockFile = Buffer.from('image content')
    const upload = await uploadService.uploadFile({
      userId: user.id,
      file: mockFile,
      filename: 'photo.png',
      mimeType: 'image/png',
      size: mockFile.length,
      disk: 'local',
      visibility: 'private',
      metadata: { width: 1920, height: 1080 },
    })

    assert.deepEqual(upload.metadata, { width: 1920, height: 1080 })
  })

  test('should upload file with polymorphic relation', async ({ assert }) => {
    const uploadService = getService<UploadService>(TYPES.UploadService)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'poly@example.com',
      password: 'password123',
      fullName: 'Poly User',
    })

    const mockFile = Buffer.from('attachment')
    const upload = await uploadService.uploadFile({
      userId: user.id,
      file: mockFile,
      filename: 'attachment.pdf',
      mimeType: 'application/pdf',
      size: mockFile.length,
      disk: 'local',
      visibility: 'private',
      uploadableType: 'Post',
      uploadableId: '123e4567-e89b-12d3-a456-426614174000',
    })

    assert.equal(upload.uploadableType, 'Post')
    assert.equal(upload.uploadableId, '123e4567-e89b-12d3-a456-426614174000')
  })

  test('should get user uploads', async ({ assert }) => {
    const uploadService = getService<UploadService>(TYPES.UploadService)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'getter@example.com',
      password: 'password123',
      fullName: 'Getter User',
    })

    await uploadService.uploadFile({
      userId: user.id,
      file: Buffer.from('file1'),
      filename: 'file1.txt',
      mimeType: 'text/plain',
      size: 5,
      disk: 'local',
      visibility: 'private',
    })

    await uploadService.uploadFile({
      userId: user.id,
      file: Buffer.from('file2'),
      filename: 'file2.txt',
      mimeType: 'text/plain',
      size: 5,
      disk: 'local',
      visibility: 'private',
    })

    const uploads = await uploadService.getUserUploads(user.id)

    assert.lengthOf(uploads, 2)
    assert.isTrue(uploads.every((u) => u.userId === user.id))
  })

  test('should filter uploads by visibility', async ({ assert }) => {
    const uploadService = getService<UploadService>(TYPES.UploadService)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'filter@example.com',
      password: 'password123',
      fullName: 'Filter User',
    })

    await uploadService.uploadFile({
      userId: user.id,
      file: Buffer.from('private file'),
      filename: 'private.txt',
      mimeType: 'text/plain',
      size: 12,
      disk: 'local',
      visibility: 'private',
    })

    await uploadService.uploadFile({
      userId: user.id,
      file: Buffer.from('public file'),
      filename: 'public.txt',
      mimeType: 'text/plain',
      size: 11,
      disk: 'local',
      visibility: 'public',
    })

    const privateUploads = await uploadService.getUploads({ userId: user.id, visibility: 'private' })
    const publicUploads = await uploadService.getUploads({ userId: user.id, visibility: 'public' })

    assert.lengthOf(privateUploads, 1)
    assert.equal(privateUploads[0].visibility, 'private')

    assert.lengthOf(publicUploads, 1)
    assert.equal(publicUploads[0].visibility, 'public')
  })

  test('should generate signed URL for private file', async ({ assert }) => {
    const uploadService = getService<UploadService>(TYPES.UploadService)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'signed@example.com',
      password: 'password123',
      fullName: 'Signed User',
    })

    const upload = await uploadService.uploadFile({
      userId: user.id,
      file: Buffer.from('private content'),
      filename: 'private.pdf',
      mimeType: 'application/pdf',
      size: 15,
      disk: 'local',
      visibility: 'private',
    })

    const signedUrl = await uploadService.getSignedUrl(upload.id, 3600)

    assert.isString(signedUrl)
    assert.include(signedUrl, '/uploads/signed/')
  })

  test('should generate public URL for public file', async ({ assert }) => {
    const uploadService = getService<UploadService>(TYPES.UploadService)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'public@example.com',
      password: 'password123',
      fullName: 'Public User',
    })

    const upload = await uploadService.uploadFile({
      userId: user.id,
      file: Buffer.from('public content'),
      filename: 'public.jpg',
      mimeType: 'image/jpeg',
      size: 14,
      disk: 'local',
      visibility: 'public',
    })

    const publicUrl = await uploadService.getPublicUrl(upload.id)

    assert.isString(publicUrl)
    assert.include(publicUrl, '/uploads/')
  })

  test('should delete upload and file', async ({ assert }) => {
    const uploadService = getService<UploadService>(TYPES.UploadService)
    const uploadRepo = getService<UploadRepository>(TYPES.UploadRepository)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'deleter@example.com',
      password: 'password123',
      fullName: 'Deleter User',
    })

    const upload = await uploadService.uploadFile({
      userId: user.id,
      file: Buffer.from('to delete'),
      filename: 'delete-me.txt',
      mimeType: 'text/plain',
      size: 9,
      disk: 'local',
      visibility: 'private',
    })

    await uploadService.deleteUpload(upload.id)

    const deleted = await uploadRepo.findById(upload.id)
    assert.isNull(deleted)
  })

  test('should get upload by id', async ({ assert }) => {
    const uploadService = getService<UploadService>(TYPES.UploadService)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'findbyid@example.com',
      password: 'password123',
      fullName: 'Find User',
    })

    const created = await uploadService.uploadFile({
      userId: user.id,
      file: Buffer.from('findable'),
      filename: 'findable.txt',
      mimeType: 'text/plain',
      size: 8,
      disk: 'local',
      visibility: 'private',
    })

    const found = await uploadService.getUploadById(created.id)

    assert.isNotNull(found)
    assert.equal(found?.id, created.id)
    assert.equal(found?.filename, 'findable.txt')
  })
})
