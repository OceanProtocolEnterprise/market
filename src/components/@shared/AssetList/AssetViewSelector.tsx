import { ReactElement } from 'react'
import GridIcon from '@images/grid-view-icon.svg'
import ListIcon from '@images/list-view-icon.svg'
import styles from './AssetViewSelector.module.css'
import { AssetViewOptions } from 'src/@types/AssetView'

export default function AssetViewSelector({
  activeView,
  onViewChange,
  className
}: {
  activeView: AssetViewOptions
  onViewChange: (view: AssetViewOptions) => void
  className?: string
}): ReactElement {
  return (
    <div className={`${styles.viewSelectorContainer} ${className || ''}`}>
      <button
        type="button"
        className={`${styles.viewSelector} ${
          activeView === AssetViewOptions.Grid ? styles.selected : ''
        }`}
        onClick={() => onViewChange(AssetViewOptions.Grid)}
        title="Grid view"
        aria-label="Grid view"
        aria-pressed={activeView === AssetViewOptions.Grid}
      >
        <GridIcon aria-hidden="true" />
      </button>
      <button
        type="button"
        className={`${styles.viewSelector} ${
          activeView === AssetViewOptions.List ? styles.selected : ''
        }`}
        onClick={() => onViewChange(AssetViewOptions.List)}
        title="List view"
        aria-label="List view"
        aria-pressed={activeView === AssetViewOptions.List}
      >
        <ListIcon aria-hidden="true" />
      </button>
    </div>
  )
}
