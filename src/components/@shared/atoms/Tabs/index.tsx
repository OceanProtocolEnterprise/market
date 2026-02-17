import { ReactElement, ReactNode } from 'react'
import { Tab, Tabs as ReactTabs, TabList, TabPanel } from 'react-tabs'
import InputRadio from '@shared/FormInput/InputElement/Radio'
import styles from './index.module.css'
export interface TabsItem {
  title: string
  content: ReactNode
  disabled?: boolean
}

interface TabsProps {
  items: TabsItem[]
  className?: string
  handleTabChange?: (tabName: string) => void
  showRadio?: boolean
  selectedIndex?: number
  onIndexSelected?: (index: number) => void
  variant?: 'default' | 'accent'
  isEditPage?: boolean
}

export default function Tabs({
  items,
  className,
  handleTabChange,
  showRadio,
  selectedIndex,
  onIndexSelected,
  variant = 'default',
  isEditPage = false
}: TabsProps): ReactElement {
  return (
    <ReactTabs
      className={`${className || ''}`}
      selectedIndex={selectedIndex}
      onSelect={onIndexSelected}
    >
      <div className={variant === 'accent' ? styles.accentTabListWrapper : ''}>
        <div
          className={`${styles.tabListContainer} ${
            variant === 'accent' ? styles.accentTabListContainer : ''
          }`}
        >
          <TabList
            className={`${styles.tabList} ${
              variant === 'accent' ? styles.accentTabList : ''
            }`}
          >
            {items.map((item, index) => (
              <Tab
                className={`${styles.tab} ${
                  variant === 'accent' ? styles.accentTab : ''
                }`}
                key={index}
                onClick={
                  handleTabChange ? () => handleTabChange(item.title) : null
                }
                disabled={item.disabled}
              >
                {showRadio ? (
                  <InputRadio
                    className={styles.radioInput}
                    name={item.title}
                    type="radio"
                    checked={index === selectedIndex}
                    options={[item.title]}
                    readOnly
                    variant={variant}
                  />
                ) : (
                  item.title
                )}
              </Tab>
            ))}
          </TabList>
        </div>
      </div>
      <div
        className={`${styles.tabContent} ${
          variant === 'accent' ? styles.accentTabContent : ''
        }`}
      >
        {items.map((item, index) => (
          <TabPanel
            key={index}
            className={`${variant === 'accent' ? styles.accentTabPanel : ''} ${
              isEditPage ? styles.editTabPanel : ''
            }`}
          >
            {item.content}
          </TabPanel>
        ))}
      </div>
    </ReactTabs>
  )
}
