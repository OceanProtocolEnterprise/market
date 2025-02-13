import { FormEvent, ReactElement } from 'react'
import styles from './SearchButton.module.css'
import { useSearchBarStatus } from '@context/SearchBarStatus'
import { SearchIcon } from '@components/@shared/Icons'

export default function SearchButton(): ReactElement {
  const { isSearchBarVisible, setSearchBarVisible } = useSearchBarStatus()

  async function handleButtonClick(e: FormEvent<HTMLButtonElement>) {
    e.preventDefault()

    setSearchBarVisible(!isSearchBarVisible)
  }

  return (
    <div className={styles.search}>
      <button onClick={handleButtonClick} className={styles.button}>
        <SearchIcon />
      </button>
    </div>
  )
}
