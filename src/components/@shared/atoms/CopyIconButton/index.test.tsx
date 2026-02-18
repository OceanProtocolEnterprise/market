import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { copyTextToClipboard } from '@utils/clipboard'
import CopyIconButton from './index'

jest.mock('@utils/clipboard', () => ({
  copyTextToClipboard: jest.fn()
}))

describe('@shared/atoms/CopyIconButton', () => {
  const mockedCopy = copyTextToClipboard as jest.MockedFunction<
    typeof copyTextToClipboard
  >

  beforeEach(() => {
    mockedCopy.mockReset()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('shows copied status and resets it after timeout', async () => {
    mockedCopy.mockResolvedValue(true)

    render(
      <CopyIconButton
        text="did:op:1234"
        resetAfterMs={1000}
        renderStatus={(copied) => <span>{copied ? 'Copied' : 'Copy'}</span>}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Copy to clipboard' }))

    await waitFor(() => expect(mockedCopy).toHaveBeenCalledWith('did:op:1234'))
    expect(await screen.findByText('Copied')).toBeInTheDocument()

    act(() => {
      jest.advanceTimersByTime(1000)
    })

    expect(screen.getByText('Copy')).toBeInTheDocument()
  })

  it('disables button when no text is provided', () => {
    render(<CopyIconButton text="" />)

    expect(
      screen.getByRole('button', { name: 'Copy to clipboard' })
    ).toBeDisabled()
  })
})
