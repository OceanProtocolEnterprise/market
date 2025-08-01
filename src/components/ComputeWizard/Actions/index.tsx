import { ReactElement } from 'react'
import { useFormikContext } from 'formik'
import { useRouter } from 'next/router'
import Button from '@shared/atoms/Button'
import { FormComputeData } from '../_types'
import styles from './index.module.css'

export default function Actions(): ReactElement {
  const router = useRouter()
  const { values, isSubmitting, submitForm, setFieldValue }: any =
    useFormikContext<FormComputeData>()

  const currentStep = values.user.stepCurrent
  const isLastStep = currentStep === 4

  function handleBack() {
    if (currentStep > 1) {
      const { did } = router.query
      router.push(`/asset/${did}/compute/${currentStep - 1}`)
    } else {
      const { did } = router.query
      router.push(`/asset/${did}`)
    }
  }

  function handleContinue() {
    if (currentStep < 4) {
      // Mark current step as completed when user continues (same as publish flow)
      const stepCompletions = {
        1: ['step1Completed'],
        2: ['step2Completed'],
        3: ['step3Completed'],
        4: ['step4Completed']
      }

      const fieldsToSet = stepCompletions[currentStep] || []
      fieldsToSet.forEach((field) => setFieldValue(field, true))

      const { did } = router.query
      router.push(`/asset/${did}/compute/${currentStep + 1}`)
    }
  }

  function handleSubmit() {
    submitForm()
  }

  const isFirstStep = currentStep === 1
  const actionsClassName = isFirstStep ? styles.actionsRight : styles.actions

  return (
    <footer className={actionsClassName}>
      {values.user.stepCurrent > 1 && (
        <Button onClick={handleBack} disabled={isSubmitting}>
          Back
        </Button>
      )}
      {isLastStep ? (
        <Button type="submit" style="publish" disabled={isSubmitting}>
          {isSubmitting ? 'Processing...' : 'Buy Dataset'}
        </Button>
      ) : (
        <Button
          style="publish"
          onClick={handleContinue}
          disabled={
            isSubmitting ||
            // Step 1: Must have algorithm selected
            (currentStep === 1 &&
              (!values.algorithm || values.algorithm === null)) ||
            // Step 2: Must have algorithm completed and environment selected
            (currentStep === 2 && (!values.algorithm || !values.computeEnv)) ||
            // Step 3: Must have previous steps completed and all configuration values set
            (currentStep === 3 &&
              (!values.algorithm ||
                !values.computeEnv ||
                values.cpu <= 0 ||
                values.ram <= 0 ||
                values.disk <= 0 ||
                values.jobDuration <= 0)) ||
            // Step 4: Must have all previous steps completed
            (currentStep === 4 &&
              (!values.algorithm ||
                !values.computeEnv ||
                !values.step3Completed))
          }
        >
          Continue
        </Button>
      )}
    </footer>
  )
}
