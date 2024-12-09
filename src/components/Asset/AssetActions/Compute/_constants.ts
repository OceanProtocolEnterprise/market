import { ComputeEnvironment, UserCustomParameters } from '@oceanprotocol/lib'
import * as Yup from 'yup'
import { getDefaultValues } from '../ConsumerParameters/FormConsumerParameters'
import { getUserCustomParameterValidationSchema } from '../ConsumerParameters/_validation'
import { Service } from 'src/@types/ddo/Service'
import { AssetExtended } from 'src/@types/AssetExtended'
import { Option } from 'src/@types/ddo/Option'

export interface ComputeDatasetForm {
  algorithm: string
  computeEnv: string
  dataServiceParams: UserCustomParameters
  algoServiceParams: UserCustomParameters
  algoParams: UserCustomParameters
  termsAndConditions: boolean
}

export function getComputeValidationSchema(
  dataServiceParams: Record<string, string | number | boolean | Option[]>[],
  algoServiceParams: Record<string, string | number | boolean | Option[]>[],
  algoParams: Record<string, string | number | boolean | Option[]>[]
): Yup.SchemaOf<{
  algorithm: string
  computeEnv: string
  dataServiceParams: Record<string, string | number | boolean | Option[]>[]
  algoServiceParams: Record<string, string | number | boolean | Option[]>[]
  algoParams: Record<string, string | number | boolean | Option[]>[]
  termsAndConditions: boolean
}> {
  return Yup.object().shape({
    algorithm: Yup.string().required('Required'),
    computeEnv: Yup.string().required('Required'),
    dataServiceParams:
      getUserCustomParameterValidationSchema(dataServiceParams),
    algoServiceParams:
      getUserCustomParameterValidationSchema(algoServiceParams),
    algoParams: getUserCustomParameterValidationSchema(algoParams),
    termsAndConditions: Yup.boolean()
      .required('Required')
      .isTrue('Please agree to the Terms and Conditions.')
  })
}

export function getInitialValues(
  service: Service,
  selectedAlgorithmAsset?: AssetExtended,
  selectedComputeEnv?: ComputeEnvironment,
  termsAndConditions?: boolean
): ComputeDatasetForm {
  return {
    algorithm: selectedAlgorithmAsset?.credentialSubject?.id,
    computeEnv: selectedComputeEnv?.id,
    dataServiceParams: getDefaultValues(service.consumerParameters),
    algoServiceParams: getDefaultValues(
      selectedAlgorithmAsset?.credentialSubject?.services[0].consumerParameters
    ),
    algoParams: getDefaultValues(
      selectedAlgorithmAsset?.credentialSubject?.metadata?.algorithm
        .consumerParameters
    ),
    termsAndConditions: !!termsAndConditions
  }
}
