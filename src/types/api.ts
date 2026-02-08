/** Single asset returned by the API */
export interface Asset {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

/** Body for creating an asset */
export interface CreateAssetDto {
  name: string;
}

/** Body for updating an asset (all fields optional) */
export interface UpdateAssetDto {
  name?: string;
}
