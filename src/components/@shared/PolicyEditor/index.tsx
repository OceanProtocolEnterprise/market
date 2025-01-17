import { getFieldContent } from '@utils/form'
import { Field } from 'formik'
import { ReactElement, useEffect } from 'react'
import styles from './index.module.css'
import Input from '../FormInput'
import Button from '../atoms/Button'
import {
  CustomPolicy,
  CustomUrlPolicy,
  ParameterizedPolicyForm,
  PolicyEditorProps,
  PolicyType,
  RequestCredentialForm,
  StaticPolicyForm
} from './types'
import fields from './editor.json'

interface PolicyViewProps {
  policy: PolicyType
  name: string
  index: number
  innerIndex: number
  onDeletePolicy: () => void
}

function StaticPolicyView(props): ReactElement {
  const { policy, index, innerIndex, name, onDeletePolicy }: PolicyViewProps =
    props
  return (
    <>
      <label>{{ ...getFieldContent('staticPolicy', fields) }.label}</label>
      <div className={`${styles.editorPanel} ${styles.marginBottom1em}`}>
        <Field
          {...getFieldContent('name', fields)}
          component={Input}
          name={`${name}.requestCredentials[${index}].policies[${innerIndex}].name`}
        />
        <Button
          type="button"
          style="primary"
          onClick={onDeletePolicy}
          className={`${styles.marginTopMinus3em} ${styles.deleteButton}`}
        >
          Delete
        </Button>
      </div>
    </>
  )
}

function ParameterizedPolicyView(props): ReactElement {
  const { policy, index, innerIndex, name, onDeletePolicy }: PolicyViewProps =
    props
  return (
    <>
      <label>
        {{ ...getFieldContent('parameterizedPolicy', fields) }.label}
      </label>
      <div className={`${styles.editorPanel} ${styles.marginBottom1em}`}>
        <Field
          {...getFieldContent('policy', fields)}
          component={Input}
          name={`${name}.requestCredentials[${index}].policies[${innerIndex}].policy`}
        />
        <Field
          {...getFieldContent('arguments', fields)}
          component={Input}
          name={`${name}.requestCredentials[${index}].policies[${innerIndex}].args`}
        />
        <Button
          type="button"
          style="primary"
          onClick={onDeletePolicy}
          className={`${styles.marginTopMinus3em} ${styles.deleteButton}`}
        >
          Delete
        </Button>
      </div>
    </>
  )
}

function CustomUrlPolicyView(props): ReactElement {
  const { policy, index, innerIndex, name, onDeletePolicy }: PolicyViewProps =
    props
  return (
    <>
      <label>{{ ...getFieldContent('customUrlPolicy', fields) }.label}</label>
      <div className={`${styles.editorPanel} ${styles.marginBottom1em}`}>
        <Field
          {...getFieldContent('url', fields)}
          component={Input}
          name={`${name}.requestCredentials[${index}].policies[${innerIndex}].policyUrl`}
        />
        <Button
          type="button"
          style="primary"
          onClick={onDeletePolicy}
          className={`${styles.marginTopMinus3em} ${styles.deleteButton}`}
        >
          Delete
        </Button>
      </div>
    </>
  )
}

function CustomPolicyView(props): ReactElement {
  const { policy, index, innerIndex, name, onDeletePolicy }: PolicyViewProps =
    props
  return (
    <Field
      {...getFieldContent('customPolicy', fields)}
      component={Input}
      name={`${name}.requestCredentials[${index}].policies[${innerIndex}]`}
      rows={1}
    />
  )
}

function PolicyView(props): ReactElement {
  const { policy }: PolicyViewProps = props
  switch (policy?.type) {
    case 'staticPolicy':
      return StaticPolicyView(props)
    case 'parameterizedPolicy':
      return ParameterizedPolicyView(props)
    case 'customUrlPolicy':
      return CustomUrlPolicyView(props)
    case 'customPolicy':
      return CustomPolicyView(props)
    default:
      return <></>
  }
}

