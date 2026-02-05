import { Field, useField, useFormikContext } from 'formik'
import { ReactElement } from 'react'
import Input from '@shared/FormInput'
import Error from '@shared/FormInput/Error'
import styles from './Price.module.css'
import { FormPublishData } from '../_types'
import { getFieldContent } from '@utils/form'
import CoinSelect from './CoinSelect'
import Alert from '@shared/atoms/Alert'

export default function Price({
  approvedBaseTokens,
  content
}: {
  approvedBaseTokens?: TokenInfo[]
  content?: any
}): ReactElement {
  const [field, meta] = useField('pricing.price')

  const { values } = useFormikContext<FormPublishData>()

  const noApprovedTokens =
    !approvedBaseTokens || approvedBaseTokens.length === 0

  return (
    <div className={styles.price}>
      {values.pricing.type === 'free' ? (
        <div className={styles.free}>
          <Field
            {...getFieldContent('freeAgreement', content.fields)}
            component={Input}
            name="pricing.freeAgreement"
          />
        </div>
      ) : (
        <>
          {noApprovedTokens && (
            <div style={{ marginBottom: '1.5rem' }}>
              <Alert
                title="No Supported Currencies Used"
                text="There are currently no approved currencies available for pricing on this network. Please contact the administrator or switch to a supported network. For details on accepted currencies, consult https://docs.oceanenterprise.io/developers/networks#supported-currencies."
                state="error"
              />
            </div>
          )}

          {!noApprovedTokens && (
            <div className={styles.grid}>
              <div className={styles.form}>
                <Input
                  type="number"
                  min="1"
                  placeholder="1"
                  prefix={
                    approvedBaseTokens.length > 1 ? (
                      <CoinSelect approvedBaseTokens={approvedBaseTokens} />
                    ) : (
                      approvedBaseTokens[0]?.symbol
                    )
                  }
                  variant="publish"
                  {...field}
                />
                <Error meta={meta} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
