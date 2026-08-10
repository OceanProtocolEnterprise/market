import {
  ChangeEvent,
  ReactElement,
  useCallback,
  useEffect,
  useState
} from 'react'
import InputElement from '..'
import Label from '../../Label'
import styles from './index.module.css'
import Tooltip from '@shared/atoms/Tooltip'
import Markdown from '@shared/Markdown'
import Button from '@shared/atoms/Button'
import PublishButton from '@shared/PublishButton'
import { InputProps } from '@shared/FormInput'
import { isValidWebUrl } from '@utils/url'
import classNames from 'classnames/bind'
import type { KeyValuePair } from 'src/@types/KeyValuePair'

const cx = classNames.bind(styles)

export type { KeyValuePair } from 'src/@types/KeyValuePair'

interface KeyValueInputProps extends Omit<InputProps, 'value'> {
  value: KeyValuePair[]
  uniqueKeys?: boolean
  keyPlaceholder?: string
  valuePlaceholder?: string
}

function normalizePairKey(key: string): string {
  return key.trim()
}

export default function InputKeyValue({
  uniqueKeys = false,
  value,
  keyPlaceholder = 'key',
  valuePlaceholder = 'value',
  keyLabel,
  valueLabel,
  validateValueAsUrl = false,
  disabled = false,
  ...props
}: KeyValueInputProps): ReactElement {
  const { label, help, prominentHelp, form, field } = props

  const [currentKey, setCurrentKey] = useState('')
  const [currentValue, setCurrentValue] = useState('')
  const [disabledButton, setDisabledButton] = useState(true)
  const [hasOnlyUniqueKeys, setHasOnlyUniqueKeys] = useState(true)

  const [pairs, setPairs] = useState(value || [])

  const normalizedCurrentKey = normalizePairKey(currentKey)
  const normalizedCurrentValue = currentValue.trim()
  const valueInvalid =
    validateValueAsUrl &&
    !!normalizedCurrentValue &&
    !isValidWebUrl(normalizedCurrentValue)

  const currentKeyExists = useCallback(() => {
    return pairs.some(
      (pair) => normalizePairKey(pair.key) === normalizedCurrentKey
    )
  }, [normalizedCurrentKey, pairs])

  const addPair = () => {
    if (!normalizedCurrentKey || !normalizedCurrentValue || valueInvalid) return

    if (currentKeyExists()) {
      setHasOnlyUniqueKeys(false)
      if (uniqueKeys) return
    }

    setPairs((prev) => [
      ...prev,
      {
        key: normalizedCurrentKey,
        value: normalizedCurrentValue
      }
    ])
    setCurrentKey('')
    setCurrentValue('')
  }

  const removePair = (index: number) => {
    const newPairs = pairs.filter((pair, pairIndex) => pairIndex !== index)
    setPairs(newPairs)
    setCurrentKey('')
    setCurrentValue('')
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const isKeyField = e.target.name.endsWith('.key')
    isKeyField ? setCurrentKey(e.target.value) : setCurrentValue(e.target.value)

    return e
  }

  useEffect(() => {
    const incoming = value || []
    setPairs((prev) =>
      JSON.stringify(prev) === JSON.stringify(incoming) ? prev : incoming
    )
  }, [value])

  useEffect(() => {
    form.setFieldValue(field.name, pairs)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairs])

  useEffect(() => {
    setDisabledButton(
      !normalizedCurrentKey ||
        !normalizedCurrentValue ||
        (uniqueKeys && currentKeyExists()) ||
        valueInvalid
    )
    setHasOnlyUniqueKeys(!currentKeyExists())
  }, [
    normalizedCurrentKey,
    normalizedCurrentValue,
    uniqueKeys,
    currentKeyExists,
    valueInvalid
  ])

  return (
    <div
      className={cx({
        hasError: uniqueKeys && !hasOnlyUniqueKeys
      })}
    >
      {label && (
        <Label htmlFor={props.name}>
          {label}
          {props.required && (
            <span title="Required" className={styles.required}>
              *
            </span>
          )}
          {help && !prominentHelp && (
            <Tooltip content={<Markdown text={help} />} />
          )}
        </Label>
      )}

      <div className={styles.pairsContainer}>
        <div className={styles.fieldCol}>
          {keyLabel && <Label htmlFor={`${field.name}.key`}>{keyLabel}</Label>}
          <InputElement
            className={styles.keyInput}
            name={`${field.name}.key`}
            placeholder={keyPlaceholder}
            value={`${currentKey}`}
            onChange={handleChange}
            disabled={disabled}
          />
        </div>

        <div className={cx({ fieldCol: true, valueError: valueInvalid })}>
          {valueLabel && (
            <Label htmlFor={`${field.name}.value`}>{valueLabel}</Label>
          )}
          <InputElement
            className={styles.input}
            name={`${field.name}.value`}
            placeholder={valuePlaceholder}
            value={`${currentValue}`}
            onChange={handleChange}
            disabled={disabled}
          />
          {valueInvalid && (
            <p className={styles.error}>Please enter a valid URL.</p>
          )}
        </div>

        <PublishButton
          icon="add"
          text="Add"
          buttonStyle="primary"
          onClick={(e: React.SyntheticEvent) => {
            e.preventDefault()
            addPair()
          }}
          disabled={disabledButton || disabled}
        />

        {uniqueKeys && !hasOnlyUniqueKeys && (
          <p
            className={styles.error}
          >{`The ${keyPlaceholder} field must be unique`}</p>
        )}
      </div>

      {pairs.length > 0 &&
        pairs.map((header, i) => {
          return (
            <div className={styles.pairsAddedContainer} key={`pair_${i}`}>
              <InputElement
                name={`pair[${i}].key`}
                value={`${header.key}`}
                disabled
              />

              <InputElement
                name={`pair[${i}].value`}
                value={`${header.value}`}
                disabled
              />

              <Button
                style="outlined"
                size="small"
                onClick={(e: React.SyntheticEvent) => {
                  e.preventDefault()
                  removePair(i)
                }}
                disabled={disabled}
              >
                remove
              </Button>
            </div>
          )
        })}
    </div>
  )
}