export function PolicyEditor(props): ReactElement {
  const {
    credentials,
    setCredentials,
    name,
    label,
    defaultPolicies = []
  }: PolicyEditorProps = props

  useEffect(() => {
    console.log(credentials)
  }, [credentials])

  const filteredDefaultPolicies = defaultPolicies.filter(
    (policy) => policy.length > 0
  )

  function handleNewRequestCredential() {
    const newRequestCredential: RequestCredentialForm = {
      format: '',
      type: '',
      policies: []
    }
    credentials?.requestCredentials?.push(newRequestCredential)
    setCredentials(credentials)
  }

  function handleDeleteRequestCredential(index: number) {
    credentials.requestCredentials.splice(index, 1)
    setCredentials(credentials)
  }

  function handleNewStaticCustomPolicy(credential: RequestCredentialForm) {
    const policy: StaticPolicyForm = {
      type: 'staticPolicy',
      name: ''
    }
    credential?.policies?.push(policy)
    setCredentials(credentials)
  }

  function handleNewParameterizedCustomPolicy(
    credential: RequestCredentialForm
  ) {
    const policy: ParameterizedPolicyForm = {
      type: 'parameterizedPolicy',
      args: [],
      policy: ''
    }
    credential?.policies?.push(policy)
    setCredentials(credentials)
  }

  function handleNewCustomUrlPolicy(credential: RequestCredentialForm) {
    const policy: CustomUrlPolicy = {
      type: 'customUrlPolicy',
      arguments: {},
      policyUrl: ''
    }
    credential?.policies?.push(policy)
    setCredentials(credentials)
  }

  function handleNewCustomPolicy(credential: RequestCredentialForm) {
    const policy: CustomPolicy = {
      type: 'customPolicy',
      arguments: {},
      description: '',
      name: '',
      rules: []
    }
    credential?.policies?.push(policy)
    setCredentials(credentials)
  }

  function handleDeleteCustomPolicy(
    credential: RequestCredentialForm,
    index: number
  ) {
    credential?.policies?.splice(index, 1)
    setCredentials(credentials)
  }

  function handleNewStaticPolicy() {
    credentials?.vcPolicies?.push('')
    setCredentials(credentials)
  }

  function handleDeleteStaticPolicy(index: number) {
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

  const staticPolicyLabel = (index: number) => {
    const field = { ...getFieldContent('staticPolicy', fields) }
    if (index < filteredDefaultPolicies?.length) {
      field.label = `Default ${field.label}`
    }
    return field
  }

  return (
    <>
      <label className={styles.editorLabel}>{label}</label>
      <div className={`${styles.editorPanel} ${styles.marginBottom4em}`}>
        <div className={`${styles.panel} ${styles.marginBottom2em}`}>
          <Button
            type="button"
            style="primary"
            className={styles.marginBottom1em}
            onClick={handleNewRequestCredential}
          >
            New {{ ...getFieldContent('requestCredential', fields) }.label}
          </Button>

          {credentials?.requestCredentials?.map((credential, index) => (
            <div key={index} className={styles.panel}>
              <Field
                className={styles.width100}
                {...getFieldContent('type', fields)}
                component={Input}
                name={`${name}.requestCredentials[${index}].type`}
              />
              <Field
                {...getFieldContent('format', fields)}
                component={Input}
                name={`${name}.requestCredentials[${index}].format`}
              />

              <div
                className={`${styles.marginTopMinus2em} ${styles.panelRow} ${styles.justifyContentSpaceBetween}`}
              >
                <Button
                  type="button"
                  style="primary"
                  onClick={() => handleDeleteRequestCredential(index)}
                  className={styles.deleteButton}
                >
                  Delete
                </Button>

                <div className={`${styles.panelRow} ${styles.paddingLeft3em}`}>
                  <label>
                    {{ ...getFieldContent('newPolicy', fields) }.label}
                  </label>
                  <Button
                    type="button"
                    style="primary"
                    className={`${styles.marginBottom1em} ${styles.space}`}
                    onClick={() => handleNewStaticCustomPolicy(credential)}
                  >
                    {{ ...getFieldContent('static', fields) }.label}
                  </Button>
                  <Button
                    type="button"
                    style="primary"
                    className={`${styles.marginBottom1em} ${styles.space}`}
                    onClick={() =>
                      handleNewParameterizedCustomPolicy(credential)
                    }
                  >
                    {{ ...getFieldContent('parameterized', fields) }.label}
                  </Button>
                  <Button
                    type="button"
                    style="primary"
                    className={`${styles.marginBottom1em} ${styles.space}`}
                    onClick={() => handleNewCustomUrlPolicy(credential)}
                  >
                    {{ ...getFieldContent('customUrl', fields) }.label}
                  </Button>
                  <Button
                    type="button"
                    style="primary"
                    className={`${styles.marginBottom1em} ${styles.space}`}
                    onClick={() => handleNewCustomPolicy(credential)}
                  >
                    {{ ...getFieldContent('custom', fields) }.label}
                  </Button>
                </div>
              </div>

              <div className={styles.paddingLeft3em}>
                {credential?.policies?.map((policy, innerIndex) => (
                  <div key={innerIndex} className={styles.panel}>
                    <PolicyView
                      index={index}
                      innerIndex={innerIndex}
                      name={name}
                      policy={policy}
                      onDeletePolicy={() =>
                        handleDeleteCustomPolicy(credential, innerIndex)
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className={`${styles.panel} ${styles.marginBottom2em}`}>
          <Button
            type="button"
            style="primary"
            className={`${styles.marginBottom1em} ${styles.marginTop2em}`}
            onClick={handleNewStaticPolicy}
          >
            New {{ ...getFieldContent('staticPolicy', fields) }.label}
          </Button>

          {credentials?.vcPolicies?.map((rule, index) => (
            <div key={index} className={styles.panel}>
              <Field
                key={index}
                {...staticPolicyLabel(index)}
                component={Input}
                name={`${name}.vcPolicies[${index}]`}
                readOnly={
                  index < filteredDefaultPolicies?.length &&
                  filteredDefaultPolicies.includes(
                    credentials?.vcPolicies[index]
                  ) &&
                  credentials?.vcPolicies[index]?.length > 0
                }
              />
              <Button
                type="button"
                style="primary"
                disabled={
                  index < filteredDefaultPolicies?.length &&
                  filteredDefaultPolicies.includes(
                    credentials?.vcPolicies[index]
                  ) &&
                  credentials?.vcPolicies[index]?.length > 0
                }
                onClick={() => handleDeleteStaticPolicy(index)}
                className={`${styles.marginTopMinus3em} ${styles.deleteButton}`}
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
            New {{ ...getFieldContent('vpPolicy', fields) }.label}
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
                className={`${styles.marginTopMinus3em} ${styles.deleteButton}`}
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
