import { CSSProperties, ReactElement } from 'react'
import styles from './index.module.css'

interface SkeletonProps {
  width?: string
  height?: string
  circle?: boolean
  borderRadius?: string
  className?: string
}

export default function Skeleton({
  width,
  height = '1rem',
  circle,
  borderRadius,
  className
}: SkeletonProps): ReactElement {
  const style: CSSProperties = {
    width: width ?? '100%',
    height,
    borderRadius: circle ? '50%' : borderRadius ?? '4px'
  }

  return (
    <span
      className={`${styles.skeleton} ${className || ''}`}
      style={style}
      aria-hidden="true"
    />
  )
}
