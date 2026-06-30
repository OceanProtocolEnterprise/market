import '@testing-library/jest-dom/extend-expect'
import { jest } from '@jest/globals'
import { ReadableStream } from 'node:stream/web'
import { TextDecoder, TextEncoder } from 'node:util'
import './__mocks__/matchMedia'
import './__mocks__/hooksMocks'
import './__mocks__/connectkit'

Object.assign(globalThis, {
  ReadableStream: globalThis.ReadableStream || ReadableStream,
  TextDecoder: globalThis.TextDecoder || TextDecoder,
  TextEncoder: globalThis.TextEncoder || TextEncoder
})

jest.mock('next/router', () => ({
  useRouter: jest.fn().mockImplementation(() => ({
    route: '/',
    pathname: '/'
  }))
}))

// jest.mock('next/head', () => {
//   return {
//     __esModule: true,
//     default: ({ children }: { children: Array<React.ReactElement> }) => {
//       return <>{children}</>
//     }
//   }
// })
