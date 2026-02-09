import React, { ReactElement, useEffect, useState } from 'react'
import styles from './index.module.css'
import { SsiVerifiableCredential } from 'src/@types/SsiWallet'
import { getSsiVerifiableCredentialType } from '@utils/wallet/ssiWallet'
import {
  CredentialAddressBased,
  CredentialPolicyBased
} from 'src/@types/ddo/Credentials'
import { Asset } from 'src/@types/Asset'
import { Service } from 'src/@types/ddo/Service'
import Button from '@shared/atoms/Button'
import Modal from '@shared/atoms/Modal'

export interface VpSelectorProps {
  showDialog: boolean
  setShowDialog: (boolean) => void
  acceptSelection: (selectedCredential: string[]) => void
  abortSelection: () => void
  ssiVerifiableCredentials: SsiVerifiableCredential[]
  assetAllowCredentials: (CredentialAddressBased | CredentialPolicyBased)[]
  asset: Asset
  service: Service
}

interface VpFieldProps {
  credential: SsiVerifiableCredential
  checked: boolean
  index: number
  onChange: (index: number, newValue: boolean) => void
}

function VpField(props: VpFieldProps): ReactElement {
  const { credential, checked, index, onChange } = props
  const maxLength = 60

  function DataView({
    data,
    maxLength
  }: {
    data: any
    maxLength: number
  }): ReactElement {
    let dataString
    if (typeof data === 'string') {
      dataString = data
    } else {
      dataString = JSON.stringify(data)
    }

    return (
      <>
        {dataString?.length > maxLength
          ? dataString?.slice(0, maxLength).concat('...')
          : dataString}
      </>
    )
  }

  return (
    <div className={styles.credentialRow}>
      <input
        type="checkbox"
        className={styles.inputField}
        onChange={() => onChange(index, !checked)}
        checked={checked}
      />
      <div className={styles.credentialContent}>
        <div className={styles.credentialName}>
          {getSsiVerifiableCredentialType(credential)}
        </div>
        <div className={styles.fieldData}>
          <div className={styles.fieldNames}>
            <div>Id</div>
            {Object.keys(credential?.parsedDocument?.credentialSubject || {})
              .sort((key1, key2) => key1.localeCompare(key2))
              .map((key) => (
                <div key={key}>{key}</div>
              ))}
          </div>
          <div className={styles.fieldValues}>
            <div>
              <DataView
                data={credential?.parsedDocument?.id}
                maxLength={maxLength}
              />
            </div>
            {Object.keys(credential?.parsedDocument?.credentialSubject || {})
              .sort((key1, key2) => key1.localeCompare(key2))
              .map((key) => (
                <div key={key}>
                  <DataView
                    data={credential?.parsedDocument?.credentialSubject?.[key]}
                    maxLength={maxLength}
                  />
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function VpSelector(props: VpSelectorProps): ReactElement {
  const {
    showDialog,
    setShowDialog,
    acceptSelection,
    abortSelection,
    ssiVerifiableCredentials,
    assetAllowCredentials,
    asset,
    service
  } = props
  const [selections, setSelections] = useState<boolean[]>([])
  const credentialCount = ssiVerifiableCredentials?.length || 0
  const allSelected =
    credentialCount > 0 && selections.every((selection) => selection)
  const showToggleAll = credentialCount > 1
  function handleAcceptSelection() {
    const selectedCredentials = ssiVerifiableCredentials
      .filter((credential, index) => selections[index])
      .map((credential) => credential.id)
    setShowDialog(false)
    acceptSelection(selectedCredentials)
  }

  function handleAbortSelection() {
    setShowDialog(false)
    abortSelection()
  }

  useEffect(() => {
    if (!showDialog) return
    setSelections(new Array(credentialCount).fill(false))
  }, [showDialog, credentialCount])

  function handleOnChange(index: number, newValue: boolean) {
    const newValues = [...selections]
    newValues[index] = newValue
    setSelections(newValues)
  }

  function handleToggleAll() {
    if (credentialCount === 0) {
      return
    }

    const nextValue = !allSelected
    setSelections(new Array(credentialCount).fill(nextValue))
  }

  function sortCredentials(
    credential1: SsiVerifiableCredential,
    credential2: SsiVerifiableCredential
  ) {
    const credential1Type = getSsiVerifiableCredentialType(credential1)
    const credential2Type = getSsiVerifiableCredentialType(credential2)
    return credential1Type.localeCompare(credential2Type)
  }

  return (
    <Modal
      title="Verifiable Credentials to present"
      isOpen={showDialog}
      onToggleModal={handleAbortSelection}
      shouldCloseOnOverlayClick
      className={styles.vpModal}
      overlayClassName={styles.vpModalOverlay}
    >
      <div className={`${styles.panelColumn} ${styles.width100p}`}>
        <div className={styles.dataInfo}>
          Asset: {asset.credentialSubject.metadata.name}, Service:{' '}
          {service.name}
        </div>

        {(() => {
          const minCreds = (assetAllowCredentials as any)
            ?.find((c) => c.type === 'SSIpolicy')
            ?.values?.[0]?.vp_policies?.find(
              (policy) =>
                (typeof policy === 'object' &&
                  policy.policy === 'minimum-credentials') ||
                (typeof policy === 'string' && policy === 'minimum-credentials')
            )

          const minCount =
            typeof minCreds === 'object' && 'args' in minCreds
              ? minCreds.args
              : null

          return minCount ? (
            <span>
              <strong>Minimum credentials required:</strong> {minCount}
            </span>
          ) : null
        })()}

        <div
          className={`${styles.panelGrid} ${styles.panelTemplateList} ${styles.alignItemsCenter} ${styles.justifyItemsStretch} ${styles.scrollableList}`}
        >
          {ssiVerifiableCredentials
            ?.sort(sortCredentials)
            .map((credential, index) => (
              <React.Fragment key={credential.id}>
                <VpField
                  credential={credential}
                  onChange={handleOnChange}
                  index={index}
                  checked={selections[index] || false}
                />
              </React.Fragment>
            ))}
        </div>

        <div className={styles.panelRow}>
          {showToggleAll && (
            <div className={styles.selectAllRow}>
              <Button
                type="button"
                style="outlined"
                size="small"
                className={styles.selectAllButton}
                onClick={handleToggleAll}
              >
                {allSelected ? 'Deselect all' : 'Select all'}
              </Button>
            </div>
          )}
          <Button
            type="button"
            style="secondary"
            onClick={handleAbortSelection}
          >
            Close
          </Button>
          <Button
            type="button"
            style="accent"
            onClick={handleAcceptSelection}
            disabled={selections.length === 0 || !selections.some(Boolean)}
          >
            Accept
          </Button>
        </div>
      </div>
    </Modal>
  )
}
