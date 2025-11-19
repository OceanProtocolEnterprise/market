import '@testing-library/jest-dom/extend-expect'
import { jest } from '@jest/globals'
import './__mocks__/matchMedia'
import './__mocks__/hooksMocks'
import './__mocks__/connectkit'

jest.mock('next/router', () => ({
  useRouter: jest.fn().mockImplementation(() => ({
    route: '/',
    pathname: '/'
  }))
}))
