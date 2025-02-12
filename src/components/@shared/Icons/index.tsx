import GridView from '@images/grid-view-icon.svg'
import ListView from '@images/list-view-icon.svg'
import Caret from '@images/caret.svg'
import Eth from '@images/eth.svg'
import OceanLogo from '@images/logo.svg'
import Compute from '@images/compute.svg'
import Download from '@images/download.svg'
import Lock from '@images/lock.svg'
import Copy from '@images/copy.svg'
import LogoAssetFull from '@oceanprotocol/art/logo/logo.svg'
import Info from '@images/info.svg'
import External from '@images/external.svg'
import CPU from '@images/cpu.svg'
import GPU from '@images/gpu.svg'
import Key from '@images/key.svg'
import Refresh from '@images/refresh.svg'
import Polygon from '@images/polygon.svg'
import Moonbeam from '@images/moonbeam.svg'
import Bsc from '@images/bsc.svg'
import Energyweb from '@images/energyweb.svg'
import Optimism from '@images/optimism.svg'
import BrandLogo from '@images/brand-logo.svg'
import Arrow from '@images/arrow.svg'
import VerifiedPatch from '@images/patch_check.svg'
import Cross from '@images/cross.svg'
import Bookmark from '@images/bookmark.svg'
import Dataset from '@images/dataset.svg'
import Algorithm from '@images/algorithm.svg'
import Search from '@images/search.svg'
import Moon from '@images/moon.svg'
import Sun from '@images/sun.svg'
import Cog from '@images/cog.svg'
import Network from '@images/network.svg'
import EUROeLogo from '@images/EUROe_Symbol_Black.svg'
import Jellyfish from '@oceanprotocol/art/creatures/jellyfish/jellyfish-grid.svg'
import Image from 'next/image'

interface Props {
  className?: string | undefined
  'aria-label'?: string | undefined
  role?: string | undefined
  ref?: any | undefined
}

export const JellyfishIcon = ({ className }: Props) => (
  <Image className={className} src={Jellyfish} alt="Jellyfish Icon" />
)

export const EUROeLogoIcon = ({ className }: Props) => (
  <Image className={className} src={EUROeLogo} alt="EUROeLogo Icon" />
)

export const NetworkIcon = ({ className }: Props) => (
  <Image className={className} src={Network} alt="Network Icon" />
)

export const CogIcon = ({ className }: Props) => (
  <Image className={className} src={Cog} alt="Cog Icon" />
)

export const MoonIcon = ({ className }: Props) => (
  <Image className={className} src={Moon} alt="Moon Icon" />
)

export const SunIcon = ({ className }: Props) => (
  <Image className={className} src={Sun} alt="Sun Icon" />
)

export const SearchIcon = ({ className }: Props) => (
  <Image className={className} src={Search} alt="Search Icon" />
)

export const DatasetIcon = ({ className }: Props) => (
  <Image className={className} src={Dataset} alt="Dataset Icon" />
)

export const AlgorithmIcon = ({ className }: Props) => (
  <Image className={className} src={Algorithm} alt="Algorithm Icon" />
)

export const BookmarkIcon = ({ className }: Props) => (
  <Image className={className} src={Bookmark} alt="Bookmark Icon" />
)

export const VerifiedPatchIcon = ({ className }: Props) => (
  <Image className={className} src={VerifiedPatch} alt="VerifiedPatch Icon" />
)

export const CrossIcon = ({ className }: Props) => (
  <Image className={className} src={Cross} alt="Cross Icon" />
)

export const ArrowIcon = ({ className }: Props) => (
  <Image className={className} src={Arrow} alt="Arrow Icon" />
)

export const BrandLogoIcon = ({ className }: Props) => (
  <Image className={className} src={BrandLogo} alt="BrandLogo Icon" />
)

export const PolygonIcon = ({ className }: Props) => (
  <Image className={className} src={Polygon} alt="Polygon Icon" />
)

export const MoonbeamIcon = ({ className }: Props) => (
  <Image className={className} src={Moonbeam} alt="Moonbeam Icon" />
)

export const BscIcon = ({ className }: Props) => (
  <Image className={className} src={Bsc} alt="Bsc Icon" />
)

export const EnergywebIcon = ({ className }: Props) => (
  <Image className={className} src={Energyweb} alt="Energyweb Icon" />
)

export const OptimismIcon = ({ className }: Props) => (
  <Image className={className} src={Optimism} alt="Optimism Icon" />
)

export const RefreshIcon = ({ className }: Props) => (
  <Image className={className} src={Refresh} alt="Refresh Icon" />
)

export const KeyIcon = ({ className }: Props) => (
  <Image className={className} src={Key} alt="Key Icon" />
)

export const CPUIcon = ({ className }: Props) => (
  <Image className={className} src={CPU} alt="CPU Icon" />
)

export const GPUIcon = ({ className }: Props) => (
  <Image className={className} src={GPU} alt="GPU Icon" />
)

export const ExternalIcon = ({ className }: Props) => (
  <Image className={className} src={External} alt="External Icon" />
)

export const InfoIcon = ({ className, ref }: Props) => (
  <Image className={className} src={Info} alt="Info Icon" ref={ref} />
)

export const CopyIcon = ({ className }: Props) => (
  <Image className={className} src={Copy} alt="Copy Icon" />
)

export const EthIcon = ({ className }: Props) => (
  <Image className={className} src={Eth} alt="Eth Icon" />
)

export const CaretIcon = ({ className }: Props) => (
  <Image className={className} src={Caret} alt="Caret Icon" />
)

export const GridViewIcon = ({ className }: Props) => (
  <Image className={className} src={GridView} alt="GridView Icon" />
)

export const ListViewIcon = ({ className }: Props) => (
  <Image className={className} src={ListView} alt="ListView Icon" />
)

export const OceanLogoIcon = ({ className }: Props) => (
  <Image className={className} src={OceanLogo} alt="OceanLogo Icon" />
)

export const LogoAssetFullIcon = ({ className }: Props) => (
  <Image className={className} src={LogoAssetFull} alt="LogoAssetFull Icon" />
)

export const ComputeIcon = (props: Props) => (
  <Image
    role={props.role}
    aria-label={props['aria-label']}
    className={props.className}
    src={Compute}
    alt="Compute Icon"
  />
)

export const DownloadIcon = (props: Props) => (
  <Image
    role={props.role}
    aria-label={props['aria-label']}
    className={props.className}
    src={Download}
    alt="Download Icon"
  />
)

export const LockIcon = (props: Props) => (
  <Image
    role={props.role}
    aria-label={props['aria-label']}
    className={props.className}
    src={Lock}
    alt="Lock Icon"
  />
)
