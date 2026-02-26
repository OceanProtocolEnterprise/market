import { ReactElement, useState, useRef, useEffect } from 'react'
import styles from './index.module.css'

interface StatusTagProps {
  type: 'free' | 'paid' | 'gpu'
  children: React.ReactNode
  className?: string
  tooltip?: string
}

export default function StatusTag({
  type,
  children,
  className,
  tooltip
}: StatusTagProps): ReactElement {
  const [showTooltip, setShowTooltip] = useState(false)
  const tagRef = useRef<HTMLDivElement>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (showTooltip && tagRef.current) {
      const rect = tagRef.current.getBoundingClientRect()

      setTooltipPosition({
        top: rect.top - 40,
        left: rect.left + rect.width / 2
      })
    }
  }, [showTooltip])

  return (
    <div
      ref={tagRef}
      className={styles.tagWrapper}
      onMouseEnter={() => tooltip && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      <span
        className={`${styles.statusTag} ${styles[type]} ${className || ''}`}
      >
        {children}
      </span>
      {showTooltip && tooltip && (
        <div
          className={styles.tooltip}
          style={{
            top: '-40px',
            left: '50%',
            transform: 'translateX(-50%)'
          }}
        >
          <div className={styles.tooltipContent}>{tooltip}</div>
          <div className={styles.tooltipArrow} />
        </div>
      )}
    </div>
  )
}
