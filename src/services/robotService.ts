export interface Robot {
  id: string
  name: string
  description: string
  url: string
}

export const fetchRobots = async (): Promise<Robot[]> => {
  try {
    const response = await fetch('/robot/list')
    if (response.ok) {
      return await response.json()
    } else {
      console.error('Failed to fetch robots, using mock data.')
      return useMockData()
    }
  } catch (error) {
    console.error('Error fetching robots:', error, ', using mock data.')
    return useMockData()
  }
}

export const searchRobots = async (query: string): Promise<Robot[]> => {
  if (!query) {
    return fetchRobots();
  }
  try {
    const response = await fetch(`/robot/search?q=${encodeURIComponent(query)}`);
    if (response.ok) {
      return await response.json();
    } else {
      console.error('Failed to search robots, returning empty list.');
      return [];
    }
  } catch (error) {
    console.error('Error searching robots:', error);
    return [];
  }
};

export const fetchRobotUrl = async (robot: Robot): Promise<ArrayBuffer> => {
  try {
    const response = await fetch(robot.url)
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

const useMockData = (): Robot[] => {
  return [
    { id: "1", name: "SO101", description: "A 6-axis robotic arm.", url: "/SO101.robot.zip" },
    { id: "2", name: "Humanoid", description: "A humanoid robot.", url: "/gym_humanoid.zip" },
  ]
}


