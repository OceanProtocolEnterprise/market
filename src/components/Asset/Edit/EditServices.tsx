import { ReactElement, useState } from 'react'
import EditService from './EditService'
import Button from '@components/@shared/atoms/Button'
import AddService from './AddService'
import ServiceCard from '../AssetContent/ServiceCard'
import AddServiceCard from './AddServiceCard'
import styles from './index.module.css'

export default function EditServices({
  asset
}: {
  asset: AssetExtended
}): ReactElement {
  const [selectedService, setSelectedService] = useState<number | undefined>() // -1 is the new service, undefined is none

  return (
    <div>
      <div className={styles.servicesGrid}>
        {asset.services.map((service, index) => (
          <ServiceCard
            key={service.id}
            service={service}
            accessDetails={asset.accessDetails[index]}
            onClick={() => setSelectedService(index)}
          />
        ))}
        <AddServiceCard onClick={() => setSelectedService(-1)} />
      </div>

      {selectedService !== undefined && (
        <>
          <hr />

          <div className={styles.servicesHeader}>
            <h3>
              {selectedService === -1
                ? 'Add a new service'
                : `Edit service ${asset.services[selectedService].name}`}
            </h3>
            <Button
              size="small"
              style="text"
              onClick={() => setSelectedService(undefined)}
            >
              Cancel
            </Button>
          </div>

          {selectedService === -1 ? (
            <AddService asset={asset} />
          ) : (
            <EditService
              asset={asset}
              service={asset.services[selectedService]}
              accessDetails={asset.accessDetails[selectedService]}
            />
          )}
        </>
      )}
    </div>
  )
}
