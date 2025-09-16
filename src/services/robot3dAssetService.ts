import { get } from './api';
import type { PaginationResponse } from './base';

export interface Robot3DAsset {
  id: string;
  name: string;
  description: string;
  resource_url: string;
  thumbnail_url?: string;
  category?: string;
  tags?: string[];
}

export interface Robot3DAssetCategory {
  id: string;
  name: string;
  description: string;
  asset_count?: number;
}

// Fetch paginated list of 3D assets
export const fetchRobot3DAssets = async (page: number = 1, limit: number = 10): Promise<PaginationResponse<Robot3DAsset>> => {
  try {
    const response = await get<PaginationResponse<Robot3DAsset>>(`/robot-3d-assets?page=${page}&limit=${limit}`);
    return response;
  } catch (error) {
    console.error('Error fetching robot 3D assets:', error);
    throw error;
  }
};

// Search 3D assets by keyword
export const searchRobot3DAssets = async (keyword: string, page: number = 1, limit: number = 10): Promise<PaginationResponse<Robot3DAsset>> => {
  if (!keyword) {
    return fetchRobot3DAssets(page, limit);
  }

  try {
    const response = await get<PaginationResponse<Robot3DAsset>>(
      `/robot-3d-assets/search?keyword=${encodeURIComponent(keyword)}&page=${page}&limit=${limit}`
    );
    return response;
  } catch (error) {
    console.error('Error searching robot 3D assets:', error);
    throw error;
  }
};

// Fetch paginated list of 3D asset categories
export const fetchRobot3DAssetCategories = async (page: number = 1, limit: number = 10): Promise<PaginationResponse<Robot3DAssetCategory>> => {
  try {
    const response = await get<PaginationResponse<Robot3DAssetCategory>>(`/robot-3d-assets/categories?page=${page}&limit=${limit}`);
    return response;
  } catch (error) {
    console.error('Error fetching robot 3D asset categories:', error);
    throw error;
  }
};

// Search 3D asset categories by keyword
export const searchRobot3DAssetCategories = async (keyword: string, page: number = 1, limit: number = 10): Promise<PaginationResponse<Robot3DAssetCategory>> => {
  if (!keyword) {
    return fetchRobot3DAssetCategories(page, limit);
  }

  try {
    const response = await get<PaginationResponse<Robot3DAssetCategory>>(
      `/robot-3d-assets/categories/search?keyword=${encodeURIComponent(keyword)}&page=${page}&limit=${limit}`
    );
    return response;
  } catch (error) {
    console.error('Error searching robot 3D asset categories:', error);
    throw error;
  }
};

// Fetch paginated list of 3D assets by category ID
export const fetchRobot3DAssetsByCategory = async (categoryId: string, page: number = 1, limit: number = 10): Promise<PaginationResponse<Robot3DAsset>> => {
  try {
    const response = await get<PaginationResponse<Robot3DAsset>>(`/robot-3d-asset-categories/${categoryId}/assets?page=${page}&limit=${limit}`);
    return response;
  } catch (error) {
    console.error(`Error fetching robot 3D assets for category ${categoryId}:`, error);
    throw error;
  }
};