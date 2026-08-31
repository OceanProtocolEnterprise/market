import {
  getDockerRegistryAuth,
  isDockerRegistryAuthError
} from './dockerRegistryAuth'
import { initialValues } from './_constants'
import { validationSchema } from './_validation'

describe('docker registry authentication', () => {
  describe('isDockerRegistryAuthError', () => {
    it.each([
      'Docker image pull access denied; repository may require docker login',
      'Unable to fetch image manifest: 401 Unauthorized',
      'Container registry authentication failed: invalid credentials',
      'Docker image manifest not found',
      new Error('Forbidden access to Docker repository')
    ])('detects registry authentication failures', (error) => {
      expect(isDockerRegistryAuthError(error)).toBe(true)
    })

    it.each([
      'Compute environment does not exist',
      'Insufficient escrow funds',
      'Provider initialization failed',
      undefined
    ])('ignores unrelated initialization failures', (error) => {
      expect(isDockerRegistryAuthError(error)).toBe(false)
    })
  })

  describe('getDockerRegistryAuth', () => {
    it('returns credentials when both values are provided', () => {
      expect(
        getDockerRegistryAuth({
          dockerRegistryUsername: '  registry-user  ',
          dockerRegistryPassword: ' secret with spaces '
        })
      ).toEqual({
        username: 'registry-user',
        password: ' secret with spaces '
      })
    })

    it.each([
      { dockerRegistryUsername: '', dockerRegistryPassword: '' },
      { dockerRegistryUsername: 'registry-user', dockerRegistryPassword: '' },
      { dockerRegistryUsername: '', dockerRegistryPassword: 'secret' }
    ])('does not create a partial authentication payload', (values) => {
      expect(getDockerRegistryAuth(values)).toBeUndefined()
    })
  })

  describe('validation', () => {
    it('requires both fields after registry authentication is requested', async () => {
      const values = {
        ...initialValues,
        dockerRegistryAuthRequired: true
      }

      await expect(
        validationSchema.validateAt('dockerRegistryUsername', values)
      ).rejects.toThrow('Registry username is required')
      await expect(
        validationSchema.validateAt('dockerRegistryPassword', values)
      ).rejects.toThrow('Registry password is required')
    })

    it('keeps registry credentials optional before an image access failure', async () => {
      await expect(
        validationSchema.validateAt('dockerRegistryUsername', initialValues)
      ).resolves.toBe('')
      await expect(
        validationSchema.validateAt('dockerRegistryPassword', initialValues)
      ).resolves.toBe('')
    })
  })
})
