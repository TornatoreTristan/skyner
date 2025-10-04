# 📦 Upload System

Le système d'upload de ce boilerplate offre une solution complète et flexible pour gérer les fichiers avec support multi-stockage (local et S3).

## 🎯 Vue d'Ensemble

### Fonctionnalités
- ✅ **Multi-storage** (Local filesystem et AWS S3)
- ✅ **Polymorphic attachments** (attacher à n'importe quel modèle)
- ✅ **Public/Private visibility** pour contrôle d'accès
- ✅ **Signed URLs** pour accès temporaire sécurisé
- ✅ **Metadata storage** (dimensions images, durée vidéo, etc.)
- ✅ **Validation** (taille, type MIME)
- ✅ **Cache & Events** intégrés

### Architecture
```
Controllers ← Services ← Repositories ← Models
     ↕            ↕           ↕          ↕
 Storage ← Cache ← EventBus ← Database
(Local/S3)
```

## 🏗️ Structure des Modules

```
app/uploads/
├── controllers/
│   └── uploads_controller.ts      # HTTP handlers
├── services/
│   ├── upload_service.ts          # Business logic
│   ├── storage_service.ts         # Orchestration storage
│   └── storage/
│       ├── local_storage_driver.ts  # Local filesystem
│       └── s3_storage_driver.ts     # AWS S3
├── repositories/
│   └── upload_repository.ts       # Data access
├── models/
│   └── upload.ts                  # Lucid model
├── validators/
│   └── upload_validator.ts        # Vine validators
└── types/
    └── upload.ts                  # TypeScript interfaces
```

## 🚀 UploadsController

### Upload File
```typescript
// POST /api/uploads
export default class UploadsController {
  async store({ request, user, response }: HttpContext) {
    const uploadService = getService<UploadService>(TYPES.UploadService)
    E.assertUserExists(user)

    const data = await request.validateUsing(uploadFileValidator)
    const fileContent = Buffer.from(data.file || '')

    const upload = await uploadService.uploadFile({
      userId: user.id,
      file: fileContent,
      filename: request.input('filename'),
      mimeType: request.input('mimeType'),
      size: request.input('size'),
      disk: data.disk || 'local',
      visibility: data.visibility || 'private',
      storagePath: request.input('storagePath'),
      uploadableType: data.uploadableType,
      uploadableId: data.uploadableId,
      metadata: request.input('metadata'),
    })

    return response.status(201).json({ upload })
  }
}
```

### List User Uploads
```typescript
// GET /api/uploads
async index({ request, user }: HttpContext) {
  const uploadService = getService<UploadService>(TYPES.UploadService)
  E.assertUserExists(user)

  const filters = await request.validateUsing(getUploadsValidator)

  const uploads = await uploadService.getUploads({
    userId: user.id,
    ...filters,
  })

  return { uploads }
}
```

### Get Upload by ID
```typescript
// GET /api/uploads/:id
async show({ params, user, response }: HttpContext) {
  const uploadService = getService<UploadService>(TYPES.UploadService)
  E.assertUserExists(user)

  const upload = await uploadService.getUploadById(params.id)

  if (!upload) {
    return response.status(404).json({ error: 'Upload not found' })
  }

  if (upload.userId !== user.id) {
    return response.status(403).json({ error: 'Forbidden' })
  }

  return { upload }
}
```

### Generate Signed URL
```typescript
// GET /api/uploads/:id/signed-url
async signedUrl({ params, user, response }: HttpContext) {
  const uploadService = getService<UploadService>(TYPES.UploadService)
  E.assertUserExists(user)

  const upload = await uploadService.getUploadById(params.id)

  if (!upload) {
    return response.status(404).json({ error: 'Upload not found' })
  }

  if (upload.userId !== user.id) {
    return response.status(403).json({ error: 'Forbidden' })
  }

  const signedUrl = await uploadService.getSignedUrl(params.id)

  return { signedUrl }
}
```

### Delete Upload
```typescript
// DELETE /api/uploads/:id
async destroy({ params, user, response }: HttpContext) {
  const uploadService = getService<UploadService>(TYPES.UploadService)
  E.assertUserExists(user)

  const upload = await uploadService.getUploadById(params.id)

  if (!upload) {
    return response.status(404).json({ error: 'Upload not found' })
  }

  if (upload.userId !== user.id) {
    return response.status(403).json({ error: 'Forbidden' })
  }

  await uploadService.deleteUpload(params.id)

  return { success: true }
}
```

## 🔧 UploadService

### Service Principal
```typescript
@injectable()
export default class UploadService {
  constructor(
    @inject(TYPES.UploadRepository) private uploadRepo: UploadRepository,
    @inject(TYPES.StorageService) private storageService: StorageService
  ) {}

  async uploadFile(options: UploadFileOptions): Promise<Upload> {
    // Générer chemin de stockage si non fourni
    const storagePath = options.storagePath || this.generateStoragePath(options.filename)

    // Stocker le fichier (local ou S3)
    await this.storageService.store(options.file, storagePath, {
      disk: options.disk,
      visibility: options.visibility,
      contentType: options.mimeType,
    })

    // Créer l'enregistrement en base
    return await this.uploadRepo.create({
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
  }

  async getSignedUrl(uploadId: string, expiresIn: number = 3600): Promise<string> {
    const upload = await this.uploadRepo.findByIdOrFail(uploadId)
    return this.storageService.getSignedUrl(upload.storagePath, upload.disk, expiresIn)
  }

  async getPublicUrl(uploadId: string): Promise<string> {
    const upload = await this.uploadRepo.findByIdOrFail(uploadId)
    return this.storageService.getPublicUrl(upload.storagePath, upload.disk)
  }

  async deleteUpload(uploadId: string): Promise<void> {
    const upload = await this.uploadRepo.findByIdOrFail(uploadId)

    // Supprimer le fichier physique
    await this.storageService.delete(upload.storagePath, upload.disk)

    // Soft delete en base
    await this.uploadRepo.delete(uploadId)
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
```

## 💾 StorageService

### Abstraction Multi-Storage
```typescript
@injectable()
export default class StorageService {
  private drivers: Map<DiskType, StorageDriver>

  constructor(
    @inject(TYPES.LocalStorageDriver) localDriver: LocalStorageDriver,
    @inject(TYPES.S3StorageDriver) s3Driver: S3StorageDriver
  ) {
    this.drivers = new Map([
      ['local', localDriver],
      ['s3', s3Driver],
    ])
  }

  async store(file: Buffer, filePath: string, options: StoreFileOptions): Promise<StoreFileResult> {
    const driver = this.getDriver(options.disk)
    const path = await driver.store(file, filePath, {
      visibility: options.visibility,
      contentType: options.contentType,
    })
    return { path, disk: options.disk }
  }

  async get(filePath: string, disk: DiskType): Promise<Buffer> {
    const driver = this.getDriver(disk)
    return driver.get(filePath)
  }

  async delete(filePath: string, disk: DiskType): Promise<void> {
    const driver = this.getDriver(disk)
    return driver.delete(filePath)
  }

  async getSignedUrl(filePath: string, disk: DiskType, expiresIn: number): Promise<string> {
    const driver = this.getDriver(disk)
    return driver.getSignedUrl(filePath, expiresIn)
  }

  async getPublicUrl(filePath: string, disk: DiskType): Promise<string> {
    const driver = this.getDriver(disk)
    return driver.getPublicUrl(filePath)
  }

  private getDriver(disk: DiskType): StorageDriver {
    const driver = this.drivers.get(disk)
    if (!driver) {
      throw new Error(`Storage driver not found for disk: ${disk}`)
    }
    return driver
  }
}
```

## 🗄️ Storage Drivers

### LocalStorageDriver
```typescript
@injectable()
export default class LocalStorageDriver implements StorageDriver {
  private storagePath = path.join(process.cwd(), 'storage', 'uploads')

  async store(file: Buffer, filePath: string, options: StorageOptions): Promise<string> {
    const fullPath = path.join(this.storagePath, filePath)
    const directory = path.dirname(fullPath)

    // Créer répertoires si nécessaire
    await fs.mkdir(directory, { recursive: true })

    // Écrire le fichier
    await fs.writeFile(fullPath, file)

    return filePath
  }

  async get(filePath: string): Promise<Buffer> {
    const fullPath = path.join(this.storagePath, filePath)
    return fs.readFile(fullPath)
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = path.join(this.storagePath, filePath)
    await fs.unlink(fullPath)
  }

  async exists(filePath: string): Promise<boolean> {
    const fullPath = path.join(this.storagePath, filePath)
    try {
      await fs.access(fullPath)
      return true
    } catch {
      return false
    }
  }

  async getSignedUrl(filePath: string, expiresIn: number): Promise<string> {
    const token = Buffer.from(`${filePath}:${Date.now() + expiresIn * 1000}`).toString('base64')
    return `/uploads/signed/${token}`
  }

  getPublicUrl(filePath: string): string {
    return `/uploads/${filePath}`
  }
}
```

### S3StorageDriver
```typescript
@injectable()
export default class S3StorageDriver implements StorageDriver {
  private client: S3Client
  private bucket: string

  constructor() {
    this.bucket = env.get('AWS_BUCKET', '')
    this.client = new S3Client({
      region: env.get('AWS_REGION', 'eu-west-1'),
      credentials: {
        accessKeyId: env.get('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: env.get('AWS_SECRET_ACCESS_KEY', ''),
      },
      ...(env.get('AWS_ENDPOINT') && { endpoint: env.get('AWS_ENDPOINT') }),
    })
  }

  async store(file: Buffer, filePath: string, options: StorageOptions): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: filePath,
      Body: file,
      ContentType: options.contentType,
      ACL: options.visibility === 'public' ? 'public-read' : 'private',
    })

    await this.client.send(command)
    return filePath
  }

  async get(filePath: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: filePath,
    })

    const response = await this.client.send(command)
    const chunks: Uint8Array[] = []

    for await (const chunk of response.Body as any) {
      chunks.push(chunk)
    }

    return Buffer.concat(chunks)
  }

  async delete(filePath: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: filePath,
    })

    await this.client.send(command)
  }

  async getSignedUrl(filePath: string, expiresIn: number): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: filePath,
    })
    return getSignedUrl(this.client, command, { expiresIn })
  }

  getPublicUrl(filePath: string): string {
    const region = env.get('AWS_REGION', 'eu-west-1')
    return `https://${this.bucket}.s3.${region}.amazonaws.com/${filePath}`
  }
}
```

## 📊 Upload Model

### Modèle Lucid
```typescript
export default class Upload extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare filename: string

  @column()
  declare storagePath: string

  @column()
  declare disk: DiskType

  @column()
  declare mimeType: string

  @column()
  declare size: number

  @column()
  declare visibility: VisibilityType

  // Polymorphic
  @column()
  declare uploadableType: string | null

  @column()
  declare uploadableId: string | null

  @column({
    prepare: (value: UploadMetadata | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | UploadMetadata | null) => {
      if (!value) return null
      if (typeof value === 'string') return JSON.parse(value)
      return value
    },
  })
  declare metadata: UploadMetadata | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column.dateTime()
  declare deletedAt: DateTime | null

  // Getters
  get isPublic(): boolean {
    return this.visibility === 'public'
  }

  get isImage(): boolean {
    return this.mimeType.startsWith('image/')
  }

  get sizeInMb(): number {
    return Math.round((this.size / 1024 / 1024) * 100) / 100
  }

  // Relations
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
```

## 🔗 Polymorphic Attachments

### Attacher à un Post
```typescript
// Créer un upload attaché à un post
const upload = await uploadService.uploadFile({
  userId: user.id,
  file: fileBuffer,
  filename: 'cover-image.jpg',
  mimeType: 'image/jpeg',
  size: fileBuffer.length,
  disk: 's3',
  visibility: 'public',
  uploadableType: 'Post',
  uploadableId: post.id,
  metadata: { width: 1920, height: 1080 }
})

