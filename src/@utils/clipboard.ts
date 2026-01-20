export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false

  const canUseClipboardApi =
    typeof navigator !== 'undefined' &&
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    navigator.clipboard?.writeText

  if (canUseClipboardApi) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Copy to clipboard failed', error)
      }
    }
  }

  if (typeof document === 'undefined') return false

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.top = '-9999px'
  textarea.style.left = '-9999px'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()

  let copied = false
  try {
    copied = document.execCommand('copy')
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Fallback copy to clipboard failed', error)
    }
  } finally {
    document.body.removeChild(textarea)
  }

  return copied
}
