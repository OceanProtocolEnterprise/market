import { Fragment, ReactElement, useEffect, useState } from 'react'
import { Field, useField } from 'formik'
import Input, { InputProps } from '../..'
import { FormConsumerParameter } from '@components/Publish/_types'
import DefaultInput from './DefaultInput'
import OptionsInput from './OptionsInput'
import TypeInput from './TypeInput'
import styles from './ConsumerParametersBuilder.module.css'
import AddParam from '@images/add_param.svg'
import BinIcon from '@images/bin.svg'
import Button from '../../../atoms/Button'

const defaultConsumerParam: FormConsumerParameter = {
  name: '',
  label: '',
  description: '',
  type: 'text',
  options: undefined,
  default: '',
  required: 'optional'
}

const paramTypes: FormConsumerParameter['type'][] = [
  'number',
  'text',
  'boolean',
  'select'
]

export function ConsumerParametersBuilder(props: InputProps): ReactElement {
  const [field, , helpers] = useField<FormConsumerParameter[]>(props.name)
  const [expandedIndex, setExpandedIndex] = useState(0)

  useEffect(() => {
    if (!field.value || field.value.length === 0) {
      helpers.setValue([{ ...defaultConsumerParam }])
      setExpandedIndex(0)
    }
  }, [field.value, helpers])

  const parameters = field.value || []
  const safeExpandedIndex = Math.min(
    expandedIndex,
    Math.max(0, parameters.length - 1)
  )
  useEffect(() => {
    if (expandedIndex !== safeExpandedIndex) {
      setExpandedIndex(safeExpandedIndex)
    }
  }, [expandedIndex, safeExpandedIndex])

  const addParameter = () => {
    const newParams = [...parameters, { ...defaultConsumerParam }]
    helpers.setValue(newParams)
    setExpandedIndex(newParams.length - 1)
  }

  const deleteParameter = (index: number) => {
    if (parameters.length > 1) {
      const newParams = parameters.filter((_, i) => i !== index)
      helpers.setValue(newParams)
      setExpandedIndex(Math.min(index, newParams.length - 1))
    }
  }

  if (!parameters.length) {
    return <div>Loading...</div>
  }

  return (
    <>
      <div className={styles.container}>
        {/* Parameter Tabs - Vertical Stack */}
        <div className={styles.tabsContainer}>
          <div className={styles.tabs}>
            {parameters.map((param, index) => {
              const isExpanded = index === safeExpandedIndex
              const paramData = param || defaultConsumerParam

              return (
                <Fragment key={index}>
                  <div
                    className={`${styles.tab} ${
                      isExpanded ? styles.activeTab : ''
                    }`}
                    onClick={() => {
                      setExpandedIndex(index)
                    }}
                  >
                    PARAM {index + 1}
                    {parameters.length > 1 && isExpanded && (
                      <button
                        type="button"
                        className={styles.deleteButton}
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteParameter(index)
                        }}
                      >
                        <BinIcon /> Delete
                      </button>
                    )}
                  </div>

                  {isExpanded && (
                    <div className={styles.formContainer}>
                      <div className={styles.formRow}>
                        <div className={styles.formColumn}>
                          <Field
                            name={`${field.name}[${index}].name`}
                            label="Parameter Name"
                            required
                            component={Input}
                            className={styles.fullWidthInput}
                          />
                        </div>
                        <div className={styles.formColumn}>
                          <Field
                            name={`${field.name}[${index}].label`}
                            label="Parameter Label"
                            required
                            component={Input}
                            className={styles.fullWidthInput}
                          />
                        </div>
                      </div>

                      <div className={styles.formRow}>
                        <div className={styles.formColumn}>
                          <Field
                            name={`${field.name}[${index}].description`}
                            label="Description"
                            required
                            component={Input}
                            className={styles.fullWidthInput}
                          />
                        </div>
                        <div className={styles.formColumn}>
                          <TypeInput
                            name={`${field.name}[${index}].type`}
                            label="Parameter Type"
                            required
                            type="select"
                            options={paramTypes}
                            index={index}
                            inputName={props.name}
                            className={styles.fullWidthInput}
                          />
                        </div>
                      </div>

                      <div className={styles.formRow}>
                        <div className={styles.formColumn}>
                          <Field
                            name={`${field.name}[${index}].required`}
                            label="Required"
                            required
                            type="select"
                            options={['optional', 'required']}
                            component={Input}
                            className={styles.fullWidthInput}
                          />
                        </div>
                        <div className={styles.formColumn}>
                          <DefaultInput
                            name={`${field.name}[${index}].default`}
                            label="Default Value"
                            required
                            index={index}
                            inputName={props.name}
                            className={styles.fullWidthInput}
                          />
                        </div>
                      </div>

                      {paramData?.type === 'select' && (
                        <div className={styles.formRow}>
                          <div className={styles.formColumnFull}>
                            <OptionsInput
                              name={`${field.name}[${index}].options`}
                              label="Options"
                              value={paramData.options}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Fragment>
              )
            })}
          </div>
        </div>

        {/* Parameter Form - Two Column Layout */}

        {/* Add Parameter Button */}
      </div>
      <div className={styles.addButtonContainer}>
        <Button type="button" style="gradient" onClick={addParameter}>
          <AddParam /> Add parameter
        </Button>
      </div>
    </>
  )
}