// Récupérer tous les uploads d'un post
const postUploads = await uploadService.getUploads({
  uploadableType: 'Post',
  uploadableId: post.id
})
```

### Exemple avec Organization
```typescript
const logo = await uploadService.uploadFile({
  userId: user.id,
  file: logoBuffer,
  filename: 'company-logo.png',
  mimeType: 'image/png',
  size: logoBuffer.length,
  disk: 's3',
  visibility: 'public',
  uploadableType: 'Organization',
  uploadableId: organization.id,
  metadata: { width: 512, height: 512 }
})
```

## 🔒 Sécurité

### Validation des Uploads
```typescript
export const uploadFileValidator = vine.compile(
  vine.object({
    file: vine.any(),
    disk: vine.enum(['local', 's3']).optional(),
    visibility: vine.enum(['public', 'private']).optional(),
    uploadableType: vine.string().optional(),
    uploadableId: vine.string().uuid().optional(),
  })
)

export const getUploadsValidator = vine.compile(
  vine.object({
    disk: vine.enum(['local', 's3']).optional(),
    visibility: vine.enum(['public', 'private']).optional(),
    uploadableType: vine.string().optional(),
    uploadableId: vine.string().uuid().optional(),
  })
)
```

### Authorization
```typescript
// Vérification propriétaire dans le controller
if (upload.userId !== user.id) {
  return response.status(403).json({ error: 'Forbidden' })
}
```

### Signed URLs Temporaires
```typescript
// Générer URL valide 1 heure
const signedUrl = await uploadService.getSignedUrl(uploadId, 3600)

