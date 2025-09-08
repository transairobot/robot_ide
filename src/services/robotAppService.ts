import { get } from './api';
import type { PaginationResponse } from './base';

export interface RobotApp {
  id: string;
  name: string;
  description: string;
  resource_url: string;
}

// Fetch paginated list of robot apps
export const fetchRobotApps = async (page: number = 1, limit: number = 10): Promise<PaginationResponse<RobotApp>> => {
  try {
    const response = await get<PaginationResponse<RobotApp>>(`/robot-apps?page=${page}&limit=${limit}`);
    return response;
  } catch (error) {
    console.error('Error fetching robot apps:', error);
    throw error;
  }
};

// Fetch default robot apps
export const defaultRobotApps = async (): Promise<RobotApp[]> => {
  try {
    const response = await get<RobotApp[]>('/robot-apps/default');
    return response;
  } catch (error) {
    console.error('Error fetching default robot apps:', error);
    throw error;
  }
};

// Search robot apps by keyword
export const searchRobotApps = async (keyword: string, page: number = 1, limit: number = 10): Promise<PaginationResponse<RobotApp>> => {
  if (!keyword) {
    return fetchRobotApps(page, limit);
  }
  
  try {
    const response = await get<PaginationResponse<RobotApp>>(
      `/robot-apps/search?keyword=${encodeURIComponent(keyword)}&page=${page}&limit=${limit}`
    );
    return response;
  } catch (error) {
    console.error('Error searching robot apps:', error);
    throw error;
  }
};