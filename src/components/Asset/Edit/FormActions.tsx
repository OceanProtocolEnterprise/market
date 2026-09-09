import { FormikContextType, useFormikContext } from 'formik'
import { ReactElement, useEffect } from 'react'
import { useAsset } from '@context/Asset'
import Button from '@shared/atoms/Button'
import styles from './FormActions.module.css'
import Link from 'next/link'
import { MetadataEditForm, ServiceEditForm } from './_types'

export default function FormActions({
  handleClick
}: {
  handleClick?: () => void
}): ReactElement {
  const { isAssetNetwork, asset } = useAsset()
  const {
    errors,
    isValid,
    isValidating
  }: FormikContextType<MetadataEditForm | ServiceEditForm> = useFormikContext()

  const isSubmitDisabled = !isValid || !isAssetNetwork

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development' || !isSubmitDisabled) return

    console.warn('[Edit form] Submit disabled', {
      isValid,
      isValidating,
      isAssetNetwork,
      validationErrors: errors
    })
  }, [errors, isAssetNetwork, isSubmitDisabled, isValid, isValidating])

  return (
    <footer className={styles.actions}>
      <Link href={`/asset/${asset?.id}`} key={asset?.id}>
        Cancel
      </Link>
      <Button style="accent" disabled={isSubmitDisabled} onClick={handleClick}>
        Submit
      </Button>
    </footer>
  )
}
