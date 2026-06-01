import { ReactElement } from 'react'
import Compute from '@images/compute.svg'
import Download from '@images/download.svg'
import { ServiceType } from 'src/@types/ddo/Service'

export default function ServiceTypeIcon({
  type,
  className,
  ariaHidden = true
}: {
  type?: string
  className?: string
  ariaHidden?: boolean
}): ReactElement | null {
  if (type === ServiceType.Access) {
    return (
      <Download
        aria-hidden={ariaHidden}
        role={ariaHidden ? undefined : 'img'}
        aria-label={ariaHidden ? undefined : 'Download'}
        className={className}
      />
    )
  }

  if (type === ServiceType.Compute) {
    return (
      <Compute
        aria-hidden={ariaHidden}
        role={ariaHidden ? undefined : 'img'}
        aria-label={ariaHidden ? undefined : 'Compute'}
        className={className}
      />
    )
  }

  return null
}
