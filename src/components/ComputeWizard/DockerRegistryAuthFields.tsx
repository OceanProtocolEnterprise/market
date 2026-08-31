import { ReactElement } from 'react'
import { Field } from 'formik'
import Input from '@shared/FormInput'
import styles from './DockerRegistryAuthFields.module.css'

export default function DockerRegistryAuthFields(): ReactElement {
  return (
    <section
      className={styles.container}
      aria-labelledby="docker-registry-auth-title"
      aria-live="polite"
    >
      <h3 id="docker-registry-auth-title">Private Docker registry</h3>
      <p>
        The compute provider could not access the algorithm image. Enter the
        registry credentials if the image is private, then retry initialization.
        They are encrypted for the Ocean Node and are not stored in the asset
        metadata.
      </p>
      <div className={styles.fields}>
        <Field
          component={Input}
          name="dockerRegistryUsername"
          label="Registry username"
          type="text"
          autoComplete="username"
          required
        />
        <Field
          component={Input}
          name="dockerRegistryPassword"
          label="Registry password or access token"
          type="password"
          autoComplete="new-password"
          required
        />
      </div>
    </section>
  )
}
