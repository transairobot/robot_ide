import { defineStore } from 'pinia'
import { ref } from 'vue'
import { unzipSync } from 'fflate'
import { writeFilesToMuJoCoFS } from '@/mujoco_wasm/MujocoInstance'
import { type Robot, defaultRobots, fetchRobotUrl } from '@/services/robotService'
import { type RobotApp, defaultRobotApps, fetchRobotAppResource } from '@/services/robotAppService'

export interface FileItem {
  name: string
  path: string
  type: 'file' | 'folder'
  size?: number
  modified?: Date
  content?: ArrayBuffer
  children?: FileItem[]
  expanded?: boolean
}

export const useWorkplaceStore = defineStore('workplace', () => {
  const root = ref<FileItem[]>([])
  const selectedFile = ref<FileItem | null>(null)
  const robots = ref<Map<string, { robot: Robot; path: string }>>(new Map())

  const sortItems = (items: FileItem[]): FileItem[] => {
    return items.sort((a, b) => {
      if (a.type === b.type) {
        return a.name.localeCompare(b.name)
      }
      return a.type === 'folder' ? -1 : 1
    })
  }

  const findItemByPath = (path: string): FileItem | null => {
    const find = (items: FileItem[]): FileItem | null => {
      for (const item of items) {
        if (item.path === path) return item
        if (item.type === 'folder' && item.children) {
          const found = find(item.children)
          if (found) return found
        }
      }
      return null
    }
    return find(root.value)
  }

  const createFolderStructure = (path: string): void => {
    const parts = path.split('/')
    let currentPath = ''
    let parentFolder = root.value

    for (let i = 0; i < parts.length; i++) {
      currentPath += (i > 0 ? '/' : '') + parts[i]
      const currentFile = findItemByPath(currentPath)

      if (!currentFile) {
        const folder: FileItem = {
          name: parts[i],
          path: currentPath,
          type: 'folder',
          modified: new Date(),
          children: [],
          expanded: false
        }
        parentFolder.push(folder)
        parentFolder = sortItems(parentFolder)
        parentFolder = folder.children!
      } else {
        parentFolder = currentFile.children!
      }
    }
  }

  const addItem = (item: FileItem): void => {
    if (findItemByPath(item.path)) return

    const parentPath = item.path.substring(0, item.path.lastIndexOf('/'))
    if (!parentPath) {
      root.value.push(item)
      root.value = sortItems(root.value)
      return
    }

    const parent = findItemByPath(parentPath)
    if (!parent) {
      createFolderStructure(parentPath)
    }

    const parentFolder = findItemByPath(parentPath)
    if (parentFolder && parentFolder.type === 'folder') {
      if (!parentFolder.children) parentFolder.children = []
      parentFolder.children.push(item)
      parentFolder.children = sortItems(parentFolder.children)
    }
  }

  const toggleFolder = (path: string): void => {
    const item = findItemByPath(path)
    if (item && item.type === 'folder') {
      item.expanded = !item.expanded
    }
  }

  const selectFile = (path: string): void => {
    const item = findItemByPath(path)
    if (item && item.type === 'file') {
      selectedFile.value = item
    }
  }

  const getFlatFileList = (): FileItem[] => {
    const files: FileItem[] = []
    const traverse = (items: FileItem[]) => {
      for (const item of items) {
        if (item.type === 'file') {
          files.push(item)
        } else if (item.type === 'folder' && item.children) {
          traverse(item.children)
        }
      }
    }
    traverse(root.value)
    return files
  }

  const getAllFolders = (): FileItem[] => {
    const folders: FileItem[] = []
    const traverse = (items: FileItem[]) => {
      for (const item of items) {
        if (item.type === 'folder') {
          folders.push(item)
          if (item.children) {
            traverse(item.children)
          }
        }
      }
    }
    traverse(getRootItems())
    return folders
  }

  const getRootItems = (): FileItem[] => {
    return root.value
  }

  const addRobot = async (robot: Robot): Promise<void> => {
    try {
      const buffer = await fetchRobotUrl(robot)
      addRobotFromFile(robot.name, buffer)
      // Store the robot and its path in the map
      robots.value.set(robot.id, { robot, path: robot.name })
    } catch (error) {
      console.error(`Failed to add robot ${robot.name}:`, error)
      throw error
    }
  }

  const getRobotById = (id: string): Robot | undefined => {
    return robots.value.get(id)?.robot
  }

  const getRobotPath = (id: string): string | undefined => {
    return robots.value.get(id)?.path
  }

  const loadDefaultRobot = async (): Promise<void> => {
    try {
      const robots = await defaultRobots()
      if (robots && robots.length > 0) {
        for (const robot of robots) {
          try {
            await addRobot(robot)
          } catch (robotError) {
            console.warn(`Failed to load robot ${robot.name}:`, robotError)
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load default robots:', error)
    }
  }

  const loadDefaultRobotApp = async (): Promise<void> => {
    try {
      const apps = await defaultRobotApps()
      if (apps && apps.length > 0) {
        for (const app of apps) {
          try {
            await addRobotApp(app)
          } catch (appError) {
            console.warn(`Failed to load robot app ${app.name}:`, appError)
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load default robot apps:', error)
    }
  }

  const removeFileFromTree = (itemToRemove: FileItem) => {
    // Remove from store by finding and removing from parent
    const parentPath = itemToRemove.path.substring(0, itemToRemove.path.lastIndexOf('/'))
    if (!parentPath) {
      // Remove from root
      const index = root.value.findIndex(item => item.path === itemToRemove.path)
      if (index > -1) root.value.splice(index, 1)
    } else {
      const parent = findItemByPath(parentPath)
      if (parent && parent.children) {
        const index = parent.children.findIndex(item => item.path === itemToRemove.path)
        if (index > -1) parent.children.splice(index, 1)
      }
    }
  }

  // Helper function to maintain the existing functionality
  const addRobotFromFile = (robot_name: string, buffer: ArrayBuffer): void => {
    const decompressed = unzipSync(new Uint8Array(buffer))

    for (const [path, data] of Object.entries(decompressed)) {
      if (data.byteLength) {
        const name = path.split('/').pop() || 'unknown'
        // Convert SharedArrayBuffer to ArrayBuffer if needed
        let content: ArrayBuffer;
        if (data.buffer instanceof SharedArrayBuffer) {
          content = new ArrayBuffer(data.byteLength);
          new Uint8Array(content).set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
        } else {
          content = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
        }
        let new_path = path;
        if (!new_path.startsWith(robot_name + "/")) {
          new_path = robot_name + "/" + path
        }
        const newFile: FileItem = {
          name,
          path: new_path,
          type: 'file',
          size: data.byteLength,
          modified: new Date(),
          content,
        }
        addItem(newFile)
      }
    }

    // Sync to MuJoCo FS
    writeFilesToMuJoCoFS(root.value)
  }

  const addRobotApp = async (app: RobotApp): Promise<void> => {
    try {
      // Fetch the app resource
      const buffer = await fetchRobotAppResource(app);
      
      // Use the existing addRobotFromFile function to handle the unzip and file creation
      addRobotFromFile(app.name, buffer);
      
      // Store the app info in the robots map for consistency
      robots.value.set(app.id, { 
        robot: { 
          id: app.id, 
          name: app.name, 
          description: app.description,
          resource_url: app.resource_url
        }, 
        path: app.name 
      });
    } catch (error) {
      console.error(`Failed to add robot app ${app.name}:`, error);
      throw error;
    }
  }

  // Load default robot asynchronously without blocking store creation
  // First load robot apps, then load robots
  setTimeout(async () => {
    try {
      await loadDefaultRobotApp()
      await loadDefaultRobot()
    } catch (error) {
      console.error('Failed to load default content:', error)
    }
  }, 0)

  return {
    root,
    selectedFile,
    addItem,
    toggleFolder,
    selectFile,
    getFlatFileList,
    getAllFolders,
    getRootItems,
    findItemByPath,
    addRobot,
    addRobotApp,
    getRobotById,
    getRobotPath,
    removeFileFromTree
  }
})