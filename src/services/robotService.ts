import { get } from './api';

export interface Robot {
  id: string
  name: string
  description: string
  resource_url: string
}

export const fetchRobots = async (): Promise<Robot[]> => {
  try {
    const response = await get<{ items: Robot[] }>('/robot-models');
    return response.items;
  } catch (error) {
    console.error('Error fetching robots:', error);
    throw error;
  }
}

export const searchRobots = async (query: string): Promise<Robot[]> => {
  if (!query) {
    return fetchRobots();
  }
  try {
    const response = await get<{ items: Robot[] }>(`/robot/search?q=${encodeURIComponent(query)}`);
    return response.items;
  } catch (error) {
    console.error('Error searching robots:', error);
    // 如果搜索失败，返回所有机器人列表
    try {
      return await fetchRobots();
    } catch (fetchError) {
      console.error('Error fetching all robots:', fetchError);
      return [];
    }
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


