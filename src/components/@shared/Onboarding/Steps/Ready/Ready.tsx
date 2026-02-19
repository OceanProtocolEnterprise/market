import { ReactElement } from 'react'
import { useRouter } from 'next/router'
import styles from './index.module.css'
import content from '../../../../../../content/onboarding/steps/ready.json'
import SuccessConfetti from '@components/@shared/SuccessConfetti'
import Button from '@shared/atoms/Button'

interface ReadyStep {
  title: string
  body: string
  image: string
}

export default function Ready(): ReactElement {
  const { title, body, image }: ReadyStep = content
  const router = useRouter()

  const handlePublish = () => {
    router.push('/publish/1')
  }

  const handleCatalogue = () => {
    router.push('/search?sort=indexedMetadata.event.block&sortOrder=desc')
  }

  return (
    <div className={styles.container}>
      <SuccessConfetti success={body} className={styles.body} />
      <img src={image} alt="Ready" className={styles.image} />
      <div className={styles.footer}>
        <h3 className={styles.title}>{title}</h3>

        <div className={styles.buttonsWrapper}>
          <Button onClick={handlePublish} style="publish" size="small">
            Publish New Asset
          </Button>

          <Button onClick={handleCatalogue} style="primary" size="small">
            View Catalogue
          </Button>
        </div>
      </div>
    </div>
  )
}
