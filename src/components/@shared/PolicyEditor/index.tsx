import { getFieldContent } from '@utils/form'
import { Field } from 'formik'
import { ReactElement } from 'react'
import styles from './index.module.css'
import Input from '../FormInput'
import Button from '../atoms/Button'

const fields: FormFieldContent[] = [
  {
    name: 'requestPolicy',
    label: 'Request Policy',
    type: 'textarea',
    placeholder:
      'Example:\n{\n\t"type": "OpenBadgeCredential",\n\t"format": "jwt_vc_json"\n\t"policies": ["signature"]\n}'
  },
  {
    name: 'customPolicy',
    label: 'Custom Policy',
    type: 'text',
    placeholder: 'Example: input.credentials.password.placeOfBirth="Paris"'
  },
  {
    name: 'vcPolicy',
    label: 'VC Policy',
    type: 'text',
    placeholder: ''
  },
  {
    name: 'vpPolicy',
    label: 'VP Policy',
    type: 'textarea',
    placeholder: ''
  }
]

export interface CredentialForm {
  allow?: string[]
  deny?: string[]
  requestCredentials?: string[]
  customPolicies?: string[]
  vpPolicies?: string[]
  vcPolicies?: string[]
}

export interface PolicyEditorProps {
  credentials: CredentialForm
  setCredentials: (CredentialForm) => void
  label: string
  name: string
  defaultPolicies?: string[]
}

export function PolicyEditor(props): ReactElement {
  const {
    credentials,
    setCredentials,
    name,
    label,
    defaultPolicies = []
  }: PolicyEditorProps = props

  function handleNewRequestPolicy() {
    credentials?.requestCredentials?.push('')
    setCredentials(credentials)
  }

  function handleDeleteCustomPolicy(index: number) {
    credentials.customPolicies.splice(index, 1)
    setCredentials(credentials)
  }

  function handleDeleteRequestPolicy(index: number) {
    credentials.requestCredentials.splice(index, 1)
    setCredentials(credentials)
  }

  function handleNewCustomPolicy() {
    credentials?.customPolicies?.push('')
    setCredentials(credentials)
  }

  function handleNewVcPolicy() {
    credentials?.vcPolicies?.push('')
    setCredentials(credentials)
  }

  function handleDeleteVcPolicy(index: number) {
    credentials.vcPolicies.splice(index, 1)
    setCredentials(credentials)
  }

  function handleNewVpPolicy() {
    credentials?.vpPolicies?.push('')
    setCredentials(credentials)
  }

  function handleDeleteVpPolicy(index: number) {
    credentials.vpPolicies.splice(index, 1)
    setCredentials(credentials)
  }

  return (
    <>
      <label className={styles.editorLabel}>{label}</label>
      <div className={styles.editorPanel}>
        <div className={styles.panel}>
          <Button
            type="button"
            style="primary"
            className={styles.marginBottom1em}
            onClick={handleNewRequestPolicy}
          >
            New {fields[0].label}
          </Button>

          {credentials?.requestCredentials?.map((rule, index) => (
            <div key={index} className={styles.panel}>
              <Field
                {...getFieldContent('requestPolicy', fields)}
                component={Input}
                name={`${name}.requestCredentials[${index}]`}
                rows={6}
              />
              <Button
                type="button"
                style="primary"
                onClick={() => handleDeleteRequestPolicy(index)}
                className={`${styles.marginTopMinus3em}`}
              >
                Delete
              </Button>
            </div>
          ))}
        </div>

        <div className={styles.panel}>
          <Button
            type="button"
            style="primary"
            className={`${styles.marginBottom1em} ${styles.marginTop1em}`}
            onClick={handleNewCustomPolicy}
          >
            New {fields[1].label}
          </Button>

          {credentials?.customPolicies?.map((rule, index) => (
            <div key={index} className={styles.panel}>
              <Field
                {...getFieldContent('customPolicy', fields)}
                component={Input}
                name={`${name}.customPolicies[${index}]`}
                rows={1}
              />
              <Button
                type="button"
                style="primary"
                onClick={() => handleDeleteCustomPolicy(index)}
                className={`${styles.marginTopMinus3em}`}
              >
                Delete
              </Button>
            </div>
          ))}
        </div>

        <div className={styles.panel}>
          <Button
            type="button"
            style="primary"
            className={`${styles.marginBottom1em} ${styles.marginTop1em}`}
            onClick={handleNewVcPolicy}
          >
            New {fields[2].label}
          </Button>

          {credentials?.vcPolicies?.map((rule, index) => (
            <div key={index} className={styles.panel}>
              <Field
                key={index}
                {...getFieldContent('vcPolicy', fields)}
                component={Input}
                name={`${name}.vcPolicies[${index}]`}
                readOnly={
                  defaultPolicies.includes(credentials?.vcPolicies[index]) &&
                  credentials?.vcPolicies[index]?.length > 0
                }
              />
              <Button
                type="button"
                style="primary"
                disabled={
                  defaultPolicies.includes(credentials?.vcPolicies[index]) &&
                  credentials?.vcPolicies[index]?.length > 0
                }
                onClick={() => handleDeleteVcPolicy(index)}
                className={`${styles.marginTopMinus3em}`}
              >
                Delete
              </Button>
            </div>
          ))}
        </div>

        <div className={`${styles.panel} ${styles.marginBottomZero}`}>
          <Button
            type="button"
            style="primary"
            className={
              credentials?.vcPolicies?.length > 0
                ? `${styles.marginBottom1em} ${styles.marginTop1em}`
                : `${styles.marginTop1em}`
            }
            onClick={handleNewVpPolicy}
          >
            New {fields[3].label}
          </Button>

          {credentials?.vpPolicies?.map((rule, index) => (
            <div key={index} className={styles.panel}>
              <Field
                {...getFieldContent('vpPolicy', fields)}
                component={Input}
                name={`${name}.vpPolicies[${index}]`}
                rows={6}
              />
              <Button
                type="button"
                style="primary"
                onClick={() => handleDeleteVpPolicy(index)}
                className={`${styles.marginTopMinus3em}`}
              >
                Delete
              </Button>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
