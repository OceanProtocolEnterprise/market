import { getFieldContent } from '@utils/form'
import { Field } from 'formik'
import { ReactElement } from 'react'
import styles from './index.module.css'
import Input from '../FormInput'
import Button from '../atoms/Button'

export interface CredentialForm {
  allow: string[]
  deny: string[]
  requestCredentials?: string[]
  customPolicies?: string[]
  vpPolicies?: string[]
  vcPolicies?: string[]
}

export interface PolicyEditorProps {
  credentials: CredentialForm
  setCredentials: (CredentialForm) => void
  name: string
  requestCredentialsFieldName: string
  customPoliciesFieldName: string
  fields: FormFieldContent[]
  requiredPolicyFieldRows: number
}

export function PolicyEditor(props): ReactElement {
  const {
    credentials,
    setCredentials,
    name,
    requestCredentialsFieldName,
    customPoliciesFieldName,
    fields,
    requiredPolicyFieldRows
  }: PolicyEditorProps = props

  function handleNewRequestPolicy() {
    credentials?.requestCredentials?.push('')
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

  function handleDeleteCustomPolicy(index: number) {
    credentials.customPolicies.splice(index, 1)
    setCredentials(credentials)
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panel}>
        <Button
          type="button"
          style="primary"
          className={styles.newButton}
          onClick={handleNewRequestPolicy}
        >
          New Request Policy
        </Button>

        {credentials?.requestCredentials?.map((rule, index) => (
          <>
            <Field
              key={index}
              {...getFieldContent(requestCredentialsFieldName, fields)}
              component={Input}
              name={`${name}.requestCredentials[${index}]`}
              rows={requiredPolicyFieldRows}
            />
            <Button
              type="button"
              style="primary"
              onClick={() => handleDeleteRequestPolicy(index)}
              className={styles.deleteButton}
            >
              Delete
            </Button>
          </>
        ))}
      </div>

      <div className={styles.panel}>
        <Button
          type="button"
          style="primary"
          className={styles.newButton}
          onClick={handleNewCustomPolicy}
        >
          New Policy
        </Button>

        {credentials?.customPolicies?.map((rule, index) => (
          <>
            <Field
              key={index}
              {...getFieldContent(customPoliciesFieldName, fields)}
              component={Input}
              name={`${name}.customPolicies[${index}]`}
              rows={1}
            />
            <Button
              type="button"
              style="primary"
              onClick={() => handleDeleteCustomPolicy(index)}
              className={styles.deleteButton}
            >
              Delete
            </Button>
          </>
        ))}
      </div>
    </div>
  )
}
