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