import { get } from './api';
import type { PaginationResponse } from './base';

export interface Robot {
  id: string
  name: string
  description: string
  resource_url: string
}

export const fetchRobots = async (page: number = 1, limit: number = 10): Promise<PaginationResponse<Robot>> => {
  try {
    const response = await get<PaginationResponse<Robot>>(`/robot-models?page=${page}&limit=${limit}`);
    return response;
  } catch (error) {
    console.error('Error fetching robots:', error);
    throw error;
  }
}

export const searchRobots = async (keyword: string, page: number = 1, limit: number = 10): Promise<PaginationResponse<Robot>> => {
  if (!keyword) {
    return fetchRobots(page, limit);
  }
  try {
    const response = await get<PaginationResponse<Robot>>(
      `/robot-models/search?keyword=${encodeURIComponent(keyword)}&page=${page}&limit=${limit}`
    );
    return response;
  } catch (error) {
    console.error('Error searching robots:', error);
    throw error;
  }
};

export const fetchRobotUrl = async (robot: Robot): Promise<ArrayBuffer> => {
  try {
    const response = await fetch(robot.resource_url)
    if (response.ok) {
      return await response.arrayBuffer()
    } else {
      throw new Error(`Failed to fetch robot file: ${response.statusText}`)
    }
  } catch (error) {
    console.error('Error fetching robot file:', error)
    throw error
  }
}

export const defaultRobots = async (): Promise<Robot[]> => {
  try {
    const response = await get<Robot[]>('/robot-models/default');
    return response;
  } catch (error) {
    console.error('Error fetching default robots:', error);
    throw error;
  }
}