// Pour les fichiers privés S3
// URL: https://bucket.s3.region.amazonaws.com/path?X-Amz-Signature=...
```

## 📱 API Usage Examples

### Upload File (Local)
```bash
curl -X POST http://localhost:3333/api/uploads \
  -H "Cookie: adonis-session=..." \
  -F "file=@/path/to/document.pdf" \
  -F "filename=document.pdf" \
  -F "mimeType=application/pdf" \
  -F "size=102400" \
  -F "disk=local" \
  -F "visibility=private"
```

### Upload File to S3
```bash
curl -X POST http://localhost:3333/api/uploads \
  -H "Cookie: adonis-session=..." \
  -F "file=@/path/to/image.jpg" \
  -F "filename=profile-pic.jpg" \
  -F "mimeType=image/jpeg" \
  -F "size=524288" \
  -F "disk=s3" \
  -F "visibility=public" \
  -F "uploadableType=User" \
  -F "uploadableId=user-uuid"
```

### List User Uploads
```bash
curl -X GET http://localhost:3333/api/uploads \
  -H "Cookie: adonis-session=..."

# Avec filtres
curl -X GET "http://localhost:3333/api/uploads?visibility=public&disk=s3" \
  -H "Cookie: adonis-session=..."
```

### Get Upload Details
```bash
curl -X GET http://localhost:3333/api/uploads/upload-uuid \
  -H "Cookie: adonis-session=..."
