import { describe, expect, it, vi } from 'vitest'
import { createRestoreBackupService } from '@/lib/records/restore-backup'

function createDbMock(currentUserEmail = 'user@example.com') {
  const treeRecord = {
    findMany: vi.fn().mockResolvedValue([{ photoPath: 'old-photo.jpg' }]),
    deleteMany: vi.fn().mockResolvedValue(undefined),
    create: vi.fn().mockResolvedValue(undefined),
  }
  const activityLog = {
    create: vi.fn().mockResolvedValue(undefined),
  }

  return {
    user: {
      findUnique: vi.fn().mockResolvedValue({ email: currentUserEmail }),
    },
    treeRecord,
    activityLog,
    $transaction: vi.fn(async (callback: (tx: { treeRecord: typeof treeRecord }) => Promise<number>) =>
      callback({ treeRecord })
    ),
  }
}

describe('createRestoreBackupService', () => {
  it('rejects backups from another user', async () => {
    const db = createDbMock('owner@example.com')
    const restoreBackup = createRestoreBackupService({
      db: db as never,
      parseInputDate: vi.fn(),
      parseStoredDate: vi.fn(),
      restorePhotoFromBackup: vi.fn(),
      photoFileExists: vi.fn(),
      deletePhotoFile: vi.fn().mockResolvedValue(undefined),
    })

    await expect(
      restoreBackup('user-1', {
        user: { email: 'other@example.com', name: null },
        records: [],
      })
    ).rejects.toThrow('Záloha patří jinému uživateli')

    expect(db.$transaction).not.toHaveBeenCalled()
  })

  it('cleans up newly restored photos when record preparation fails', async () => {
    const deletePhotoFile = vi.fn().mockResolvedValue(undefined)
    const restorePhotoFromBackup = vi.fn().mockResolvedValue('new-photo.jpg')
    const db = createDbMock()
    const restoreBackup = createRestoreBackupService({
      db: db as never,
      parseInputDate: vi.fn().mockReturnValue(null),
      parseStoredDate: vi.fn(),
      restorePhotoFromBackup,
      photoFileExists: vi.fn(),
      deletePhotoFile,
    })

    await expect(
      restoreBackup('user-1', {
        user: { email: 'user@example.com', name: null },
        records: [
          {
            speciesLatin: 'Quercus robur',
            plantedAt: 'invalid',
            lat: 50,
            lng: 14,
            photo: { fileName: 'tree.jpg', dataBase64: 'AAA' },
          },
        ],
      })
    ).rejects.toThrow('Neplatné datum výsadby')

    expect(restorePhotoFromBackup).not.toHaveBeenCalled()
    expect(deletePhotoFile).not.toHaveBeenCalled()
  })

  it('restores records and removes obsolete photos', async () => {
    const deletePhotoFile = vi.fn().mockResolvedValue(undefined)
    const db = createDbMock()
    const restoreBackup = createRestoreBackupService({
      db: db as never,
      parseInputDate: vi.fn().mockImplementation((value: string) => new Date(`${value}T00:00:00Z`)),
      parseStoredDate: vi.fn().mockImplementation((value: string) => new Date(`${value}T00:00:00Z`)),
      restorePhotoFromBackup: vi.fn().mockResolvedValue('restored-photo.jpg'),
      photoFileExists: vi.fn().mockResolvedValue(true),
      deletePhotoFile,
    })

    const result = await restoreBackup('user-1', {
      user: { email: 'user@example.com', name: null },
      records: [
        {
          speciesLatin: 'Quercus robur',
          plantedAt: '2025-01-01',
          lat: 50,
          lng: 14,
          locality: 'Praha',
          photoPath: 'restored-photo.jpg',
          note: 'Poznamka',
          reminders: [
            {
              text: 'Kontrola',
              mode: 'date',
              dueAt: '2025-02-01',
              nextDueAt: '2025-02-01',
              active: true,
            },
          ],
        },
      ],
    })

    expect(result).toEqual({ restored: 1 })
    expect(db.treeRecord.deleteMany).toHaveBeenCalledWith({
      where: { createdById: 'user-1' },
    })
    expect(db.treeRecord.create).toHaveBeenCalledTimes(1)
    expect(db.activityLog.create).toHaveBeenCalledTimes(1)
    expect(deletePhotoFile).toHaveBeenCalledWith('old-photo.jpg')
  })
})
