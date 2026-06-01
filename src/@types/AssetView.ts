export enum AssetViewOptions {
  Grid = 'grid',
  List = 'list'
}

export function isAssetViewOption(value: unknown): value is AssetViewOptions {
  return value === AssetViewOptions.Grid || value === AssetViewOptions.List
}