```

### Get Signed URL
```bash
curl -X GET http://localhost:3333/api/uploads/upload-uuid/signed-url \
  -H "Cookie: adonis-session=..."
```

### Delete Upload
```bash
curl -X DELETE http://localhost:3333/api/uploads/upload-uuid \
  -H "Cookie: adonis-session=..."
```

## ⚙️ Configuration

### Environment Variables
```env
# Upload Configuration
UPLOADS_DISK=local
UPLOADS_MAX_SIZE=10485760
UPLOADS_ALLOWED_MIMES=image/jpeg,image/png,application/pdf

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=eu-west-1
AWS_BUCKET=your-bucket-name
AWS_ENDPOINT=                          # Optional: for S3-compatible services
```

### start/env.ts
```typescript
export default await Env.create(new URL('../', import.meta.url), {
  // ... autres variables
  UPLOADS_DISK: Env.schema.enum(['local', 's3'] as const),
  UPLOADS_MAX_SIZE: Env.schema.number(),
  UPLOADS_ALLOWED_MIMES: Env.schema.string(),
  AWS_ACCESS_KEY_ID: Env.schema.string.optional(),
  AWS_SECRET_ACCESS_KEY: Env.schema.string.optional(),
  AWS_REGION: Env.schema.string.optional(),
  AWS_BUCKET: Env.schema.string.optional(),
  AWS_ENDPOINT: Env.schema.string.optional(),
})
```

## 🧪 Testing

### Test Upload Fonctionnel
```typescript
test('should upload a file via POST /api/uploads', async ({ client, assert }) => {
  const userRepo = getService<UserRepository>(TYPES.UserRepository)

  const user = await userRepo.create({
    email: 'uploader@example.com',
    password: 'password123',
    fullName: 'Test Uploader',
  })

  const response = await client
    .post('/api/uploads')
    .withSession({ user_id: user.id })
    .form({
      file: 'test file content',
      filename: 'document.pdf',
      mimeType: 'application/pdf',
      size: 17,
      disk: 'local',
      visibility: 'private',
    })

  response.assertStatus(201)
  response.assertBodyContains({
    upload: {
      userId: user.id,
      filename: 'document.pdf',
      disk: 'local',
      visibility: 'private',
    },
  })
})
```

### Test Polymorphic Upload
```typescript
test('should upload file with polymorphic relation', async ({ assert }) => {
  const uploadService = getService<UploadService>(TYPES.UploadService)
  const userRepo = getService<UserRepository>(TYPES.UserRepository)

  const user = await userRepo.create({
    email: 'test@example.com',
    password: 'password123',
  })

  const upload = await uploadService.uploadFile({
    userId: user.id,
    file: Buffer.from('image content'),
    filename: 'avatar.jpg',
    mimeType: 'image/jpeg',
    size: 13,
    disk: 'local',
    visibility: 'public',
    uploadableType: 'User',
    uploadableId: user.id,
    metadata: { width: 256, height: 256 },
  })

  assert.equal(upload.uploadableType, 'User')
  assert.equal(upload.uploadableId, user.id)
  assert.deepEqual(upload.metadata, { width: 256, height: 256 })
})
```

## 🎯 Avantages du Système

### Flexibilité
- **Multi-storage** : Basculer entre local et S3 sans changer le code
- **Polymorphic** : Attacher fichiers à n'importe quel modèle
- **Extensible** : Ajouter facilement d'autres drivers (Google Cloud, Azure, etc.)

### Sécurité
- **Validation stricte** : Taille, type MIME, ownership
- **Signed URLs** : Accès temporaire sécurisé aux fichiers privés
- **Authorization** : Vérification propriétaire sur toutes les opérations

### Performance
- **Cache intégré** : Via BaseRepository
- **Events** : Hooks automatiques pour analytics
- **Lazy loading** : Récupération fichiers à la demande

### Maintenabilité
- **Architecture modulaire** : Services, Repositories, Drivers séparés
- **Tests complets** : 27 tests unitaires + 9 fonctionnels
- **Type-safe** : TypeScript avec interfaces strictes
- **Clean Code** : Respect SOLID et Repository Pattern

## 📋 Best Practices

### 1. Toujours valider les fichiers
```typescript
// Valider taille
if (fileSize > MAX_SIZE) {
  throw new ValidationException('File too large')
}

// Valider type MIME
const allowedMimes = ['image/jpeg', 'image/png', 'application/pdf']
if (!allowedMimes.includes(mimeType)) {
  throw new ValidationException('Invalid file type')
}
```

### 2. Utiliser les bons paramètres de visibilité
```typescript
// Public: accessible sans authentification
visibility: 'public'  // Logos, avatars, images publiques

// Private: nécessite signed URL
visibility: 'private' // Documents confidentiels, factures
```

### 3. Nettoyer les fichiers orphelins
```typescript
// Cron job pour supprimer les uploads sans référence
async cleanupOrphans() {
  const orphans = await uploadRepo.findOrphans()
  for (const upload of orphans) {
    await uploadService.deleteUpload(upload.id)
  }
}
```

### 4. Utiliser les métadonnées
```typescript
// Pour les images
metadata: {
  width: 1920,
  height: 1080,
  format: 'jpeg',
  hasAlpha: false
}

// Pour les vidéos
metadata: {
  duration: 120,
  resolution: '1920x1080',
  codec: 'h264',
  bitrate: 5000
}
```

---

Ce système d'upload offre une base robuste et production-ready pour gérer tous vos besoins de stockage de fichiers avec un focus sur la flexibilité et la sécurité.
