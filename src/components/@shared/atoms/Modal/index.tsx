import { ReactElement, ReactNode } from 'react'
import ReactModal from 'react-modal'
import styles from './index.module.css'

if (process.env.NODE_ENV !== 'test') ReactModal.setAppElement('#__next')

type ModalClassName = ReactModal.Props['className']

function mergeClassName(base: string, extra?: ModalClassName): ModalClassName {
  if (!extra) return base
  if (typeof extra === 'string') return `${base} ${extra}`.trim()
  return {
    ...extra,
    base: `${base} ${extra.base || ''}`.trim()
  }
}

interface ModalProps extends ReactModal.Props {
  title: string
  onToggleModal: () => void
  children: ReactNode
}

export default function Modal({
  title,
  onToggleModal,
  children,
  className,
  overlayClassName,
  ...props
}: ModalProps): ReactElement {
  return (
    <ReactModal
      contentLabel={title}
      className={mergeClassName(styles.modal, className)}
      overlayClassName={mergeClassName(styles.modalOverlay, overlayClassName)}
      {...props}
    >
      <button
        className={styles.close}
        onClick={onToggleModal}
        data-testid="closeModal"
      >
        &times;
      </button>

      <header className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
      </header>

      {children}
    </ReactModal>
  )
}
